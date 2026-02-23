import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Spending, SpendingDocument, Ledger } from './schemas/finance.schema';
import { ProjectsService } from '../projects/projects.service';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Spending.name)
    private readonly spendingModel: Model<SpendingDocument>,
    @InjectModel(Ledger.name) private readonly ledgerModel: Model<Ledger>,
    private readonly projectsService: ProjectsService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Extract a string ID from a user reference (ObjectId, populated object, or plain string). */
  private getId(u: any): string {
    if (!u) return '';
    if (typeof u === 'string') return u;
    // BSON ObjectId: must use toHexString() — .id returns a raw 12-byte Buffer
    if (typeof u.toHexString === 'function') return u.toHexString();
    if (u._id) return this.getId(u._id);
    if (typeof u.id === 'string') return u.id;
    return String(u);
  }

  private isPrivilegedRole(role?: string): boolean {
    return ['admin', 'project_admin', 'super_admin'].includes(role || '');
  }

  private getActorId(user: any): string {
    return this.getId(user?.userId || user?.id || user?._id);
  }

  private parseStatusFilter(status?: string): Set<string> {
    if (!status) return new Set();
    return new Set(
      String(status)
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  private getSpendingDateString(spending: any): string {
    if (spending?.date) return String(spending.date);
    if (spending?.createdAt) {
      const dt = new Date(spending.createdAt);
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
    }
    return '';
  }

  private resolveProductAndSubLedger(
    spending: any,
    hasLedgerReference: boolean,
    normalizedCategory: string,
    normalizedSubLedger: string,
  ): { normalizedProductName: string; effectiveSubLedger: string } {
    const ledgerSubLedgers = Array.isArray(spending?.ledger?.subLedgers)
      ? (spending.ledger.subLedgers as string[])
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      : [];
    const hasLedgerSubLedgerCatalog = ledgerSubLedgers.length > 0;
    const isValidLedgerSubLedger =
      !normalizedSubLedger ||
      !hasLedgerSubLedgerCatalog ||
      ledgerSubLedgers.includes(normalizedSubLedger);

    let effectiveSubLedger = normalizedSubLedger;
    let normalizedProductName = String(
      spending?.productName ||
        spending?.materialType ||
        (!hasLedgerReference && normalizedCategory === 'product'
          ? spending?.subLedger || ''
          : ''),
    ).trim();

    if (
      hasLedgerReference &&
      normalizedCategory === 'product' &&
      !normalizedProductName &&
      normalizedSubLedger
    ) {
      normalizedProductName = normalizedSubLedger;
      effectiveSubLedger = '';
    }

    if (hasLedgerReference && !isValidLedgerSubLedger) {
      if (!normalizedProductName && normalizedSubLedger) {
        normalizedProductName = normalizedSubLedger;
      }
      effectiveSubLedger = '';
    }

    return { normalizedProductName, effectiveSubLedger };
  }

  private resolveDetailMode(
    hasLedgerReference: boolean,
    normalizedCategory: string,
    normalizedProductName: string,
    normalizedPaidToPerson: string,
    normalizedPaidToPlace: string,
  ): 'ledger' | 'service' | 'product' | 'unknown' {
    if (hasLedgerReference) return 'ledger';
    if (
      normalizedCategory === 'service' ||
      normalizedPaidToPerson ||
      normalizedPaidToPlace
    ) {
      return 'service';
    }
    if (normalizedCategory === 'product' || normalizedProductName) {
      return 'product';
    }
    return 'unknown';
  }

  private buildSpendingDetailDisplay(
    spending: any,
    ledgerId: string,
    ledgerName: string,
  ): {
    detailMode: 'ledger' | 'service' | 'product' | 'unknown';
    detailDisplay: {
      ledgerName: string;
      subLedger: string;
      productName: string;
      paidToPerson: string;
      paidToPlace: string;
    };
  } {
    const normalizedLedgerName = String(ledgerName || '').trim();
    const normalizedSubLedger = String(spending?.subLedger || '').trim();
    const hasLedgerReference = Boolean(ledgerId || normalizedLedgerName);
    const normalizedCategory = String(spending?.category || '')
      .trim()
      .toLowerCase();

    let { normalizedProductName, effectiveSubLedger } =
      this.resolveProductAndSubLedger(
        spending,
        hasLedgerReference,
        normalizedCategory,
        normalizedSubLedger,
      );
    const normalizedPaidToPerson = String(
      spending?.paidTo?.person ||
        spending?.paidToPerson ||
        (typeof spending?.paidTo === 'string' ? spending?.paidTo : ''),
    ).trim();
    const normalizedPaidToPlace = String(
      spending?.paidTo?.place || spending?.paidToPlace || '',
    ).trim();

    if (
      !hasLedgerReference &&
      !normalizedCategory &&
      !normalizedProductName &&
      normalizedSubLedger &&
      !normalizedPaidToPerson &&
      !normalizedPaidToPlace
    ) {
      normalizedProductName = normalizedSubLedger;
      effectiveSubLedger = '';
    }

    const resolvedLedgerName =
      normalizedLedgerName || (ledgerId ? 'Archived Ledger' : '');

    const detailMode = this.resolveDetailMode(
      hasLedgerReference,
      normalizedCategory,
      normalizedProductName,
      normalizedPaidToPerson,
      normalizedPaidToPlace,
    );

    return {
      detailMode,
      detailDisplay: {
        ledgerName: resolvedLedgerName,
        subLedger: effectiveSubLedger,
        productName: normalizedProductName,
        paidToPerson: normalizedPaidToPerson,
        paidToPlace: normalizedPaidToPlace,
      },
    };
  }

  private buildDateRangeQuery(
    fromDate?: string,
    toDate?: string,
  ): any[] | null {
    if (!fromDate && !toDate) return null;

    const dateStringRange: Record<string, string> = {};
    if (fromDate) dateStringRange.$gte = fromDate;
    if (toDate) dateStringRange.$lte = toDate;

    const createdAtRange: Record<string, Date> = {};
    if (fromDate) createdAtRange.$gte = new Date(`${fromDate}T00:00:00.000Z`);
    if (toDate) createdAtRange.$lte = new Date(`${toDate}T23:59:59.999Z`);

    return [
      { date: dateStringRange },
      {
        $and: [
          { $or: [{ date: { $exists: false } }, { date: null }, { date: '' }] },
          { createdAt: createdAtRange },
        ],
      },
    ];
  }

  private escapeCsvCell(value: any): string {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  }

  private getApprovalSummary(spending: any, eligibleInvestorIds: string[]) {
    const approverIdSet = new Set((eligibleInvestorIds || []).map(String));
    const approvalsObject =
      spending?.approvals instanceof Map
        ? Object.fromEntries(spending.approvals.entries())
        : spending?.approvals || {};

    const approvalEntries = Object.entries(approvalsObject);
    const votedRequiredUserIds = approvalEntries
      .map(([approvalKey, approval]) =>
        String(this.getId((approval as any)?.user) || approvalKey),
      )
      .filter((id) => approverIdSet.has(id));

    const approvedRequiredCount = approvalEntries.filter(
      ([approvalKey, approval]) => {
        if ((approval as any)?.status !== 'approved') return false;
        const approvalUserId = String(
          this.getId((approval as any)?.user) || approvalKey,
        );
        return approverIdSet.has(approvalUserId);
      },
    ).length;

    const uniqueVotedRequiredUserIds = [...new Set(votedRequiredUserIds)];
    const awaitingUserIds = eligibleInvestorIds.filter(
      (id) => !uniqueVotedRequiredUserIds.includes(String(id)),
    );

    return {
      requiredApproverIds: eligibleInvestorIds,
      requiredApproverCount: eligibleInvestorIds.length,
      votedRequiredCount: uniqueVotedRequiredUserIds.length,
      approvedRequiredCount,
      pendingRequiredCount: Math.max(
        eligibleInvestorIds.length - approvedRequiredCount,
        0,
      ),
      awaitingUserIds,
    };
  }

  private buildEnrichedApprovals(
    rawApprovals: Record<string, any>,
    memberNameMap?: Map<string, string>,
  ): Record<string, any> {
    const enrichedApprovals: Record<string, any> = {};
    for (const [key, approval] of Object.entries(rawApprovals)) {
      const doc = approval?._doc || approval;
      const userId = this.getId(doc?.user) || key;
      const status = doc?.status || approval?.status || null;
      const userName =
        doc?.userName ||
        approval?.userName ||
        memberNameMap?.get(userId) ||
        null;
      enrichedApprovals[key] = {
        status,
        user: userId,
        userName,
        date: doc?.date || approval?.date || null,
      };
    }
    return enrichedApprovals;
  }

  private buildApprovalParticipants(
    enrichedApprovals: Record<string, any>,
    eligibleInvestorIds: string[],
    memberNameMap?: Map<string, string>,
  ): {
    approvedBy: Array<{ id: string; name: string | null }>;
    waitingFor: Array<{ id: string; name: string | null }>;
  } {
    const approvedBy: Array<{ id: string; name: string | null }> = [];
    const waitingFor: Array<{ id: string; name: string | null }> = [];
    const eligibleSet = new Set(eligibleInvestorIds.map(String));

    for (const [key, approval] of Object.entries(enrichedApprovals)) {
      const id = String(key);
      if (!eligibleSet.has(id) || approval?.status !== 'approved') continue;
      const name = approval?.userName || memberNameMap?.get(id) || null;
      approvedBy.push({ id, name });
    }

    const approvedSet = new Set(approvedBy.map((a) => a.id));
    for (const id of eligibleInvestorIds) {
      if (approvedSet.has(id)) continue;
      const name =
        memberNameMap?.get(id) || enrichedApprovals[id]?.userName || null;
      waitingFor.push({ id, name });
    }

    return { approvedBy, waitingFor };
  }

  private logApprovalMismatchIfNeeded(
    spending: any,
    enrichedApprovals: Record<string, any>,
    approvedBy: Array<{ id: string; name: string | null }>,
    waitingFor: Array<{ id: string; name: string | null }>,
    eligibleInvestorIds: string[],
  ): void {
    if (Object.keys(enrichedApprovals).length <= 0) return;
    const mismatch =
      approvedBy.length === 0 ||
      approvedBy.length + waitingFor.length !== eligibleInvestorIds.length;
    if (!mismatch) return;

    console.warn('[approvals-debug]', {
      spendingId: spending?._id || spending?.id,
      eligibleInvestorIds,
      approvalKeys: Object.keys(enrichedApprovals),
      approvedBy,
      waitingFor,
      sampleApproval: enrichedApprovals[Object.keys(enrichedApprovals)[0]],
    });
  }

  private enrichSpendingForResponse(
    spendingDoc: any,
    eligibleInvestorIds: string[],
    memberNameMap?: Map<string, string>,
  ) {
    const spending = spendingDoc?.toObject
      ? spendingDoc.toObject()
      : spendingDoc;
    const spendingStatus = String(spending?.status || '').toLowerCase();
    const ownerId =
      spendingStatus === 'approved'
        ? this.getId(spending?.fundedBy) || this.getId(spending?.addedBy)
        : this.getId(spending?.addedBy);

    // Enrich approval entries with user names for frontend display
    const rawApprovals =
      spending?.approvals instanceof Map
        ? Object.fromEntries(spending.approvals.entries())
        : spending?.approvals || {};

    const enrichedApprovals = this.buildEnrichedApprovals(
      rawApprovals,
      memberNameMap,
    );

    const approvalSummary = this.getApprovalSummary(
      { ...spending, approvals: enrichedApprovals },
      eligibleInvestorIds,
    );

    const addedById = this.getId(spending?.addedBy);
    const fundedById = this.getId(spending?.fundedBy) || addedById;
    const ledgerId =
      this.getId(spending?.ledger) || String(spending?.ledgerId || '');
    const ledgerName = String(
      spending?.ledger?.name || spending?.ledgerName || '',
    ).trim();
    const addedByName =
      spending?.addedBy?.name || memberNameMap?.get(addedById) || null;
    const fundedByName =
      spending?.fundedBy?.name ||
      memberNameMap?.get(fundedById) ||
      addedByName ||
      null;

    const normalizedDate =
      spending?.date ||
      (spending?.createdAt
        ? new Date(spending.createdAt).toISOString().split('T')[0]
        : null);
    const normalizedTime =
      spending?.time ||
      (spending?.createdAt
        ? new Date(spending.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null);

    const spendingDetail = this.buildSpendingDetailDisplay(
      spending,
      ledgerId,
      ledgerName,
    );

    const { approvedBy, waitingFor } = this.buildApprovalParticipants(
      enrichedApprovals,
      eligibleInvestorIds,
      memberNameMap,
    );
    this.logApprovalMismatchIfNeeded(
      spending,
      enrichedApprovals,
      approvedBy,
      waitingFor,
      eligibleInvestorIds,
    );

    return {
      ...spending,
      id: this.getId(spending),
      productName: spending?.materialType || null,
      ledgerId: ledgerId || null,
      ledgerName: ledgerName || null,
      ...spendingDetail,
      addedBy: addedById || spending?.addedBy || null,
      addedById: addedById || null,
      addedByName,
      fundedBy: fundedById || null,
      fundedById: fundedById || null,
      fundedByName,
      date: normalizedDate,
      time: normalizedTime,
      approvals: enrichedApprovals,
      ownerUserId: ownerId || null,
      approvalSummary: {
        ...approvalSummary,
        // Recompute counts from the derived arrays to stay consistent for UI
        approvedRequiredCount: approvedBy.length,
        pendingRequiredCount: waitingFor.length,
        approvedBy,
        waitingFor,
      },
    };
  }

  private matchesSpendingFilters(
    spending: any,
    statusFilter: Set<string>,
    fromDate: string,
    toDate: string,
    ownerUserId: string,
  ): boolean {
    if (ownerUserId && String(spending.ownerUserId || '') !== ownerUserId)
      return false;

    const status = String(spending?.status || '').toLowerCase();
    if (statusFilter.size && !statusFilter.has(status)) return false;

    const spendingDate = this.getSpendingDateString(spending);
    if (fromDate && spendingDate && spendingDate < fromDate) return false;
    if (toDate && spendingDate && spendingDate > toDate) return false;

    return true;
  }

  private getApprovalEligibleInvestors(project: any): any[] {
    const investors = (project?.investors || []).filter((inv: any) => {
      const memberRole = inv?.role || 'active';
      if (memberRole !== 'active') return false;
      // Super admins are observers — they should NOT participate in approvals
      const userRole = inv?.user?.role || '';
      if (userRole === 'super_admin') return false;
      return true;
    });

    const creatorId = this.getId(project?.createdBy);
    const creatorRole = project?.createdBy?.role || '';
    const hasCreator = investors.some(
      (inv: any) => this.getId(inv?.user) === creatorId,
    );

    // Only add creator if they are NOT a super_admin
    if (creatorId && !hasCreator && creatorRole !== 'super_admin') {
      investors.push({
        role: 'active',
        user: project.createdBy,
      });
    }

    const dedupedByUserId = new Map<string, any>();
    for (const inv of investors) {
      const userId = this.getId(inv?.user);
      if (!userId) continue;
      if (!dedupedByUserId.has(userId)) {
        dedupedByUserId.set(userId, inv);
      }
    }

    return Array.from(dedupedByUserId.values());
  }

  /**
   * Get super_admin member IDs for a project (for notification delivery).
   * Super admins are observers — they don't vote but should be notified.
   */
  private getSuperAdminMemberIds(project: any): string[] {
    return (project?.investors || [])
      .filter((inv: any) => inv?.user?.role === 'super_admin')
      .map((inv: any) => this.getId(inv?.user))
      .filter(Boolean);
  }

  /**
   * Build a userId → userName lookup from populated project members.
   * Used to resolve approval display names without extra DB lookups.
   */
  private getMemberNameMap(project: any): Map<string, string> {
    const nameMap = new Map<string, string>();
    for (const inv of project?.investors || []) {
      const id = this.getId(inv?.user);
      const name = inv?.user?.name;
      if (id && name) nameMap.set(id, name);
    }
    const creatorId = this.getId(project?.createdBy);
    const creatorName = project?.createdBy?.name;
    if (creatorId && creatorName) nameMap.set(creatorId, creatorName);
    return nameMap;
  }

  /**
   * Unified spending response builder — populates refs, enriches approvals
   * with user names, and includes a complete approvalSummary.
   * Used by addSpending, voteSpending, and findAll for consistent output.
   */
  private async buildSpendingResponse(
    spending: SpendingDocument,
    project: any,
  ): Promise<any> {
    const populated = await spending.populate([
      { path: 'addedBy', select: 'name email' },
      { path: 'fundedBy', select: 'name email' },
      { path: 'ledger', select: 'name subLedgers' },
    ]);
    const eligibleInvestors = this.getApprovalEligibleInvestors(project);
    const eligibleInvestorIds = eligibleInvestors
      .map((inv: any) => this.getId(inv.user))
      .filter(Boolean);
    const memberNameMap = this.getMemberNameMap(project);
    return this.enrichSpendingForResponse(
      populated,
      eligibleInvestorIds,
      memberNameMap,
    );
  }

  private async assertProjectAccess(
    projectId: string,
    user: any,
  ): Promise<any> {
    const project = await this.projectsService.findOne(projectId);
    if (!project) throw new NotFoundException('Project not found');

    if (this.isPrivilegedRole(user?.role)) return project;

    const actorId = this.getActorId(user);

    const isCreator = this.getId(project.createdBy) === actorId;
    const isInvestor = (project.investors || []).some(
      (inv: any) => this.getId(inv.user) === actorId,
    );
    if (!isCreator && !isInvestor) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  private async assertProjectWriteAccess(
    projectId: string,
    user: any,
  ): Promise<any> {
    const project = await this.assertProjectAccess(projectId, user);
    if (this.isPrivilegedRole(user?.role)) return project;

    const actorId = this.getActorId(user);

    const isActiveInvestor = (project.investors || []).some(
      (inv: any) => inv.role === 'active' && this.getId(inv.user) === actorId,
    );
    const isCreator = this.getId(project.createdBy) === actorId;
    if (!isCreator && !isActiveInvestor) {
      throw new ForbiddenException(
        'Only creator or active investors can modify ledgers',
      );
    }

    return project;
  }

  private ensurePositiveSpendingAmount(amount: number): void {
    if (Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestException(
        'Spending amount must be a positive number',
      );
    }
  }

  private async ensureProjectHasSpendingCapacity(
    project: any,
    amount: number,
  ): Promise<void> {
    const currentSpendings = await this.spendingModel
      .find({ project: project['_id'] })
      .exec();
    const totalSpent = currentSpendings.reduce((sum, s) => sum + s.amount, 0);

    if (totalSpent + amount > project.targetAmount) {
      throw new BadRequestException(
        `Spending exceeds project target amount. Remaining: ${project.targetAmount - totalSpent}`,
      );
    }
  }

  private ensureUserCanAddSpending(
    user: any,
    actorId: string,
    activeInvestors: any[],
  ): void {
    if (user?.role === 'super_admin') {
      throw new ForbiddenException(
        'Super admins cannot add spendings. They can only observe project activity.',
      );
    }

    const isUserActive = activeInvestors.some(
      (inv) => this.getId(inv.user) === actorId,
    );
    if (!isUserActive) {
      throw new ForbiddenException('Only active investors can add spending');
    }
  }

  private getProjectMemberIds(project: any): Set<string> {
    const memberIds = new Set<string>();

    const creatorId = this.getId(project?.createdBy);
    if (creatorId) memberIds.add(creatorId);

    for (const investor of project?.investors || []) {
      const investorId = this.getId(investor?.user);
      if (investorId) memberIds.add(investorId);
    }

    return memberIds;
  }

  private resolveFundedByUserId(
    createSpendingDto: any,
    project: any,
    actorId: string,
  ): Types.ObjectId {
    const requestedFundedById = this.getId(createSpendingDto?.fundedBy);
    const effectiveFundedById = requestedFundedById || actorId;

    if (!Types.ObjectId.isValid(effectiveFundedById)) {
      throw new BadRequestException('Invalid fundedBy user id');
    }

    const projectMemberIds = this.getProjectMemberIds(project);
    if (!projectMemberIds.has(effectiveFundedById)) {
      throw new BadRequestException('fundedBy must be a project member');
    }

    return new Types.ObjectId(effectiveFundedById);
  }

  private buildFundedAccountQuery(actorId: string) {
    const actorObjectId = new Types.ObjectId(actorId) as any;
    const actorStringId = String(actorId);
    return {
      $or: [
        { fundedBy: actorObjectId },
        { fundedBy: actorStringId },
        {
          $and: [
            {
              $or: [{ fundedBy: { $exists: false } }, { fundedBy: null }],
            },
            {
              $or: [{ addedBy: actorObjectId }, { addedBy: actorStringId }],
            },
          ],
        },
      ],
    };
  }

  private normalizeSpendingInput(createSpendingDto: any) {
    const requestedLedgerId = String(
      createSpendingDto?.ledgerId || createSpendingDto?.ledger || '',
    ).trim();
    const normalizedSubLedger = String(
      createSpendingDto?.subLedger || '',
    ).trim();
    const normalizedCategory = String(createSpendingDto?.category || '').trim();
    const normalizedMaterialType = String(
      createSpendingDto?.materialType || createSpendingDto?.productName || '',
    ).trim();
    const normalizedPaidToPerson = String(
      createSpendingDto?.paidTo?.person || '',
    ).trim();
    const normalizedPaidToPlace = String(
      createSpendingDto?.paidTo?.place || '',
    ).trim();

    return {
      requestedLedgerId,
      normalizedSubLedger,
      normalizedCategory,
      normalizedMaterialType,
      normalizedPaidToPerson,
      normalizedPaidToPlace,
    };
  }

  private validateCategorySpecificFields(
    normalizedCategory: string,
    normalizedMaterialType: string,
    normalizedPaidToPerson: string,
    normalizedPaidToPlace: string,
  ): void {
    if (normalizedCategory === 'Product' && !normalizedMaterialType) {
      throw new BadRequestException(
        'Product name is required for Product category',
      );
    }
    if (
      normalizedCategory === 'Service' &&
      (!normalizedPaidToPerson || !normalizedPaidToPlace)
    ) {
      throw new BadRequestException(
        'Paid To person and place are required for Service category',
      );
    }
  }

  private async resolveSpendingLedgerId(
    requestedLedgerId: string,
    normalizedSubLedger: string,
    project: any,
  ): Promise<Types.ObjectId | undefined> {
    if (requestedLedgerId && !Types.ObjectId.isValid(requestedLedgerId)) {
      throw new BadRequestException('Invalid ledgerId');
    }

    if (!requestedLedgerId) {
      if (normalizedSubLedger) {
        throw new BadRequestException(
          'ledgerId is required when subLedger is provided',
        );
      }
      return undefined;
    }

    const ledger = await this.ledgerModel
      .findById(requestedLedgerId)
      .select('project subLedgers')
      .lean()
      .exec();

    if (!ledger) {
      throw new BadRequestException('Ledger not found');
    }

    const ledgerProjectId = this.getId((ledger as any)?.project);
    const spendingProjectId = this.getId(project?._id);
    if (!ledgerProjectId || ledgerProjectId !== spendingProjectId) {
      throw new BadRequestException('Ledger does not belong to this project');
    }

    if (normalizedSubLedger) {
      const availableSubLedgers = Array.isArray((ledger as any)?.subLedgers)
        ? ((ledger as any).subLedgers as string[])
        : [];
      if (
        availableSubLedgers.length > 0 &&
        !availableSubLedgers.includes(normalizedSubLedger)
      ) {
        throw new BadRequestException('Invalid subLedger for selected ledger');
      }
    }

    return new Types.ObjectId(requestedLedgerId);
  }

  private createInitialApprovals(
    actorId: string,
    actorName: string,
  ): Map<string, any> {
    const approvals = new Map<string, any>();
    approvals.set(actorId, {
      status: 'approved',
      date: new Date(),
      user: actorId,
      userName: actorName,
    });
    return approvals;
  }

  private async notifyPendingSpending(
    project: any,
    actorId: string,
    actorName: string,
    createdSpending: any,
    activeInvestors: any[],
  ): Promise<void> {
    for (const inv of activeInvestors) {
      const invId = this.getId(inv.user);
      if (!invId || invId === actorId) continue;
      await this.notificationService.sendPush(
        invId,
        'New Spending Request',
        `${actorName} requests approval for ₹${createdSpending.amount.toLocaleString()} in ${project.name}`,
        { spendingId: createdSpending['_id'], projectId: project['_id'] },
      );
    }

    const superAdminIds = this.getSuperAdminMemberIds(project);
    for (const saId of superAdminIds) {
      if (saId === actorId) continue;
      await this.notificationService.sendPush(
        saId,
        'New Spending Activity',
        `${actorName} submitted a spending of ₹${createdSpending.amount.toLocaleString()} in ${project.name} (pending approval)`,
        { spendingId: createdSpending['_id'], projectId: project['_id'] },
      );
    }
  }

  private assertVoteAllowed(spending: any): void {
    if (spending.status === 'approved') {
      throw new BadRequestException(
        'This spending has already been fully approved',
      );
    }
    if (spending.status === 'rejected') {
      throw new BadRequestException('This spending has already been rejected');
    }
  }

  private ensureUserCanVote(
    user: any,
    activeInvestors: any[],
    userId: string,
  ): void {
    if (user?.role === 'super_admin') {
      throw new ForbiddenException(
        'Super admins cannot vote on spendings. Only active investors can approve or reject.',
      );
    }

    const isVoterActive = activeInvestors.some(
      (inv) => this.getId(inv.user) === userId,
    );
    if (!isVoterActive) {
      throw new ForbiddenException('Only active investors can vote');
    }
  }

  private ensureApprovalsMap(spending: any): void {
    if (!spending.approvals) {
      spending.approvals = new Map();
    }
  }

  private countApprovedVotes(approvals: Map<string, any>): number {
    let approvedCount = 0;
    for (const approval of approvals.values()) {
      if (approval.status === 'approved') approvedCount += 1;
    }
    return approvedCount;
  }

  private async notifyRejectedSpending(
    spending: any,
    project: any,
    voterName: string,
  ): Promise<void> {
    await this.notificationService.sendPush(
      this.getId(spending.addedBy),
      'Spending Rejected',
      `Your spending of ₹${spending.amount.toLocaleString()} in ${project.name} was rejected by ${voterName}.`,
      { spendingId: spending['_id'] },
    );

    const superAdminIds = this.getSuperAdminMemberIds(project);
    for (const saId of superAdminIds) {
      await this.notificationService.sendPush(
        saId,
        'Spending Rejected',
        `${voterName} rejected a spending of ₹${spending.amount.toLocaleString()} in ${project.name}.`,
        { spendingId: spending['_id'] },
      );
    }
  }

  private async notifyApprovedSpending(
    spending: any,
    project: any,
  ): Promise<void> {
    await this.notificationService.sendPush(
      this.getId(spending.addedBy),
      'Spending Approved',
      `Your spending of ₹${spending.amount.toLocaleString()} in ${project.name} is fully approved.`,
      { spendingId: spending['_id'] },
    );

    const superAdminIds = this.getSuperAdminMemberIds(project);
    for (const saId of superAdminIds) {
      await this.notificationService.sendPush(
        saId,
        'Spending Approved',
        `A spending of ₹${spending.amount.toLocaleString()} in ${project.name} was fully approved.`,
        { spendingId: spending['_id'] },
      );
    }
  }

  private countApprovedEligibleVotes(
    approvals: Map<string, any>,
    eligibleInvestorIdSet: Set<string>,
  ): number {
    let approvedCount = 0;
    for (const [approvalKey, approval] of approvals.entries()) {
      const approvalUserId = this.getId(approval?.user) || String(approvalKey);
      if (
        approval?.status === 'approved' &&
        eligibleInvestorIdSet.has(approvalUserId)
      ) {
        approvedCount += 1;
      }
    }
    return approvedCount;
  }

  private async autoApprovePendingSpendings(
    spendings: any[],
    requiredVotes: number,
    eligibleInvestorIdSet: Set<string>,
  ): Promise<void> {
    if (requiredVotes <= 0) return;

    for (const spending of spendings) {
      if (spending.status !== 'pending') continue;

      const approvals = spending.approvals || new Map();
      const approvedCount = this.countApprovedEligibleVotes(
        approvals,
        eligibleInvestorIdSet,
      );

      if (approvedCount < requiredVotes) continue;

      spending.status = 'approved';
      await spending.save();
      try {
        await this.notificationService.sendPush(
          this.getId(spending.addedBy),
          'Spending Approved',
          `Your spending of \u20B9${spending.amount.toLocaleString()} has been approved.`,
          { spendingId: spending['_id'] },
        );
      } catch {
        // Non-critical: don't fail the query if notification fails
      }
    }
  }

  private async getAccessibleProjectIds(user: any): Promise<any[]> {
    const userProjects = await this.projectsService.findAll(user);
    return userProjects.map((p: any) => p?._id).filter(Boolean);
  }

  private createMyExpensesBaseQuery(projectIds: any[], actorId: string): any[] {
    return [
      { project: { $in: projectIds } },
      { status: 'approved' },
      this.buildFundedAccountQuery(actorId),
    ];
  }

  private applyProjectFilterToMyExpenses(
    andQueryParts: any[],
    accessibleProjectIdSet: Set<string>,
    requestedProjectId?: string,
  ): void {
    if (!requestedProjectId) return;

    if (!Types.ObjectId.isValid(requestedProjectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    if (!accessibleProjectIdSet.has(requestedProjectId)) {
      throw new ForbiddenException('No access to requested project');
    }
    andQueryParts.push({
      project: new Types.ObjectId(requestedProjectId) as any,
    });
  }

  private async applyLedgerFilterToMyExpenses(
    andQueryParts: any[],
    accessibleProjectIdSet: Set<string>,
    requestedLedgerId?: string,
    requestedProjectId?: string,
  ): Promise<void> {
    if (!requestedLedgerId) return;

    if (!Types.ObjectId.isValid(requestedLedgerId)) {
      throw new BadRequestException('Invalid ledgerId');
    }

    const ledger = await this.ledgerModel
      .findById(requestedLedgerId)
      .select('project')
      .lean()
      .exec();
    if (!ledger) throw new BadRequestException('Ledger not found');

    const ledgerProjectId = this.getId((ledger as any)?.project);
    if (!ledgerProjectId || !accessibleProjectIdSet.has(ledgerProjectId)) {
      throw new ForbiddenException('No access to requested ledger');
    }
    if (requestedProjectId && ledgerProjectId !== requestedProjectId) {
      throw new BadRequestException(
        'ledgerId does not belong to requested projectId',
      );
    }

    andQueryParts.push({
      $or: [
        { ledger: new Types.ObjectId(requestedLedgerId) as any },
        { ledgerId: requestedLedgerId },
      ],
    });
  }

  private applyOptionalFiltersToMyExpenses(
    andQueryParts: any[],
    filters?: any,
  ): void {
    const requestedSubLedger = filters?.subLedger?.trim();
    if (requestedSubLedger) {
      andQueryParts.push({ subLedger: requestedSubLedger });
    }

    if (filters?.category) {
      andQueryParts.push({ category: filters.category });
    }

    const dateRangeQuery = this.buildDateRangeQuery(
      filters?.fromDate,
      filters?.toDate,
    );
    if (dateRangeQuery) {
      andQueryParts.push({ $or: dateRangeQuery });
    }
  }

  private mapExpenses(spendings: any[]): any[] {
    return spendings.map((s: any) => {
      const spending = s.toObject ? s.toObject() : s;
      const ledgerId =
        this.getId(spending.ledger?._id) ||
        this.getId(spending.ledger) ||
        String(spending.ledgerId || '') ||
        null;
      const ledgerName = String(
        spending.ledger?.name || spending.ledgerName || '',
      ).trim();
      const spendingDetail = this.buildSpendingDetailDisplay(
        spending,
        ledgerId ? String(ledgerId) : '',
        ledgerName,
      );

      return {
        ...spending,
        projectName: spending.project?.name || 'Unknown',
        projectType: spending.project?.type || '',
        productName: spending.materialType || '',
        ledgerId,
        ledgerName: ledgerName || '',
        subLedger: spending.subLedger || '',
        ...spendingDetail,
      };
    });
  }

  private emptyExpenseAnalytics() {
    return {
      totalSpent: 0,
      approvedSpent: 0,
      pendingSpent: 0,
      dailyAverage: 0,
      categoryBreakdown: [],
      monthlyTrend: [],
      projectBreakdown: [],
    };
  }

  private buildExpenseAnalyticsQuery(
    projectIds: any[],
    actorId: string,
    filters?: { fromDate?: string; toDate?: string },
  ) {
    const query: any = {
      project: { $in: projectIds },
      status: 'approved',
      ...this.buildFundedAccountQuery(actorId),
    };
    if (filters?.fromDate) {
      query.date = { ...query.date, $gte: filters.fromDate };
    }
    if (filters?.toDate) {
      query.date = { ...query.date, $lte: filters.toDate };
    }
    return query;
  }

  private aggregateExpenseAnalytics(spendings: any[]) {
    let totalSpent = 0;
    let approvedSpent = 0;
    let pendingSpent = 0;
    const categoryMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    const projectMap = new Map<string, { name: string; amount: number }>();

    for (const s of spendings) {
      totalSpent += s.amount;
      if (s.status === 'approved') approvedSpent += s.amount;
      if (s.status === 'pending') pendingSpent += s.amount;

      const category = s.category || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + s.amount);

      const dateStr =
        s.date || s.createdAt?.toISOString?.()?.split('T')[0] || '';
      const monthKey = dateStr.substring(0, 7);
      if (monthKey) {
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + s.amount);
      }

      const projectId =
        s.project?._id?.toString() || s.project?.toString() || '';
      if (!projectId) continue;

      const projectName = s.project?.name || 'Unknown';
      const existing = projectMap.get(projectId);
      if (existing) existing.amount += s.amount;
      else projectMap.set(projectId, { name: projectName, amount: s.amount });
    }

    return {
      totalSpent,
      approvedSpent,
      pendingSpent,
      categoryMap,
      monthlyMap,
      projectMap,
    };
  }

  private buildCategoryBreakdown(
    categoryMap: Map<string, number>,
    totalSpent: number,
  ) {
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          totalSpent > 0 ? Number(((amount / totalSpent) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private buildMonthlyTrend(monthlyMap: Map<string, number>) {
    return Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private buildProjectBreakdown(
    projectMap: Map<string, { name: string; amount: number }>,
  ) {
    return Array.from(projectMap.entries())
      .map(([projectId, data]) => ({
        projectId,
        projectName: data.name,
        amount: data.amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  async addSpending(createSpendingDto: any, user: any) {
    const project = await this.projectsService.findOne(
      createSpendingDto.projectId || createSpendingDto.project,
    );
    if (!project) throw new NotFoundException('Project not found');

    const actorId = this.getActorId(user);
    if (!actorId)
      throw new ForbiddenException('Unable to determine current user');

    const amount = Number(createSpendingDto.amount);
    this.ensurePositiveSpendingAmount(amount);
    await this.ensureProjectHasSpendingCapacity(project, amount);

    const activeInvestors = this.getApprovalEligibleInvestors(project);
    this.ensureUserCanAddSpending(user, actorId, activeInvestors);
    const resolvedFundedByUserId = this.resolveFundedByUserId(
      createSpendingDto,
      project,
      actorId,
    );

    const isSolo = activeInvestors.length <= 1;
    const status = isSolo ? 'approved' : 'pending';

    const memberNameMap = this.getMemberNameMap(project);
    const actorName = memberNameMap.get(actorId) || 'Unknown';
    const approvals = this.createInitialApprovals(actorId, actorName);

    const {
      requestedLedgerId,
      normalizedSubLedger,
      normalizedCategory,
      normalizedMaterialType,
      normalizedPaidToPerson,
      normalizedPaidToPlace,
    } = this.normalizeSpendingInput(createSpendingDto);
    this.validateCategorySpecificFields(
      normalizedCategory,
      normalizedMaterialType,
      normalizedPaidToPerson,
      normalizedPaidToPlace,
    );
    const resolvedLedgerObjectId = await this.resolveSpendingLedgerId(
      requestedLedgerId,
      normalizedSubLedger,
      project,
    );

    const createdSpending = new this.spendingModel({
      ...createSpendingDto,
      ledger: resolvedLedgerObjectId as any,
      subLedger: normalizedSubLedger || undefined,
      paidTo:
        normalizedCategory === 'Service'
          ? {
              person: normalizedPaidToPerson,
              place: normalizedPaidToPlace,
            }
          : undefined,
      materialType:
        normalizedCategory === 'Product' ? normalizedMaterialType : undefined,
      project: project['_id'],
      addedBy: actorId,
      fundedBy: resolvedFundedByUserId,
      status,
      approvals,
    });

    await createdSpending.save();

    if (status === 'pending') {
      await this.notifyPendingSpending(
        project,
        actorId,
        actorName,
        createdSpending,
        activeInvestors,
      );
    }

    return this.buildSpendingResponse(createdSpending, project);
  }

  async voteSpending(
    spendingId: string,
    userId: string,
    vote: 'approved' | 'rejected',
    user?: any,
  ) {
    const spending = await this.spendingModel.findById(spendingId);
    if (!spending) throw new NotFoundException('Spending not found');
    this.assertVoteAllowed(spending);

    const projectId = (spending.project as any).toString();
    const project = await this.projectsService.findOne(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const activeInvestors = this.getApprovalEligibleInvestors(project);
    const requiredVotes = activeInvestors.length;
    this.ensureUserCanVote(user, activeInvestors, userId);
    this.ensureApprovalsMap(spending);

    const memberNameMap = this.getMemberNameMap(project);
    const voterName = memberNameMap.get(userId) || 'Unknown';

    spending.approvals.set(userId, {
      status: vote,
      date: new Date(),
      user: userId,
      userName: voterName,
    } as any);

    if (vote === 'rejected') {
      spending.status = 'rejected';
      await spending.save();
      await this.notifyRejectedSpending(spending, project, voterName);
      return this.buildSpendingResponse(spending, project);
    }

    const approvedCount = this.countApprovedVotes(spending.approvals);

    if (approvedCount >= requiredVotes) {
      spending.status = 'approved';
      await this.notifyApprovedSpending(spending, project);
    }

    await spending.save();
    return this.buildSpendingResponse(spending, project);
  }

  async findAll(
    projectId: string,
    user: any,
    filters?: {
      ownerUserId?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId is required');
    }
    const project = await this.assertProjectAccess(projectId, user);

    const spendings = await this.spendingModel
      .find({ project: new Types.ObjectId(projectId) as any })
      .exec();

    const eligibleInvestors = this.getApprovalEligibleInvestors(project);
    const requiredVotes = eligibleInvestors.length;
    const eligibleInvestorIds = eligibleInvestors
      .map((inv: any) => this.getId(inv.user))
      .filter(Boolean);
    const eligibleInvestorIdSet = new Set(eligibleInvestorIds);

    await this.autoApprovePendingSpendings(
      spendings,
      requiredVotes,
      eligibleInvestorIdSet,
    );

    const populatedSpendings = await this.spendingModel
      .find({ project: new Types.ObjectId(projectId) as any })
      .populate('addedBy', 'name email')
      .populate('fundedBy', 'name email')
      .populate('ledger', 'name subLedgers')
      .exec();

    const memberNameMap = this.getMemberNameMap(project);
    const statusFilter = this.parseStatusFilter(filters?.status);
    const fromDate = filters?.fromDate ? String(filters.fromDate) : '';
    const toDate = filters?.toDate ? String(filters.toDate) : '';
    const ownerUserId = filters?.ownerUserId ? String(filters.ownerUserId) : '';

    return populatedSpendings
      .map((spendingDoc: any) =>
        this.enrichSpendingForResponse(
          spendingDoc,
          eligibleInvestorIds,
          memberNameMap,
        ),
      )
      .filter((spending: any) =>
        this.matchesSpendingFilters(
          spending,
          statusFilter,
          fromDate,
          toDate,
          ownerUserId,
        ),
      );
  }

  /**
   * Paginated, multi-attribute search for spendings within a single project.
   * Used by the "View All Spendings" modal for 10K+ scale.
   *
   * MongoDB regex search on: description, category, subLedger, date, materialType.
   * Post-populate search on: addedBy.name, fundedBy.name, ledger.name.
   * Pagination via skip/limit. Returns same shape as findAll via enrichSpendingForResponse.
   */
  async searchSpendings(
    projectId: string,
    user: any,
    opts?: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId is required');
    }
    const project = await this.assertProjectAccess(projectId, user);

    const eligibleInvestors = this.getApprovalEligibleInvestors(project);
    const eligibleInvestorIds = eligibleInvestors
      .map((inv: any) => this.getId(inv.user))
      .filter(Boolean);
    const memberNameMap = this.getMemberNameMap(project);

    // Build base query
    const query: any = { project: new Types.ObjectId(projectId) as any };

    // Status filter
    const statusValue = (opts?.status || '').trim().toLowerCase();
    if (statusValue && statusValue !== 'all') {
      query.status = statusValue;
    }

    // Text search via $or with regex across DB-level fields
    const searchTerm = (opts?.search || '').trim();
    if (searchTerm) {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: escapedTerm, $options: 'i' };

      query.$or = [
        { description: regex },
        { category: regex },
        { subLedger: regex },
        { date: regex },
        { materialType: regex },
        // Also match on amount as string (e.g. searching "5000")
        ...(/^\d+$/.test(searchTerm) ? [{ amount: Number(searchTerm) }] : []),
      ];
    }

    // Pagination
    const page = Math.max(opts?.page || 1, 1);
    const limit = Math.min(Math.max(opts?.limit || 30, 1), 200);
    const skip = (page - 1) * limit;

    // Execute query + count in parallel
    const [rawSpendings, total] = await Promise.all([
      this.spendingModel
        .find(query)
        .populate('addedBy', 'name email')
        .populate('fundedBy', 'name email')
        .populate('ledger', 'name subLedgers')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.spendingModel.countDocuments(query).exec(),
    ]);

    // Note: Search covers DB-level fields (description, category, subLedger,
    // date, materialType, amount). Populated names (addedBy.name, fundedBy.name,
    // ledger.name) are not searchable at query-level since they live in separate
    // collections. They are included in the enriched response for display.

    // Enrich with same shape as findAll
    const spendings = rawSpendings.map((spendingDoc: any) =>
      this.enrichSpendingForResponse(
        spendingDoc,
        eligibleInvestorIds,
        memberNameMap,
      ),
    );

    return {
      spendings,
      total,
      page,
      limit,
      hasMore: skip + spendings.length < total,
    };
  }

  // ========== LEDGER CRUD ==========

  async createLedger(createLedgerDto: any, user: any) {
    await this.assertProjectWriteAccess(createLedgerDto?.project, user);
    const ledger = new this.ledgerModel(createLedgerDto);
    return ledger.save();
  }

  async findAllLedgers(projectId: string, user: any) {
    if (projectId) {
      await this.assertProjectAccess(projectId, user);
      return this.ledgerModel
        .find({ project: new Types.ObjectId(projectId) as any })
        .exec();
    }

    if (this.isPrivilegedRole(user?.role)) {
      return this.ledgerModel.find().exec();
    }

    const userProjects = await this.projectsService.findAll(user);
    const projectIds = userProjects.map((p: any) => p?._id).filter(Boolean);
    if (!projectIds.length) return [];

    return this.ledgerModel.find({ project: { $in: projectIds } }).exec();
  }

  async findOneLedger(id: string, user: any) {
    const ledger = await this.ledgerModel.findById(id).exec();
    if (!ledger) throw new NotFoundException('Ledger not found');
    await this.assertProjectAccess(
      (ledger as any).project?.toString?.() || String((ledger as any).project),
      user,
    );
    return ledger;
  }

  async updateLedger(id: string, updateDto: any, user: any) {
    const existing = await this.ledgerModel.findById(id).exec();
    if (!existing) throw new NotFoundException('Ledger not found');

    const targetProjectId =
      updateDto?.project ||
      (existing as any).project?.toString?.() ||
      String((existing as any).project);
    await this.assertProjectWriteAccess(targetProjectId, user);

    const ledger = await this.ledgerModel
      .findByIdAndUpdate(id, updateDto, { returnDocument: 'after' })
      .exec();
    if (!ledger) throw new NotFoundException('Ledger not found');
    return ledger;
  }

  async deleteLedger(id: string, user: any) {
    const existing = await this.ledgerModel.findById(id).exec();
    if (!existing) throw new NotFoundException('Ledger not found');
    await this.assertProjectWriteAccess(
      (existing as any).project?.toString?.() ||
        String((existing as any).project),
      user,
    );

    const result = await this.ledgerModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Ledger not found');
    return { deleted: true };
  }

  // ========== CONSOLIDATED ENDPOINTS (eliminates N+1 frontend pattern) ==========

  /**
   * GET /finance/my-expenses — single endpoint for all user expenses across projects.
   * Replaces: frontend fetching N projects then N spendings calls.
   */
  async getMyExpenses(
    user: any,
    filters?: {
      fromDate?: string;
      toDate?: string;
      category?: string;
      projectId?: string;
      ledgerId?: string;
      subLedger?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const actorId = this.getActorId(user);
    if (!actorId)
      throw new ForbiddenException('Unable to determine current user');

    const projectIds = await this.getAccessibleProjectIds(user);
    if (!projectIds.length)
      return { expenses: [], total: 0, page: 1, totalPages: 0 };

    const requestedProjectId = filters?.projectId?.trim();
    const requestedLedgerId = filters?.ledgerId?.trim();

    const accessibleProjectIdSet = new Set(projectIds.map(String));
    const andQueryParts = this.createMyExpensesBaseQuery(projectIds, actorId);
    this.applyProjectFilterToMyExpenses(
      andQueryParts,
      accessibleProjectIdSet,
      requestedProjectId,
    );
    await this.applyLedgerFilterToMyExpenses(
      andQueryParts,
      accessibleProjectIdSet,
      requestedLedgerId,
      requestedProjectId,
    );
    this.applyOptionalFiltersToMyExpenses(andQueryParts, filters);

    const query: any =
      andQueryParts.length > 1 ? { $and: andQueryParts } : andQueryParts[0];

    const page = Math.max(filters?.page || 1, 1);
    const limit = Math.min(Math.max(filters?.limit || 50, 1), 200);
    const skip = (page - 1) * limit;

    const [spendings, total] = await Promise.all([
      this.spendingModel
        .find(query)
        .populate('addedBy', 'name email')
        .populate('fundedBy', 'name email')
        .populate('project', 'name type')
        .populate('ledger', 'name subLedgers')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.spendingModel.countDocuments(query).exec(),
    ]);

    const expenses = this.mapExpenses(spendings);

    return {
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /finance/expense-analytics — server-side expense analytics.
   * Replaces: frontend computing totals, category breakdowns, trends, daily averages.
   */
  async getExpenseAnalytics(
    user: any,
    filters?: { fromDate?: string; toDate?: string },
  ) {
    const actorId = this.getActorId(user);
    if (!actorId)
      throw new ForbiddenException('Unable to determine current user');

    const projectIds = await this.getAccessibleProjectIds(user);
    if (!projectIds.length) {
      return this.emptyExpenseAnalytics();
    }

    const query = this.buildExpenseAnalyticsQuery(projectIds, actorId, filters);

    const spendings = await this.spendingModel
      .find(query)
      .populate('project', 'name')
      .exec();
    const {
      totalSpent,
      approvedSpent,
      pendingSpent,
      categoryMap,
      monthlyMap,
      projectMap,
    } = this.aggregateExpenseAnalytics(spendings);

    // Calculate daily average based on date range
    const days =
      spendings.length > 0
        ? Math.max(this.getDaysBetween(filters?.fromDate, filters?.toDate), 1)
        : 1;
    const dailyAverage = Math.round(totalSpent / days);
    const categoryBreakdown = this.buildCategoryBreakdown(
      categoryMap,
      totalSpent,
    );
    const monthlyTrend = this.buildMonthlyTrend(monthlyMap);
    const projectBreakdown = this.buildProjectBreakdown(projectMap);

    return {
      totalSpent,
      approvedSpent,
      pendingSpent,
      dailyAverage,
      categoryBreakdown,
      monthlyTrend,
      projectBreakdown,
    };
  }

  /**
   * GET /finance/my-pending-approvals — pending spending approvals requiring current user's vote.
   */
  async getMyPendingApprovals(user: any) {
    const actorId = this.getActorId(user);
    if (!actorId)
      throw new ForbiddenException('Unable to determine current user');

    const userProjects = await this.projectsService.findAll(user);
    const projectIds = userProjects.map((p: any) => p?._id).filter(Boolean);
    if (!projectIds.length) return { approvals: [], total: 0 };

    const pendingSpendings = await this.spendingModel
      .find({
        project: { $in: projectIds },
        status: 'pending',
      } as any)
      .populate('project', 'name investors createdBy')
      .sort({ createdAt: -1 })
      .exec();

    const approvals = pendingSpendings
      .map((spending: any) => {
        const project = spending?.project;
        if (!project) return null;

        const eligibleInvestors = this.getApprovalEligibleInvestors(project);
        const eligibleInvestorIds = eligibleInvestors
          .map((inv: any) => this.getId(inv?.user))
          .filter(Boolean);

        if (!eligibleInvestorIds.includes(actorId)) return null;

        const rawApprovals =
          spending?.approvals instanceof Map
            ? Object.fromEntries(spending.approvals.entries())
            : spending?.approvals || {};

        const hasVoted = Object.entries(rawApprovals).some(
          ([approvalKey, approval]) => {
            const approvalUserId =
              this.getId((approval as any)?.user) || String(approvalKey);
            return String(approvalUserId) === actorId;
          },
        );

        if (hasVoted) return null;

        const addedById = this.getId(spending?.addedBy);
        if (addedById === actorId) return null;

        return {
          id: this.getId(spending),
          type: 'spending',
          title: spending?.description
            ? `Approve expense: ${spending.description}`
            : 'Approve pending expense',
          projectId: this.getId(project),
          projectName: project?.name || 'Project',
          proposedAt: spending?.createdAt || spending?.updatedAt || new Date(),
          amount: Number(spending?.amount || 0),
          status: 'pending',
        };
      })
      .filter(Boolean);

    return {
      approvals,
      total: approvals.length,
    };
  }

  /**
   * GET /finance/spending-summary — pre-computed spending totals per project.
   * Eliminates frontend reduce() on raw spending arrays.
   */
  async getSpendingSummary(projectId: string, user: any) {
    const project = await this.assertProjectAccess(projectId, user);

    const spendings = await this.spendingModel
      .find({ project: new Types.ObjectId(projectId) as any })
      .exec();

    let totalSpent = 0;
    let approvedSpent = 0;
    let pendingSpent = 0;
    let rejectedSpent = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    for (const s of spendings) {
      totalSpent += s.amount;
      if (s.status === 'approved') {
        approvedSpent += s.amount;
        approvedCount += 1;
      } else if (s.status === 'pending') {
        pendingSpent += s.amount;
        pendingCount += 1;
      } else if (s.status === 'rejected') {
        rejectedSpent += s.amount;
        rejectedCount += 1;
      }
    }

    return {
      projectId,
      projectName: project.name,
      totalSpent,
      approvedSpent,
      pendingSpent,
      rejectedSpent,
      approvedCount,
      pendingCount,
      rejectedCount,
      spendingCount: spendings.length,
      targetAmount: project.targetAmount || 0,
      remaining: Math.max((project.targetAmount || 0) - approvedSpent, 0),
    };
  }

  /**
   * GET /finance/spending-summary/bulk — pre-computed totals for multiple projects.
   * Eliminates frontend N+1 calls by returning summaries in one response.
   */
  async getBulkSpendingSummary(projectIds: string[], user: any) {
    const actor = { userId: this.getActorId(user), role: user?.role };
    const accessibleProjects = await this.projectsService.findAll(actor);
    const accessibleById = new Map(
      (accessibleProjects || []).map((project: any) => [
        String(project?._id),
        project,
      ]),
    );

    const requestedIds = [...new Set((projectIds || []).map(String))].filter(
      (id) => id && accessibleById.has(id) && Types.ObjectId.isValid(id),
    );

    if (requestedIds.length === 0) {
      return { summaries: [] };
    }

    const requestedObjectIds = requestedIds.map((id) => new Types.ObjectId(id));

    const grouped = await this.spendingModel.aggregate([
      {
        $match: {
          project: { $in: requestedObjectIds as any },
        },
      },
      {
        $group: {
          _id: {
            project: '$project',
            status: '$status',
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summaryMap = new Map<string, any>();
    for (const projectId of requestedIds) {
      const project = accessibleById.get(projectId);
      summaryMap.set(projectId, {
        projectId,
        projectName: project?.name || 'Project',
        totalSpent: 0,
        approvedSpent: 0,
        pendingSpent: 0,
        rejectedSpent: 0,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        spendingCount: 0,
        targetAmount: project?.targetAmount || 0,
        remaining: project?.targetAmount || 0,
      });
    }

    for (const item of grouped || []) {
      const projectId = String(item?._id?.project || '');
      const status = String(item?._id?.status || '');
      const amount = Number(item?.amount || 0);
      const count = Number(item?.count || 0);
      const summary = summaryMap.get(projectId);
      if (!summary) continue;

      summary.totalSpent += amount;
      summary.spendingCount += count;
      if (status === 'approved') {
        summary.approvedSpent += amount;
        summary.approvedCount += count;
      } else if (status === 'pending') {
        summary.pendingSpent += amount;
        summary.pendingCount += count;
      } else if (status === 'rejected') {
        summary.rejectedSpent += amount;
        summary.rejectedCount += count;
      }
    }

    for (const summary of summaryMap.values()) {
      summary.remaining = Math.max(
        (summary.targetAmount || 0) - (summary.approvedSpent || 0),
        0,
      );
    }

    return { summaries: Array.from(summaryMap.values()) };
  }

  /**
   * GET /finance/export — server-side financial report generation.
   * Supports production-ready CSV and Excel exports.
   */
  async exportExpenses(
    user: any,
    format: string = 'csv',
    filters?: {
      fromDate?: string;
      toDate?: string;
      projectId?: string;
      ledgerId?: string;
      subLedger?: string;
    },
  ) {
    const normalizedFormat = String(format || 'csv').toLowerCase();
    const exportFormat =
      normalizedFormat === 'excel' ? 'xlsx' : normalizedFormat;

    if (!['csv', 'xlsx'].includes(exportFormat)) {
      throw new BadRequestException(
        'Supported export formats are csv and xlsx',
      );
    }

    const result = await this.getMyExpenses(user, {
      ...filters,
      page: 1,
      limit: 5000,
    });
    const expenses = result.expenses;
    const generatedAt = new Date();
    const dateStamp = generatedAt.toISOString().split('T')[0];
    const periodFrom = filters?.fromDate || 'N/A';
    const periodTo = filters?.toDate || dateStamp;
    const projectFilter = filters?.projectId || 'All Accessible Projects';
    const ledgerFilter = filters?.ledgerId || 'All Ledgers';
    const subLedgerFilter = filters?.subLedger || 'All Sub Ledgers';
    const totalAmount = expenses.reduce(
      (sum: number, e: any) => sum + Number(e?.amount || 0),
      0,
    );

    const columns = [
      'Date',
      'Time',
      'Project',
      'Ledger',
      'Sub Ledger',
      'Category',
      'Description',
      'Amount (INR)',
      'Status',
      'Added By',
      'Paid To Person',
      'Paid To Place',
      'Material Type',
    ];

    if (exportFormat === 'csv') {
      const metadataRows = [
        ['SplitFlow Expense Report', ''],
        ['Generated At', generatedAt.toISOString()],
        ['Period', `${periodFrom} to ${periodTo}`],
        ['Project Filter', projectFilter],
        ['Ledger Filter', ledgerFilter],
        ['Sub Ledger Filter', subLedgerFilter],
        ['Total Records', String(expenses.length)],
        ['Total Amount (INR)', totalAmount.toFixed(2)],
        [],
      ];

      const dataRows = expenses.map((e: any) => [
        e.date || '',
        e.time || '',
        e.projectName || '',
        e.ledgerName || '',
        e.subLedger || '',
        e.category || '',
        e.description || '',
        Number(e.amount || 0).toFixed(2),
        e.status || '',
        e.addedBy?.name || '',
        e.paidTo?.person || '',
        e.paidTo?.place || '',
        e.materialType || '',
      ]);

      const csvLines = [
        ...metadataRows.map((row) =>
          row.map((value) => this.escapeCsvCell(value)).join(','),
        ),
        columns.map((value) => this.escapeCsvCell(value)).join(','),
        ...dataRows.map((row) =>
          row.map((value) => this.escapeCsvCell(value)).join(','),
        ),
      ];

      return {
        format: 'csv',
        mimeType: 'text/csv;charset=utf-8',
        content: `\uFEFF${csvLines.join('\n')}`,
        filename: `splitflow_expenses_${this.buildFilterFileSuffix(filters)}_${dateStamp}.csv`,
      };
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SplitFlow';
    workbook.created = generatedAt;
    workbook.modified = generatedAt;
    workbook.lastModifiedBy = 'SplitFlow Reporting Engine';

    const statusTotals: Record<string, number> = expenses.reduce(
      (acc: Record<string, number>, item: any) => {
        const key = String(item?.status || 'unknown').toUpperCase();
        acc[key] = (acc[key] || 0) + Number(item?.amount || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    const categoryTotals: Record<string, number> = expenses.reduce(
      (acc: Record<string, number>, item: any) => {
        const key = String(item?.category || 'Uncategorized');
        acc[key] = (acc[key] || 0) + Number(item?.amount || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    const projectTotals: Record<string, number> = expenses.reduce(
      (acc: Record<string, number>, item: any) => {
        const key = String(item?.projectName || 'Unknown Project');
        acc[key] = (acc[key] || 0) + Number(item?.amount || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    const statusEntries = Object.entries(statusTotals);
    const categoryEntries = Object.entries(categoryTotals);
    const topProjects = Object.entries(projectTotals)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5);

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { width: 26 },
      { width: 20 },
      { width: 26 },
      { width: 20 },
    ];

    summarySheet.mergeCells('A1:D1');
    summarySheet.getCell('A1').value = 'SplitFlow Expense Report Summary';
    summarySheet.getCell('A1').font = {
      bold: true,
      size: 18,
      color: { argb: 'FF1F4E78' },
    };
    summarySheet.getCell('A1').alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };

    summarySheet.getCell('A2').value = `Period: ${periodFrom} to ${periodTo}`;
    summarySheet.getCell('A3').value =
      `Generated At: ${generatedAt.toISOString()}`;
    summarySheet.getCell('A2').font = { color: { argb: 'FF4B5563' } };
    summarySheet.getCell('A3').font = { color: { argb: 'FF4B5563' } };

    summarySheet.getCell('A5').value = 'Total Records';
    summarySheet.getCell('B5').value = expenses.length;
    summarySheet.getCell('C5').value = 'Total Amount (INR)';
    summarySheet.getCell('D5').value = totalAmount;
    summarySheet.getCell('D5').numFmt = '#,##0.00';

    ['A5', 'C5'].forEach((cellRef) => {
      const cell = summarySheet.getCell(cellRef);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });
    ['B5', 'D5'].forEach((cellRef) => {
      const cell = summarySheet.getCell(cellRef);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFF6FF' },
      };
    });

    summarySheet.getCell('A8').value = 'Status Breakdown';
    summarySheet.getCell('A8').font = { bold: true, size: 12 };
    summarySheet.getCell('A9').value = 'Status';
    summarySheet.getCell('B9').value = 'Amount (INR)';
    summarySheet.getCell('A9').font = { bold: true };
    summarySheet.getCell('B9').font = { bold: true };

    let statusRow = 10;
    for (const [status, amount] of statusEntries) {
      summarySheet.getCell(`A${statusRow}`).value = status;
      summarySheet.getCell(`B${statusRow}`).value = Number(amount);
      summarySheet.getCell(`B${statusRow}`).numFmt = '#,##0.00';
      statusRow += 1;
    }

    summarySheet.getCell('C8').value = 'Top Projects';
    summarySheet.getCell('C8').font = { bold: true, size: 12 };
    summarySheet.getCell('C9').value = 'Project';
    summarySheet.getCell('D9').value = 'Amount (INR)';
    summarySheet.getCell('C9').font = { bold: true };
    summarySheet.getCell('D9').font = { bold: true };

    let projectRow = 10;
    for (const [projectName, amount] of topProjects) {
      summarySheet.getCell(`C${projectRow}`).value = projectName;
      summarySheet.getCell(`D${projectRow}`).value = Number(amount);
      summarySheet.getCell(`D${projectRow}`).numFmt = '#,##0.00';
      projectRow += 1;
    }

    summarySheet.getCell('A16').value = 'Category Breakdown';
    summarySheet.getCell('A16').font = { bold: true, size: 12 };
    summarySheet.getCell('A17').value = 'Category';
    summarySheet.getCell('B17').value = 'Amount (INR)';
    summarySheet.getCell('A17').font = { bold: true };
    summarySheet.getCell('B17').font = { bold: true };

    let categoryRow = 18;
    for (const [category, amount] of categoryEntries) {
      summarySheet.getCell(`A${categoryRow}`).value = category;
      summarySheet.getCell(`B${categoryRow}`).value = Number(amount);
      summarySheet.getCell(`B${categoryRow}`).numFmt = '#,##0.00';
      categoryRow += 1;
    }

    const worksheet = workbook.addWorksheet('Expenses');
    worksheet.views = [{ state: 'frozen', ySplit: 10 }];
    worksheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
    };

    const columnWidths = [14, 10, 24, 22, 20, 16, 34, 16, 14, 22, 20, 20, 18];
    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    worksheet.mergeCells('A1:M1');
    worksheet.getCell('A1').value = 'SplitFlow Expense Report';
    worksheet.getCell('A1').font = {
      bold: true,
      size: 18,
      color: { argb: 'FF1F4E78' },
    };
    worksheet.getCell('A1').alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };

    worksheet.getCell('A2').value = 'Generated At';
    worksheet.getCell('B2').value = generatedAt.toISOString();
    worksheet.getCell('A3').value = 'Period';
    worksheet.getCell('B3').value = `${periodFrom} to ${periodTo}`;
    worksheet.getCell('A4').value = 'Project Filter';
    worksheet.getCell('B4').value = projectFilter;
    worksheet.getCell('A5').value = 'Ledger Filter';
    worksheet.getCell('B5').value = ledgerFilter;
    worksheet.getCell('A6').value = 'Sub Ledger Filter';
    worksheet.getCell('B6').value = subLedgerFilter;
    worksheet.getCell('A7').value = 'Total Records';
    worksheet.getCell('B7').value = expenses.length;
    worksheet.getCell('A8').value = 'Total Amount (INR)';
    worksheet.getCell('B8').value = totalAmount;
    worksheet.getCell('B8').numFmt = '#,##0.00';

    ['A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'].forEach((cellRef) => {
      worksheet.getCell(cellRef).font = { bold: true };
    });

    const headerRowIndex = 10;
    const headerRow = worksheet.getRow(headerRowIndex);
    columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      };
    });

    let rowNumber = headerRowIndex + 1;
    for (const expense of expenses) {
      const row = worksheet.addRow([
        expense.date || '',
        expense.time || '',
        expense.projectName || '',
        expense.ledgerName || '',
        expense.subLedger || '',
        expense.category || '',
        expense.description || '',
        Number(expense.amount || 0),
        String(expense.status || '').toUpperCase(),
        expense.addedBy?.name || '',
        expense.paidTo?.person || '',
        expense.paidTo?.place || '',
        expense.materialType || '',
      ]);

      row.getCell(8).numFmt = '#,##0.00';
      row.alignment = { vertical: 'middle', horizontal: 'left' };

      const isEvenRow = rowNumber % 2 === 0;
      if (isEvenRow) {
        for (let col = 1; col <= columns.length; col += 1) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      }

      rowNumber += 1;
    }

    const totalRow = worksheet.addRow([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      totalAmount,
      '',
      '',
      '',
      '',
      '',
    ]);
    totalRow.font = { bold: true };
    totalRow.getCell(8).numFmt = '#,##0.00';
    for (let col = 1; col <= columns.length; col += 1) {
      totalRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8EEF8' },
      };
    }

    worksheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex, column: columns.length },
    };

    const workbookBuffer = await workbook.xlsx.writeBuffer();
    return {
      format: 'xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      encoding: 'base64',
      content: Buffer.from(workbookBuffer as ArrayBuffer).toString('base64'),
      filename: `splitflow_expenses_${this.buildFilterFileSuffix(filters)}_${dateStamp}.xlsx`,
    };
  }

  private buildFilterFileSuffix(filters?: {
    projectId?: string;
    ledgerId?: string;
    subLedger?: string;
  }): string {
    const parts = [
      filters?.projectId ? `project-${filters.projectId}` : null,
      filters?.ledgerId ? `ledger-${filters.ledgerId}` : null,
      filters?.subLedger ? `sub-${filters.subLedger}` : null,
    ].filter(Boolean) as string[];

    const raw = parts.length ? parts.join('_') : 'all';
    return raw
      .toLowerCase()
      .replaceAll(/[^a-z0-9_-]+/g, '-')
      .replaceAll(/-+/g, '-');
  }

  private getDaysBetween(fromDate?: string, toDate?: string): number {
    const from = fromDate
      ? new Date(fromDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  }
}
