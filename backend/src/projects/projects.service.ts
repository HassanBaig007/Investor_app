import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import ExcelJS from 'exceljs';
import {
  Project,
  ProjectDocument,
  ProjectStatus,
} from './schemas/project.schema';
import {
  MarketPrice,
  MarketPriceDocument,
} from './schemas/market-price.schema';
import {
  MarketNewsItem,
  MarketNewsItemDocument,
} from './schemas/market-news-item.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateMarketPriceDto } from './dto/update-market-price.dto';
import { UpdateMarketNewsItemDto } from './dto/update-market-news-item.dto';
import { User } from '../users/schemas/user.schema';
import { Notification } from '../notifications/schemas/notification.schema';
import {
  Spending,
  SpendingDocument,
  Ledger,
  LedgerDocument,
} from '../finance/schemas/finance.schema';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  private readonly VALID_TRANSITIONS: Record<string, string[]> = {
    [ProjectStatus.PENDING]: [ProjectStatus.FUNDING, ProjectStatus.COMPLETED],
    [ProjectStatus.FUNDING]: [ProjectStatus.ACTIVE, ProjectStatus.COMPLETED],
    [ProjectStatus.ACTIVE]: [ProjectStatus.COMPLETED],
    [ProjectStatus.COMPLETED]: [], // Terminal state
  };

  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(MarketPrice.name)
    private readonly marketPriceModel: Model<MarketPriceDocument>,
    @InjectModel(MarketNewsItem.name)
    private readonly marketNewsItemModel: Model<MarketNewsItemDocument>,
    @InjectModel(User.name) private readonly userModel: Model<any>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<any>, // Generic for activity log
    @InjectModel(Spending.name)
    private readonly spendingModel: Model<SpendingDocument>,
    @InjectModel(Ledger.name)
    private readonly ledgerModel: Model<LedgerDocument>,
  ) { }

  private escapeCsvCell(value: any): string {
    if (value === null || value === undefined) return '';
    const raw = String(value);
    if (/[",\n\r]/.test(raw)) {
      return `"${raw.replaceAll('"', '""')}"`;
    }
    return raw;
  }

  private getActorContext(user: any): { userId: string; role?: string } {
    return {
      userId: String(user?.userId || user?.id || user?._id || ''),
      role: user?.role,
    };
  }

  private buildProjectExportFileName(
    projectName: string,
    extension: string,
  ): string {
    const dateStamp = new Date().toISOString().split('T')[0];
    const safeProjectName =
      String(projectName || 'project')
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/-+/g, '-')
        .replaceAll(/(^-)|(-$)/g, '') || 'project';
    return `splitflow_${safeProjectName}_details_${dateStamp}.${extension}`;
  }

  async exportProjectDetails(
    projectId: string,
    user: any,
    format: string = 'xlsx',
  ) {
    const normalizedFormat = String(format || 'xlsx').toLowerCase();
    const exportFormat =
      normalizedFormat === 'excel' ? 'xlsx' : normalizedFormat;

    if (!['csv', 'xlsx'].includes(exportFormat)) {
      throw new BadRequestException(
        'Supported export formats are csv and xlsx',
      );
    }

    const actor = this.getActorContext(user);
    const project = (await this.findOne(projectId, actor)) as any;
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const projectObjectId = Types.ObjectId.isValid(projectId)
      ? new Types.ObjectId(projectId)
      : null;

    const projectMatchExpression = projectObjectId
      ? {
        $or: [
          { project: projectObjectId },
          {
            $expr: {
              $eq: [{ $toString: '$project' }, projectId],
            },
          },
        ],
      }
      : {
        $expr: {
          $eq: [{ $toString: '$project' }, projectId],
        },
      };

    const [ledgers, spendings] = await Promise.all([
      this.ledgerModel
        .find(projectMatchExpression as any)
        .lean()
        .exec(),
      this.spendingModel
        .find(projectMatchExpression as any)
        .populate('addedBy', 'name email')
        .populate('fundedBy', 'name email')
        .populate('ledger', 'name subLedgers')
        .lean()
        .exec(),
    ]);

    const generatedAt = new Date();
    const members = (project?.investors || []).map((investor: any) => {
      const investorUser = investor?.user || {};
      const userId =
        String(investorUser?._id || investorUser?.id || investor?.user || '') ||
        'unknown';
      return {
        userId,
        name:
          investorUser?.name ||
          investor?.privacySettings?.displayName ||
          'Unknown',
        email: investorUser?.email || '',
        role: investor?.role || 'active',
        investedAmount: Number(investor?.investedAmount || 0),
        isCreator:
          String(
            project?.createdBy?._id ||
            project?.createdBy?.id ||
            project?.createdBy ||
            '',
          ) === userId,
      };
    });

    const hasCreator = members.some((member) => member.isCreator);
    if (!hasCreator && project?.createdBy) {
      members.unshift({
        userId: String(
          project?.createdBy?._id ||
          project?.createdBy?.id ||
          project?.createdBy ||
          '',
        ),
        name: project?.createdBy?.name || 'Project Creator',
        email: project?.createdBy?.email || '',
        role: 'creator',
        investedAmount: 0,
        isCreator: true,
      });
    }

    const memberNameById = new Map<string, string>();
    for (const member of members) {
      const memberId = String(member?.userId || '').trim();
      if (!memberId) continue;
      memberNameById.set(memberId, member?.name || 'Unknown');
    }

    const ledgerNameById = new Map<string, string>();
    for (const ledger of ledgers || []) {
      const ledgerId = String((ledger as any)?._id || '').trim();
      if (!ledgerId) continue;
      ledgerNameById.set(ledgerId, String((ledger as any)?.name || '').trim());
    }

    const approvedSpent = spendings
      .filter((spending: any) => String(spending?.status || '') === 'approved')
      .reduce(
        (sum: number, spending: any) => sum + Number(spending?.amount || 0),
        0,
      );

    const pendingSpent = spendings
      .filter((spending: any) => String(spending?.status || '') === 'pending')
      .reduce(
        (sum: number, spending: any) => sum + Number(spending?.amount || 0),
        0,
      );

    const rejectedSpent = spendings
      .filter((spending: any) => String(spending?.status || '') === 'rejected')
      .reduce(
        (sum: number, spending: any) => sum + Number(spending?.amount || 0),
        0,
      );

    const totalSpent = spendings.reduce(
      (sum: number, spending: any) => sum + Number(spending?.amount || 0),
      0,
    );

    const remainingBudget = Math.max(
      Number(project?.targetAmount || 0) - approvedSpent,
      0,
    );
    const targetAmount = Number(project?.targetAmount || 0);
    const budgetUtilizationPct =
      targetAmount > 0
        ? Number(((approvedSpent / targetAmount) * 100).toFixed(2))
        : 0;
    const averageSpendingAmount =
      spendings.length > 0
        ? Number((totalSpent / spendings.length).toFixed(2))
        : 0;

    const statusStats = [
      {
        status: 'APPROVED',
        count: spendings.filter(
          (spending: any) =>
            String(spending?.status || '').toLowerCase() === 'approved',
        ).length,
        amount: approvedSpent,
      },
      {
        status: 'PENDING',
        count: spendings.filter(
          (spending: any) =>
            String(spending?.status || '').toLowerCase() === 'pending',
        ).length,
        amount: pendingSpent,
      },
      {
        status: 'REJECTED',
        count: spendings.filter(
          (spending: any) =>
            String(spending?.status || '').toLowerCase() === 'rejected',
        ).length,
        amount: rejectedSpent,
      },
    ];

    const memberContributionMap = new Map<
      string,
      { memberName: string; transactionCount: number; amount: number }
    >();
    const categoryTotalsMap = new Map<string, number>();
    const ledgerTotalsMap = new Map<string, number>();

    const spendingRows = spendings
      .slice()
      .sort(
        (first: any, second: any) =>
          new Date(second?.createdAt || 0).getTime() -
          new Date(first?.createdAt || 0).getTime(),
      )
      .map((spending: any) => {
        const approvals = Object.values(spending?.approvals || {});
        const approvedVotes = approvals.filter(
          (vote: any) =>
            String(vote?.status || '').toLowerCase() === 'approved',
        ).length;
        const rejectedVotes = approvals.filter(
          (vote: any) =>
            String(vote?.status || '').toLowerCase() === 'rejected',
        ).length;
        const approvalSummary = `${approvedVotes} approved / ${rejectedVotes} rejected`;

        const addedById = this.getRefId(spending?.addedBy);
        const fundedById = this.getRefId(spending?.fundedBy);
        const ledgerRefId = this.getRefId(spending?.ledger);

        const resolvedAddedByName =
          spending?.addedBy?.name ||
          memberNameById.get(String(addedById || '')) ||
          spending?.addedByName ||
          'Unknown Member';

        const resolvedFundedByName =
          spending?.fundedBy?.name ||
          memberNameById.get(String(fundedById || '')) ||
          spending?.fundedByName ||
          resolvedAddedByName;

        const resolvedLedgerName =
          spending?.ledger?.name ||
          ledgerNameById.get(String(ledgerRefId || '')) ||
          spending?.ledgerName ||
          '';

        const resolvedDate =
          spending?.date ||
          (spending?.createdAt
            ? new Date(spending.createdAt).toISOString().split('T')[0]
            : '');

        const resolvedTime =
          spending?.time ||
          (spending?.createdAt
            ? new Date(spending.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })
            : '');

        return {
          date: resolvedDate,
          time: resolvedTime,
          status: String(spending?.status || '').toUpperCase(),
          category: spending?.category || '',
          description: spending?.description || '',
          amount: Number(spending?.amount || 0),
          ledgerName: resolvedLedgerName,
          subLedger: spending?.subLedger || '',
          addedBy: resolvedAddedByName,
          fundedBy: resolvedFundedByName,
          paidToPerson: spending?.paidTo?.person || '',
          paidToPlace: spending?.paidTo?.place || '',
          materialType: spending?.materialType || '',
          approvalSummary,
        };
      });

    for (const row of spendingRows) {
      const contributor = row.fundedBy || row.addedBy || 'Unassigned';
      const memberAggregate = memberContributionMap.get(contributor) || {
        memberName: contributor,
        transactionCount: 0,
        amount: 0,
      };
      memberAggregate.transactionCount += 1;
      memberAggregate.amount += Number(row.amount || 0);
      memberContributionMap.set(contributor, memberAggregate);

      const categoryKey = row.category || 'Uncategorized';
      categoryTotalsMap.set(
        categoryKey,
        (categoryTotalsMap.get(categoryKey) || 0) + Number(row.amount || 0),
      );

      const ledgerKey = row.ledgerName || 'No Ledger';
      ledgerTotalsMap.set(
        ledgerKey,
        (ledgerTotalsMap.get(ledgerKey) || 0) + Number(row.amount || 0),
      );
    }

    const topMemberContributions = Array.from(memberContributionMap.values())
      .sort((first, second) => second.amount - first.amount)
      .slice(0, 5);

    const topCategoryTotals = Array.from(categoryTotalsMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((first, second) => second.amount - first.amount)
      .slice(0, 5);

    const topLedgerTotals = Array.from(ledgerTotalsMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((first, second) => second.amount - first.amount)
      .slice(0, 5);

    if (exportFormat === 'csv') {
      const overviewRows: Array<[string, string]> = [
        ['SplitFlow Project Details Export', ''],
        ['Generated At', generatedAt.toISOString()],
        ['Project Name', String(project?.name || '')],
        ['Project Description', String(project?.description || '')],
        ['Project Type', String(project?.type || '')],
        ['Project Status', String(project?.status || '').toUpperCase()],
        ['Risk Level', String(project?.riskLevel || '')],
        ['Duration', String(project?.duration || '')],
        ['Target Amount (INR)', Number(project?.targetAmount || 0).toFixed(2)],
        ['Raised Amount (INR)', Number(project?.raisedAmount || 0).toFixed(2)],
        ['Approved Spent (INR)', approvedSpent.toFixed(2)],
        ['Pending Spent (INR)', pendingSpent.toFixed(2)],
        ['Rejected Spent (INR)', rejectedSpent.toFixed(2)],
        ['Total Spent (INR)', totalSpent.toFixed(2)],
        ['Remaining Budget (INR)', remainingBudget.toFixed(2)],
        ['Budget Utilization (%)', budgetUtilizationPct.toFixed(2)],
        ['Average Spending Amount (INR)', averageSpendingAmount.toFixed(2)],
        ['Members Count', String(members.length)],
        ['Ledgers Count', String(ledgers.length)],
        ['Spendings Count', String(spendingRows.length)],
      ];

      const statusSectionHeader = ['Status Analytics', '', '', ''];
      const statusColumns = [
        'Status',
        'Transactions',
        'Amount (INR)',
        'Share (%)',
      ];
      const statusRows = statusStats.map((item) => [
        item.status,
        String(item.count),
        item.amount.toFixed(2),
        totalSpent > 0 ? ((item.amount / totalSpent) * 100).toFixed(2) : '0.00',
      ]);

      const insightHeader = ['Top Insights', '', '', ''];
      const insightColumns = ['Metric', 'Name', 'Value', 'Notes'];
      const insightRows = [
        ...topMemberContributions.map((item) => [
          'Top Contributor',
          item.memberName,
          item.amount.toFixed(2),
          `${item.transactionCount} transactions`,
        ]),
        ...topCategoryTotals.map((item) => [
          'Top Category',
          item.name,
          item.amount.toFixed(2),
          totalSpent > 0
            ? `${((item.amount / totalSpent) * 100).toFixed(2)}% of total spend`
            : '0.00% of total spend',
        ]),
        ...topLedgerTotals.map((item) => [
          'Top Ledger',
          item.name,
          item.amount.toFixed(2),
          totalSpent > 0
            ? `${((item.amount / totalSpent) * 100).toFixed(2)}% of total spend`
            : '0.00% of total spend',
        ]),
      ];

      const memberHeader = ['Members', '', '', '', '', ''];
      const memberColumns = [
        'Name',
        'Email',
        'Role',
        'Invested Amount (INR)',
        'Creator',
        'User ID',
      ];
      const memberRows = members.map((member) => [
        member.name,
        member.email,
        member.role,
        Number(member.investedAmount || 0).toFixed(2),
        member.isCreator ? 'Yes' : 'No',
        member.userId,
      ]);

      const ledgerHeader = ['Ledgers', '', '', ''];
      const ledgerColumns = [
        'Ledger Name',
        'Sub-Ledger Count',
        'Sub-Ledgers',
        'Ledger ID',
      ];
      const ledgerRows = (ledgers || []).map((ledger: any) => [
        ledger?.name || '',
        String((ledger?.subLedgers || []).length),
        (ledger?.subLedgers || []).join(' | '),
        String(ledger?._id || ''),
      ]);

      const spendingHeader = [
        'Spendings',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ];
      const spendingColumns = [
        'Date',
        'Time',
        'Status',
        'Category',
        'Description',
        'Amount (INR)',
        'Ledger',
        'Sub-Ledger',
        'Added By',
        'Funded By',
        'Paid To Person',
        'Paid To Place',
        'Material Type',
        'Approvals',
      ];
      const spendingCsvRows = spendingRows.map((row) => [
        row.date,
        row.time,
        row.status,
        row.category,
        row.description,
        row.amount.toFixed(2),
        row.ledgerName,
        row.subLedger,
        row.addedBy,
        row.fundedBy,
        row.paidToPerson,
        row.paidToPlace,
        row.materialType,
        row.approvalSummary,
      ]);

      const csvSections = [
        ...overviewRows.map((row) =>
          row.map((value) => this.escapeCsvCell(value)).join(','),
        ),
        '',
        statusSectionHeader.map((value) => this.escapeCsvCell(value)).join(','),
        statusColumns.map((value) => this.escapeCsvCell(value)).join(','),
        ...statusRows.map((row) =>
          row.map((value) => this.escapeCsvCell(value)).join(','),
        ),
        '',
        insightHeader.map((value) => this.escapeCsvCell(value)).join(','),
        insightColumns.map((value) => this.escapeCsvCell(value)).join(','),
        ...insightRows.map((row) =>
          row.map((value) => this.escapeCsvCell(value)).join(','),
        ),
        '',
        memberHeader.map((value) => this.escapeCsvCell(value)).join(','),
        memberColumns.map((value) => this.escapeCsvCell(value)).join(','),
        ...memberRows.map((row) =>
          row.map((value) => this.escapeCsvCell(value)).join(','),
        ),
        '',
        ledgerHeader.map((value) => this.escapeCsvCell(value)).join(','),
        ledgerColumns.map((value) => this.escapeCsvCell(value)).join(','),
        ...ledgerRows.map((row) =>
          row.map((value) => this.escapeCsvCell(value)).join(','),
        ),
        '',
        spendingHeader.map((value) => this.escapeCsvCell(value)).join(','),
        spendingColumns.map((value) => this.escapeCsvCell(value)).join(','),
        ...spendingCsvRows.map((row) =>
          row.map((value) => this.escapeCsvCell(value)).join(','),
        ),
      ];

      return {
        format: 'csv',
        mimeType: 'text/csv;charset=utf-8',
        content: `\uFEFF${csvSections.join('\n')}`,
        filename: this.buildProjectExportFileName(project?.name, 'csv'),
      };
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SplitFlow';
    workbook.created = generatedAt;
    workbook.modified = generatedAt;
    workbook.lastModifiedBy = 'SplitFlow Project Intelligence Engine';

    const applyCellBorder = (cell: any) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    };

    const applyTableBorders = (
      sheet: any,
      startRow: number,
      endRow: number,
      startCol: number,
      endCol: number,
    ) => {
      for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
        for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
          applyCellBorder(sheet.getCell(rowIndex, colIndex));
        }
      }
    };

    const overviewSheet = workbook.addWorksheet('Executive Summary');
    overviewSheet.columns = [
      { width: 28 },
      { width: 24 },
      { width: 28 },
      { width: 24 },
      { width: 26 },
      { width: 24 },
      { width: 18 },
    ];
    overviewSheet.mergeCells('A1:G1');
    overviewSheet.getCell('A1').value = 'SplitFlow Project Details Report';
    overviewSheet.getCell('A1').font = {
      bold: true,
      size: 20,
      color: { argb: 'FF1F4E78' },
    };
    overviewSheet.getCell('A1').alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };
    overviewSheet.getRow(1).height = 30;
    overviewSheet.getCell('A2').value =
      `Generated At: ${generatedAt.toISOString()}`;
    overviewSheet.getCell('A2').font = { color: { argb: 'FF4B5563' } };
    overviewSheet.getCell('A3').value =
      `Project: ${project?.name || 'Untitled'} • Status: ${String(project?.status || '').toUpperCase()} • Risk: ${project?.riskLevel || 'N/A'}`;
    overviewSheet.getCell('A3').font = { color: { argb: 'FF6B7280' } };
    overviewSheet.mergeCells('A3:G3');

    const kpiCards = [
      ['Target Amount', targetAmount],
      ['Approved Spent', approvedSpent],
      ['Pending Spent', pendingSpent],
      ['Remaining Budget', remainingBudget],
      ['Budget Utilization %', budgetUtilizationPct],
      ['Average Spend', averageSpendingAmount],
    ];

    let kpiRow = 4;
    for (const [label, value] of kpiCards) {
      overviewSheet.mergeCells(`A${kpiRow}:B${kpiRow}`);
      overviewSheet.mergeCells(`C${kpiRow}:D${kpiRow}`);
      overviewSheet.getCell(`A${kpiRow}`).value = label;
      overviewSheet.getCell(`C${kpiRow}`).value = value;
      overviewSheet.getCell(`A${kpiRow}`).font = {
        bold: true,
        color: { argb: 'FF1F4E78' },
      };
      overviewSheet.getCell(`C${kpiRow}`).font = { bold: true };
      overviewSheet.getCell(`A${kpiRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFF6FF' },
      };
      overviewSheet.getCell(`C${kpiRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };

      if (String(label).includes('%')) {
        overviewSheet.getCell(`C${kpiRow}`).numFmt = '0.00';
      } else {
        overviewSheet.getCell(`C${kpiRow}`).numFmt = '#,##0.00';
      }

      overviewSheet.getCell(`A${kpiRow}`).alignment = { vertical: 'middle' };
      overviewSheet.getCell(`C${kpiRow}`).alignment = {
        horizontal: 'right',
        vertical: 'middle',
      };
      applyCellBorder(overviewSheet.getCell(`A${kpiRow}`));
      applyCellBorder(overviewSheet.getCell(`B${kpiRow}`));
      applyCellBorder(overviewSheet.getCell(`C${kpiRow}`));
      applyCellBorder(overviewSheet.getCell(`D${kpiRow}`));
      overviewSheet.getRow(kpiRow).height = 22;

      kpiRow += 1;
    }

    const overviewData: Array<[string, any]> = [
      ['Project Name', project?.name || ''],
      ['Project Description', project?.description || ''],
      ['Type', project?.type || ''],
      ['Status', String(project?.status || '').toUpperCase()],
      ['Risk Level', project?.riskLevel || ''],
      ['Duration', project?.duration || ''],
      ['Target Amount (INR)', targetAmount],
      ['Raised Amount (INR)', Number(project?.raisedAmount || 0)],
      ['Approved Spent (INR)', approvedSpent],
      ['Pending Spent (INR)', pendingSpent],
      ['Rejected Spent (INR)', rejectedSpent],
      ['Total Spent (INR)', totalSpent],
      ['Remaining Budget (INR)', remainingBudget],
      ['Budget Utilization (%)', budgetUtilizationPct],
      ['Average Spending Amount (INR)', averageSpendingAmount],
      ['Members Count', members.length],
      ['Ledgers Count', ledgers.length],
      ['Spendings Count', spendingRows.length],
    ];

    overviewData.forEach(([label, value], index) => {
      const rowIndex = index + 12;
      overviewSheet.getCell(`A${rowIndex}`).value = label;
      overviewSheet.getCell(`A${rowIndex}`).font = { bold: true };
      overviewSheet.getCell(`B${rowIndex}`).value = value;
      overviewSheet.getCell(`A${rowIndex}`).alignment = { vertical: 'middle' };
      overviewSheet.getCell(`B${rowIndex}`).alignment = {
        horizontal: typeof value === 'number' ? 'right' : 'left',
        vertical: 'middle',
      };
      if (rowIndex % 2 === 0) {
        overviewSheet.getCell(`A${rowIndex}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
        overviewSheet.getCell(`B${rowIndex}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
      applyCellBorder(overviewSheet.getCell(`A${rowIndex}`));
      applyCellBorder(overviewSheet.getCell(`B${rowIndex}`));

      const labelText = String(label);
      if (typeof value === 'number' && labelText.includes('(INR)')) {
        overviewSheet.getCell(`B${rowIndex}`).numFmt = '#,##0.00';
      }
      if (typeof value === 'number' && labelText.includes('(%)')) {
        overviewSheet.getCell(`B${rowIndex}`).numFmt = '0.00';
      }
    });

    overviewSheet.getCell('D12').value = 'Status Breakdown';
    overviewSheet.getCell('D12').font = { bold: true, size: 12 };
    overviewSheet.getCell('D13').value = 'Status';
    overviewSheet.getCell('E13').value = 'Transactions';
    overviewSheet.getCell('F13').value = 'Amount (INR)';
    ['D13', 'E13', 'F13'].forEach((cellRef) => {
      const cell = overviewSheet.getCell(cellRef);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let statusRow = 14;
    for (const item of statusStats) {
      overviewSheet.getCell(`D${statusRow}`).value = item.status;
      overviewSheet.getCell(`E${statusRow}`).value = item.count;
      overviewSheet.getCell(`F${statusRow}`).value = item.amount;
      overviewSheet.getCell(`F${statusRow}`).numFmt = '#,##0.00';
      overviewSheet.getCell(`D${statusRow}`).alignment = {
        horizontal: 'center',
      };
      overviewSheet.getCell(`E${statusRow}`).alignment = {
        horizontal: 'center',
      };
      overviewSheet.getCell(`F${statusRow}`).alignment = {
        horizontal: 'right',
      };
      statusRow += 1;
    }
    applyTableBorders(overviewSheet, 13, Math.max(statusRow - 1, 13), 4, 6);

    overviewSheet.getCell('D19').value = 'Top Contributors';
    overviewSheet.getCell('D19').font = { bold: true, size: 12 };
    overviewSheet.getCell('D20').value = 'Member';
    overviewSheet.getCell('E20').value = 'Transactions';
    overviewSheet.getCell('F20').value = 'Amount (INR)';
    ['D20', 'E20', 'F20'].forEach((cellRef) => {
      const cell = overviewSheet.getCell(cellRef);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let contributorRow = 21;
    for (const item of topMemberContributions) {
      overviewSheet.getCell(`D${contributorRow}`).value = item.memberName;
      overviewSheet.getCell(`E${contributorRow}`).value = item.transactionCount;
      overviewSheet.getCell(`F${contributorRow}`).value = item.amount;
      overviewSheet.getCell(`F${contributorRow}`).numFmt = '#,##0.00';
      overviewSheet.getCell(`E${contributorRow}`).alignment = {
        horizontal: 'center',
      };
      overviewSheet.getCell(`F${contributorRow}`).alignment = {
        horizontal: 'right',
      };
      contributorRow += 1;
    }
    applyTableBorders(
      overviewSheet,
      20,
      Math.max(contributorRow - 1, 20),
      4,
      6,
    );

    overviewSheet.getCell('D27').value = 'Top Categories';
    overviewSheet.getCell('D27').font = { bold: true, size: 12 };
    overviewSheet.getCell('D28').value = 'Category';
    overviewSheet.getCell('E28').value = 'Amount (INR)';
    overviewSheet.getCell('F28').value = 'Share (%)';
    ['D28', 'E28', 'F28'].forEach((cellRef) => {
      const cell = overviewSheet.getCell(cellRef);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0EA5E9' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let categoryRow = 29;
    for (const item of topCategoryTotals) {
      overviewSheet.getCell(`D${categoryRow}`).value = item.name;
      overviewSheet.getCell(`E${categoryRow}`).value = item.amount;
      overviewSheet.getCell(`F${categoryRow}`).value =
        totalSpent > 0
          ? Number(((item.amount / totalSpent) * 100).toFixed(2))
          : 0;
      overviewSheet.getCell(`E${categoryRow}`).numFmt = '#,##0.00';
      overviewSheet.getCell(`F${categoryRow}`).numFmt = '0.00';
      overviewSheet.getCell(`E${categoryRow}`).alignment = {
        horizontal: 'right',
      };
      overviewSheet.getCell(`F${categoryRow}`).alignment = {
        horizontal: 'right',
      };
      categoryRow += 1;
    }
    applyTableBorders(overviewSheet, 28, Math.max(categoryRow - 1, 28), 4, 6);

    overviewSheet.getCell('D35').value = 'Top Ledgers';
    overviewSheet.getCell('D35').font = { bold: true, size: 12 };
    overviewSheet.getCell('D36').value = 'Ledger';
    overviewSheet.getCell('E36').value = 'Amount (INR)';
    overviewSheet.getCell('F36').value = 'Share (%)';
    ['D36', 'E36', 'F36'].forEach((cellRef) => {
      const cell = overviewSheet.getCell(cellRef);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0284C7' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let ledgerRow = 37;
    for (const item of topLedgerTotals) {
      overviewSheet.getCell(`D${ledgerRow}`).value = item.name;
      overviewSheet.getCell(`E${ledgerRow}`).value = item.amount;
      overviewSheet.getCell(`F${ledgerRow}`).value =
        totalSpent > 0
          ? Number(((item.amount / totalSpent) * 100).toFixed(2))
          : 0;
      overviewSheet.getCell(`E${ledgerRow}`).numFmt = '#,##0.00';
      overviewSheet.getCell(`F${ledgerRow}`).numFmt = '0.00';
      overviewSheet.getCell(`E${ledgerRow}`).alignment = {
        horizontal: 'right',
      };
      overviewSheet.getCell(`F${ledgerRow}`).alignment = {
        horizontal: 'right',
      };
      ledgerRow += 1;
    }
    applyTableBorders(overviewSheet, 36, Math.max(ledgerRow - 1, 36), 4, 6);
    overviewSheet.views = [{ state: 'frozen', ySplit: 3 }];
    overviewSheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    };

    const membersSheet = workbook.addWorksheet('Members');
    membersSheet.columns = [
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 14 },
      { header: 'Invested Amount (INR)', key: 'investedAmount', width: 20 },
      { header: 'Creator', key: 'isCreator', width: 12 },
      { header: 'User ID', key: 'userId', width: 28 },
    ];
    members.forEach((member) => {
      membersSheet.addRow({
        ...member,
        isCreator: member.isCreator ? 'Yes' : 'No',
      });
    });
    membersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    membersSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };
    membersSheet.getRow(1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    membersSheet.getRow(1).height = 24;
    membersSheet.getColumn(4).numFmt = '#,##0.00';
    membersSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 6 },
    };
    membersSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        applyCellBorder(cell);
      });

      const roleValue = String(row.getCell(3).text || '').toLowerCase();
      const creatorValue = String(row.getCell(5).text || '').toLowerCase();
      if (creatorValue === 'yes') {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEFF6FF' },
          };
        });
      } else if (roleValue === 'passive') {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFBEB' },
          };
        });
      }

      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          if (!cell.fill) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' },
            };
          }
        });
      }
    });
    const membersTotalRow = membersSheet.addRow({
      name: 'TOTAL MEMBERS',
      role: members.length,
      investedAmount: members.reduce(
        (sum: number, member: any) => sum + Number(member?.investedAmount || 0),
        0,
      ),
    });
    membersTotalRow.font = { bold: true };
    membersTotalRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
      applyCellBorder(cell);
    });
    membersSheet.views = [{ state: 'frozen', ySplit: 1 }];
    membersSheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    const ledgersSheet = workbook.addWorksheet('Ledgers');
    ledgersSheet.columns = [
      { header: 'Ledger Name', key: 'name', width: 24 },
      { header: 'Sub-Ledger Count', key: 'subLedgerCount', width: 18 },
      { header: 'Sub-Ledgers', key: 'subLedgers', width: 46 },
      { header: 'Ledger ID', key: 'ledgerId', width: 28 },
    ];
    (ledgers || []).forEach((ledger: any) => {
      ledgersSheet.addRow({
        name: ledger?.name || '',
        subLedgerCount: (ledger?.subLedgers || []).length,
        subLedgers: (ledger?.subLedgers || []).join(' | '),
        ledgerId: String(ledger?._id || ''),
      });
    });
    ledgersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ledgersSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };
    ledgersSheet.getRow(1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    ledgersSheet.getRow(1).height = 24;
    ledgersSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 4 },
    };
    ledgersSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
        };
        applyCellBorder(cell);
      });
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        });
      }
    });
    const ledgersSummaryRow = ledgersSheet.addRow({
      name: 'TOTAL LEDGERS',
      subLedgerCount: (ledgers || []).reduce(
        (sum: number, ledger: any) =>
          sum + Number((ledger?.subLedgers || []).length),
        0,
      ),
    });
    ledgersSummaryRow.font = { bold: true };
    ledgersSummaryRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
      applyCellBorder(cell);
    });
    ledgersSheet.views = [{ state: 'frozen', ySplit: 1 }];
    ledgersSheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    const spendingsSheet = workbook.addWorksheet('Spendings');
    spendingsSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Time', key: 'time', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Category', key: 'category', width: 12 },
      { header: 'Description', key: 'description', width: 32 },
      { header: 'Amount (INR)', key: 'amount', width: 16 },
      { header: 'Ledger', key: 'ledgerName', width: 20 },
      { header: 'Sub-Ledger', key: 'subLedger', width: 20 },
      { header: 'Added By', key: 'addedBy', width: 20 },
      { header: 'Funded By', key: 'fundedBy', width: 20 },
      { header: 'Paid To Person', key: 'paidToPerson', width: 20 },
      { header: 'Paid To Place', key: 'paidToPlace', width: 20 },
      { header: 'Material Type', key: 'materialType', width: 18 },
      { header: 'Approvals', key: 'approvalSummary', width: 22 },
    ];
    spendingRows.forEach((row) => {
      spendingsSheet.addRow(row);
    });
    spendingsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    spendingsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };
    spendingsSheet.getRow(1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    spendingsSheet.getRow(1).height = 26;
    spendingsSheet.getColumn(6).numFmt = '#,##0.00';
    spendingsSheet.getColumn(5).alignment = { wrapText: true } as any;
    spendingsSheet.getColumn(14).alignment = { wrapText: true } as any;
    spendingsSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 14 },
    };
    spendingsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell) => applyCellBorder(cell));
        return;
      }
      const statusValue = String(row.getCell(3).text || '').toUpperCase();
      row.eachCell((cell) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
        };
        applyCellBorder(cell);
      });
      if (statusValue === 'PENDING') {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFBEB' },
          };
        });
      } else if (statusValue === 'REJECTED') {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF2F2' },
          };
        });
      } else if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        });
      }

      const statusCell = row.getCell(3);
      if (statusValue === 'APPROVED') {
        statusCell.font = { bold: true, color: { argb: 'FF047857' } };
      } else if (statusValue === 'PENDING') {
        statusCell.font = { bold: true, color: { argb: 'FFB45309' } };
      } else if (statusValue === 'REJECTED') {
        statusCell.font = { bold: true, color: { argb: 'FFB91C1C' } };
      }
    });

    const spendingsTotalRow = spendingsSheet.addRow({
      description: 'TOTAL',
      amount: spendingRows.reduce(
        (sum: number, row: any) => sum + Number(row.amount || 0),
        0,
      ),
      approvals: `${spendingRows.length} transactions`,
    });
    spendingsTotalRow.font = { bold: true };
    spendingsTotalRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
      applyCellBorder(cell);
    });
    spendingsTotalRow.getCell(6).numFmt = '#,##0.00';
    spendingsSheet.views = [{ state: 'frozen', ySplit: 1 }];
    spendingsSheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    };

    const workbookBuffer = await workbook.xlsx.writeBuffer();
    return {
      format: 'xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      encoding: 'base64',
      content: Buffer.from(workbookBuffer as ArrayBuffer).toString('base64'),
      filename: this.buildProjectExportFileName(project?.name, 'xlsx'),
    };
  }

  private readonly defaultMarketPrices: Array<{
    name: string;
    price: string;
    trend: string;
    icon: string;
    color: string;
    positive: boolean;
    displayOrder: number;
  }> = [
      {
        name: 'Coconut (Raw)',
        price: '₹28/kg',
        trend: '+5.2%',
        icon: 'tree',
        color: '#00C853',
        positive: true,
        displayOrder: 1,
      },
      {
        name: 'Copra',
        price: '₹12,500/q',
        trend: '+8.1%',
        icon: 'circle-slice-8',
        color: '#00D1B2',
        positive: true,
        displayOrder: 2,
      },
      {
        name: 'Coconut Oil',
        price: '₹185/L',
        trend: '+3.4%',
        icon: 'oil',
        color: '#7C3AED',
        positive: true,
        displayOrder: 3,
      },
      {
        name: 'Rice (Basmati)',
        price: '₹95/kg',
        trend: '+1.2%',
        icon: 'grain',
        color: '#FFB300',
        positive: true,
        displayOrder: 4,
      },
      {
        name: 'Wheat',
        price: '₹32/kg',
        trend: '+2.8%',
        icon: 'barley',
        color: '#5B5CFF',
        positive: true,
        displayOrder: 5,
      },
      {
        name: 'Tomato',
        price: '₹35/kg',
        trend: '-8.0%',
        icon: 'food-apple',
        color: '#FF3D57',
        positive: false,
        displayOrder: 6,
      },
    ];

  private readonly defaultMarketNews: Array<{
    title: string;
    time: string;
    category: string;
    description: string;
    trend: string;
    displayOrder: number;
  }> = [
      {
        title: 'Coconut prices surge 15% in Karnataka',
        time: '2 hours ago',
        category: 'Coconut',
        description:
          'Strong demand from oil mills drives prices higher across southern markets.',
        trend: '+15%',
        displayOrder: 1,
      },
      {
        title: 'Rice exports hit record high',
        time: '5 hours ago',
        category: 'Rice',
        description:
          "India becomes world's largest rice exporter with 22 million tonnes.",
        trend: '+8%',
        displayOrder: 2,
      },
      {
        title: 'Tomato prices stabilize after monsoon',
        time: '8 hours ago',
        category: 'Vegetables',
        description:
          'Supply improves as harvest season begins in major producing states.',
        trend: '-12%',
        displayOrder: 3,
      },
      {
        title: 'New MSP for Rabi crops 2026',
        time: '1 day ago',
        category: 'Policy',
        description:
          'Government announces minimum support prices for wheat, mustard, and gram.',
        trend: 'New',
        displayOrder: 4,
      },
      {
        title: 'Organic farming subsidies doubled',
        time: '1 day ago',
        category: 'Policy',
        description:
          'State government increases support for sustainable agriculture initiatives.',
        trend: 'New',
        displayOrder: 5,
      },
    ];

  private async ensureMarketPricesSeeded(): Promise<void> {
    const total = await this.marketPriceModel.countDocuments({});
    if (total > 0) return;

    await this.marketPriceModel.insertMany(
      this.defaultMarketPrices.map((item) => ({ ...item, isActive: true })),
    );
  }

  private async ensureMarketNewsSeeded(): Promise<void> {
    const total = await this.marketNewsItemModel.countDocuments({});
    if (total > 0) return;

    await this.marketNewsItemModel.insertMany(
      this.defaultMarketNews.map((item) => ({ ...item, isActive: true })),
    );
  }

  private isPrivilegedRole(role?: string): boolean {
    return ['admin', 'project_admin', 'super_admin'].includes(role || '');
  }

  private isProjectMember(project: any, userId: string): boolean {
    const createdById = this.getRefId(project?.createdBy);
    if (createdById === userId) return true;

    const isInvestor = (project?.investors || []).some((inv: any) => {
      const investorId = this.getRefId(inv?.user);
      return investorId === userId;
    });
    if (isInvestor) return true;

    return (project?.pendingInvitations || []).some((inv: any) => {
      const invitedId = this.getRefId(inv?.userId);
      return invitedId === userId;
    });
  }

  private getRefId(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value._id) return value._id.toString();
    if (value.id) return value.id.toString();
    if (typeof value.toString === 'function') return value.toString();
    return '';
  }

  private async getSuperAdmins(): Promise<Array<{ _id: any; name?: string }>> {
    return this.userModel
      .find({ role: 'super_admin' })
      .select('_id name')
      .lean();
  }

  private ensureSuperAdminMembership(
    project: any,
    superAdmins: Array<{ _id: any; name?: string }>,
  ): boolean {
    if (!project) return false;
    if (!project.investors) project.investors = [];

    const existingInvestorIds = new Set(
      (project.investors || [])
        .map((inv: any) => this.getRefId(inv?.user))
        .filter(Boolean),
    );

    let changed = false;
    for (const superAdmin of superAdmins || []) {
      const superAdminId = this.getRefId(superAdmin?._id);
      if (!superAdminId || existingInvestorIds.has(superAdminId)) continue;

      project.investors.push({
        user: superAdminId as any,
        role: 'active',
        investedAmount: 0,
        privacySettings: {
          isAnonymous: false,
          displayName: superAdmin?.name || 'Super Admin',
        },
      } as any);
      existingInvestorIds.add(superAdminId);
      changed = true;
    }

    return changed;
  }

  private sanitizeProjectForResponse(project: any): any {
    if (!project) return project;

    const plainProject =
      typeof project?.toObject === 'function' ? project.toObject() : project;
    const investors = Array.isArray(plainProject?.investors)
      ? plainProject.investors.filter(
        (inv: any) => inv?.user?.role !== 'super_admin',
      )
      : [];

    return {
      ...plainProject,
      investors,
    };
  }

  private assertCanManageMembers(
    project: any,
    actor: { userId: string; role?: string },
  ) {
    if (this.isPrivilegedRole(actor?.role)) return;
    const creatorId = this.getRefId(project?.createdBy);
    if (creatorId !== actor?.userId) {
      throw new ForbiddenException(
        'Only project creator or admins can manage members',
      );
    }
  }

  async create(
    createProjectDto: CreateProjectDto,
    creator: any,
  ): Promise<Project> {
    const creatorId = this.getRefId(
      creator?.userId || creator?.id || creator?._id || creator,
    );
    if (!creatorId) {
      throw new BadRequestException('Creator ID is missing');
    }

    const creatorUser = await this.userModel
      .findById(creatorId)
      .select('name')
      .lean()
      .exec();
    const creatorName = creatorUser?.name || creator?.name || 'Creator';

    const createdProject = new this.projectModel({
      ...createProjectDto,
      createdBy: creatorId,
      investors: [
        {
          user: creatorId,
          role: 'active',
          investedAmount: 0,
          privacySettings: { isAnonymous: false, displayName: creatorName },
        },
      ],
    });
    const saved = await createdProject.save();

    const superAdmins = await this.getSuperAdmins();
    const hasSuperAdminAdded = this.ensureSuperAdminMembership(
      saved,
      superAdmins,
    );
    if (hasSuperAdminAdded) {
      await saved.save();
    }

    return this.projectModel
      .findById(saved._id)
      .populate('investors.user', 'name email role')
      .populate('pendingInvitations.userId', 'name email role')
      .populate('createdBy', 'name email role')
      .exec()
      .then((project) => this.sanitizeProjectForResponse(project)) as any;
  }

  async findAll(
    user: { userId: string; role?: string } | null,
  ): Promise<Project[]> {
    if (!user) return [];

    const query = this.isPrivilegedRole(user.role)
      ? {}
      : {
        $or: [
          { createdBy: user.userId as any },
          { 'investors.user': user.userId as any },
          { 'pendingInvitations.userId': user.userId as any },
        ],
      };

    const projects = await this.projectModel
      .find(query)
      .populate('investors.user', 'name email role')
      .populate('pendingInvitations.userId', 'name email role')
      .populate('createdBy', 'name email role')
      .exec();

    const superAdmins = await this.getSuperAdmins();
    let changed = false;
    for (const project of projects) {
      const projectChanged = this.ensureSuperAdminMembership(
        project,
        superAdmins,
      );
      if (projectChanged) {
        await project.save();
        changed = true;
      }
    }

    if (!changed)
      return projects.map((project) =>
        this.sanitizeProjectForResponse(project),
      );

    const refreshedProjects = await this.projectModel
      .find(query)
      .populate('investors.user', 'name email role')
      .populate('pendingInvitations.userId', 'name email role')
      .populate('createdBy', 'name email role')
      .exec();

    return refreshedProjects.map((project) =>
      this.sanitizeProjectForResponse(project),
    );
  }

  async findOne(
    id: string,
    viewer?: { userId: string; role?: string },
  ): Promise<Project | null> {
    let project = await this.projectModel
      .findById(id)
      .populate('investors.user', 'name email role')
      .populate('pendingInvitations.userId', 'name email role')
      .populate('createdBy', 'name email role')
      .exec();
    if (!project) return null;

    const superAdmins = await this.getSuperAdmins();
    const changed = this.ensureSuperAdminMembership(project, superAdmins);
    if (changed) {
      await project.save();
      project = await this.projectModel
        .findById(id)
        .populate('investors.user', 'name email role')
        .populate('pendingInvitations.userId', 'name email role')
        .populate('createdBy', 'name email role')
        .exec();
      if (!project) return null;
    }

    if (!viewer) return this.sanitizeProjectForResponse(project);
    if (this.isPrivilegedRole(viewer.role))
      return this.sanitizeProjectForResponse(project);

    const hasAccess = this.isProjectMember(project, viewer.userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return this.sanitizeProjectForResponse(project);
  }

  async inviteMember(
    projectId: string,
    userId: string,
    role: string = 'passive',
    actor?: { userId: string; role?: string },
  ) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    if (actor) {
      this.assertCanManageMembers(project, actor);
    }

    const normalizedRole = role === 'active' ? 'active' : 'passive';

    // Check if already an investor
    const isInvestor = (project.investors || []).some(
      (inv) => (inv.user as any).toString() === userId,
    );
    if (isInvestor) throw new BadRequestException('User is already a member');

    // Check if already invited
    if (!project.pendingInvitations) project.pendingInvitations = [];
    const isInvited = project.pendingInvitations.some(
      (inv) => this.getRefId(inv.userId) === userId,
    );
    if (isInvited) throw new BadRequestException('User is already invited');

    const targetUser = await this.userModel
      .findById(userId)
      .select('name')
      .exec();
    if (!targetUser) throw new NotFoundException('User not found');

    project.pendingInvitations.push({
      userId: userId as any,
      role: normalizedRole,
      invitedAt: new Date(),
    });

    await project.save();

    // Create notification
    try {
      const inviterName = actor?.userId
        ? (await this.userModel.findById(actor.userId).select('name').exec())
          ?.name || 'An admin'
        : 'An admin';
      const notification = new this.notificationModel({
        recipient: userId as any,
        title: 'Project Invitation',
        body: `${inviterName} invited you to join ${project.name} as a ${normalizedRole} member.`,
        type: 'invitation',
        payload: { projectId: project._id, role: normalizedRole },
      });
      await notification.save();
    } catch (e) {
      this.logger.error('Failed to create invitation notification', e);
    }

    const saved = await project.save();
    return this.projectModel
      .findById(saved._id)
      .populate('investors.user', 'name email role')
      .populate('pendingInvitations.userId', 'name email role')
      .exec()
      .then((responseProject) =>
        this.sanitizeProjectForResponse(responseProject),
      ) as any;
  }

  async acceptInvitation(
    projectId: string,
    actor: { userId: string; role?: string },
  ) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    if (!project.pendingInvitations) project.pendingInvitations = [];

    const invitationIndex = project.pendingInvitations.findIndex(
      (inv) => this.getRefId(inv.userId) === actor.userId,
    );

    if (invitationIndex === -1) {
      throw new NotFoundException('Invitation not found');
    }

    const invitation = project.pendingInvitations[invitationIndex];

    // Add to project
    const targetUser = await this.userModel
      .findById(actor.userId)
      .select('name')
      .exec();
    if (!targetUser) throw new NotFoundException('User not found');

    if (!project.investors) project.investors = [];

    // Safety check just in case
    const isInvestor = project.investors.some(
      (inv) => (inv.user as any).toString() === actor.userId,
    );

    if (!isInvestor) {
      project.investors.push({
        user: actor.userId as any,
        role: invitation.role,
        investedAmount: 0,
        privacySettings: {
          isAnonymous: false,
          displayName: targetUser.name || 'Member',
        },
      });
    }

    // Remove from pending
    project.pendingInvitations.splice(invitationIndex, 1);

    const saved = await project.save();
    return this.projectModel
      .findById(saved._id)
      .populate('investors.user', 'name email role')
      .populate('pendingInvitations.userId', 'name email role')
      .exec()
      .then((responseProject) =>
        this.sanitizeProjectForResponse(responseProject),
      ) as any;
  }

  async declineInvitation(
    projectId: string,
    actor: { userId: string; role?: string },
  ) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    if (!project.pendingInvitations) project.pendingInvitations = [];

    const invitationIndex = project.pendingInvitations.findIndex(
      (inv) => this.getRefId(inv.userId) === actor.userId,
    );

    if (invitationIndex !== -1) {
      project.pendingInvitations.splice(invitationIndex, 1);
      await project.save();
    }

    return { success: true };
  }

  async addMember(
    projectId: string,
    userId: string,
    role: string = 'passive',
    actor?: { userId: string; role?: string },
  ) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    if (actor) {
      this.assertCanManageMembers(project, actor);
    }

    const normalizedRole = role === 'active' ? 'active' : 'passive';

    if (!project.investors) project.investors = [];

    const exists = project.investors.some(
      (inv) => (inv.user as any).toString() === userId,
    );
    if (exists) throw new BadRequestException('User already a member');

    const targetUser = await this.userModel
      .findById(userId)
      .select('name')
      .exec();
    if (!targetUser) throw new NotFoundException('User not found');

    project.investors.push({
      user: userId as any,
      role: normalizedRole,
      investedAmount: 0,
      privacySettings: {
        isAnonymous: false,
        displayName: targetUser.name || 'Member',
      },
    });

    const saved = await project.save();
    return saved
      .populate('investors.user', 'name email role')
      .then((responseProject) =>
        this.sanitizeProjectForResponse(responseProject),
      );
  }

  async removeMember(
    projectId: string,
    userId: string,
    actor?: { userId: string; role?: string },
  ) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    if (actor) {
      this.assertCanManageMembers(project, actor);
    }

    const creatorId = this.getRefId(project?.createdBy);
    if (creatorId === userId) {
      throw new BadRequestException('Project creator cannot be removed');
    }

    const targetUser = await this.userModel
      .findById(userId)
      .select('role')
      .lean()
      .exec();
    if (targetUser?.role === 'super_admin') {
      throw new BadRequestException(
        'Super admin cannot be removed from project',
      );
    }

    const beforeCount = project.investors?.length || 0;

    if (project.investors) {
      project.investors = project.investors.filter(
        (inv) => (inv.user as any).toString() !== userId,
      );
    }

    if ((project.investors?.length || 0) === beforeCount) {
      throw new NotFoundException('Investor not found in project');
    }

    const saved = await project.save();
    return saved
      .populate('investors.user', 'name email role')
      .then((responseProject) =>
        this.sanitizeProjectForResponse(responseProject),
      );
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: string,
    actor?: { userId: string; role?: string },
  ) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    if (actor) {
      this.assertCanManageMembers(project, actor);
    }

    const normalizedRole = role === 'active' ? 'active' : 'passive';

    const investor = project.investors?.find(
      (inv) => (inv.user as any).toString() === userId,
    );
    if (!investor) throw new NotFoundException('Investor not found in project');

    const targetUser = await this.userModel
      .findById(userId)
      .select('role')
      .lean()
      .exec();
    if (targetUser?.role === 'super_admin' && normalizedRole !== 'active') {
      throw new BadRequestException('Super admin must remain active');
    }

    const creatorId = this.getRefId(project?.createdBy);
    if (creatorId === userId && normalizedRole !== 'active') {
      throw new BadRequestException('Project creator must remain active');
    }

    investor.role = normalizedRole;

    const saved = await project.save();
    return saved
      .populate('investors.user', 'name email role')
      .then((responseProject) =>
        this.sanitizeProjectForResponse(responseProject),
      );
  }

  async getInviteCandidates(
    projectId: string,
    actor: { userId: string; role?: string },
  ) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    this.assertCanManageMembers(project, actor);

    const existingUserIds = [
      this.getRefId(project?.createdBy),
      ...(project?.investors || []).map((inv: any) => this.getRefId(inv?.user)),
    ].filter(Boolean);

    return this.userModel
      .find({
        _id: { $nin: existingUserIds as any },
        role: { $ne: 'guest' },
      })
      .select('name email role')
      .sort({ name: 1 })
      .lean();
  }

  async update(
    id: string,
    updateDto: any,
    actor?: { userId: string; role?: string },
  ): Promise<Project | null> {
    const oldProject = await this.projectModel.findById(id);
    if (!oldProject) throw new NotFoundException('Project not found');

    if (actor && !this.isPrivilegedRole(actor.role)) {
      const creatorId = this.getRefId(oldProject.createdBy);
      if (creatorId !== actor.userId) {
        throw new ForbiddenException(
          'Only project creator or admins can update this project',
        );
      }
    }

    if (updateDto.status && oldProject.status !== updateDto.status) {
      const allowed =
        this.VALID_TRANSITIONS[oldProject.status as ProjectStatus];
      if (!allowed?.includes(updateDto.status)) {
        throw new BadRequestException(
          `Invalid state transition from ${oldProject.status} to ${updateDto.status}`,
        );
      }
    }

    const updated = await this.projectModel
      .findByIdAndUpdate(id, updateDto, { returnDocument: 'after' })
      .exec();

    if (
      updated &&
      updateDto.status &&
      oldProject &&
      oldProject.status !== updated.status
    ) {
      // Log Activity
      try {
        const activity = new this.notificationModel({
          recipient: updated.createdBy as any, // Admin/Creator
          title: 'Project Status Updated',
          body: `Project "${updated.name}" is now ${updated.status}`,
          type: 'activity',
          payload: { projectId: updated._id },
        });
        await activity.save();
      } catch (e) {
        this.logger.error('Failed to emit activity log', e);
      }
    }
    return updated;
  }

  async getMarketPrices() {
    await this.ensureMarketPricesSeeded();

    return this.marketPriceModel
      .find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean()
      .exec();
  }

  async getNews() {
    await this.ensureMarketNewsSeeded();

    return this.marketNewsItemModel
      .find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean()
      .exec();
  }

  async updateMarketPrice(id: string, updateDto: UpdateMarketPriceDto) {
    const updated = await this.marketPriceModel
      .findByIdAndUpdate(id, updateDto, { returnDocument: 'after' })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Market price item not found');
    }

    return updated;
  }

  async updateNewsItem(id: string, updateDto: UpdateMarketNewsItemDto) {
    const updated = await this.marketNewsItemModel
      .findByIdAndUpdate(id, updateDto, { returnDocument: 'after' })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Market news item not found');
    }

    return updated;
  }
}
