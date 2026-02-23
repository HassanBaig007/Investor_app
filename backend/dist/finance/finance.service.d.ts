import { Model, Types } from 'mongoose';
import { SpendingDocument, Ledger } from './schemas/finance.schema';
import { ProjectsService } from '../projects/projects.service';
import { NotificationService } from '../notifications/notifications.service';
export declare class FinanceService {
    private readonly spendingModel;
    private readonly ledgerModel;
    private readonly projectsService;
    private readonly notificationService;
    constructor(spendingModel: Model<SpendingDocument>, ledgerModel: Model<Ledger>, projectsService: ProjectsService, notificationService: NotificationService);
    private getId;
    private isPrivilegedRole;
    private getActorId;
    private parseStatusFilter;
    private getSpendingDateString;
    private resolveProductAndSubLedger;
    private resolveDetailMode;
    private buildSpendingDetailDisplay;
    private buildDateRangeQuery;
    private escapeCsvCell;
    private getApprovalSummary;
    private buildEnrichedApprovals;
    private buildApprovalParticipants;
    private logApprovalMismatchIfNeeded;
    private enrichSpendingForResponse;
    private matchesSpendingFilters;
    private getApprovalEligibleInvestors;
    private getSuperAdminMemberIds;
    private getMemberNameMap;
    private buildSpendingResponse;
    private assertProjectAccess;
    private assertProjectWriteAccess;
    private ensurePositiveSpendingAmount;
    private ensureProjectHasSpendingCapacity;
    private ensureUserCanAddSpending;
    private getProjectMemberIds;
    private resolveFundedByUserId;
    private buildFundedAccountQuery;
    private normalizeSpendingInput;
    private validateCategorySpecificFields;
    private resolveSpendingLedgerId;
    private createInitialApprovals;
    private notifyPendingSpending;
    private assertVoteAllowed;
    private ensureUserCanVote;
    private ensureApprovalsMap;
    private countApprovedVotes;
    private notifyRejectedSpending;
    private notifyApprovedSpending;
    private countApprovedEligibleVotes;
    private autoApprovePendingSpendings;
    private getAccessibleProjectIds;
    private createMyExpensesBaseQuery;
    private applyProjectFilterToMyExpenses;
    private applyLedgerFilterToMyExpenses;
    private applyOptionalFiltersToMyExpenses;
    private mapExpenses;
    private emptyExpenseAnalytics;
    private buildExpenseAnalyticsQuery;
    private aggregateExpenseAnalytics;
    private buildCategoryBreakdown;
    private buildMonthlyTrend;
    private buildProjectBreakdown;
    addSpending(createSpendingDto: any, user: any): Promise<any>;
    voteSpending(spendingId: string, userId: string, vote: 'approved' | 'rejected', user?: any): Promise<any>;
    findAll(projectId: string, user: any, filters?: {
        ownerUserId?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<any[]>;
    searchSpendings(projectId: string, user: any, opts?: {
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        spendings: any[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    createLedger(createLedgerDto: any, user: any): Promise<import("mongoose").Document<unknown, {}, Ledger, {}, import("mongoose").DefaultSchemaOptions> & Ledger & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    findAllLedgers(projectId: string, user: any): Promise<(import("mongoose").Document<unknown, {}, Ledger, {}, import("mongoose").DefaultSchemaOptions> & Ledger & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
    findOneLedger(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, Ledger, {}, import("mongoose").DefaultSchemaOptions> & Ledger & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    updateLedger(id: string, updateDto: any, user: any): Promise<import("mongoose").Document<unknown, {}, Ledger, {}, import("mongoose").DefaultSchemaOptions> & Ledger & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    deleteLedger(id: string, user: any): Promise<{
        deleted: boolean;
    }>;
    getMyExpenses(user: any, filters?: {
        fromDate?: string;
        toDate?: string;
        category?: string;
        projectId?: string;
        ledgerId?: string;
        subLedger?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        expenses: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getExpenseAnalytics(user: any, filters?: {
        fromDate?: string;
        toDate?: string;
    }): Promise<{
        totalSpent: number;
        approvedSpent: number;
        pendingSpent: number;
        dailyAverage: number;
        categoryBreakdown: {
            category: string;
            amount: number;
            percentage: number;
        }[];
        monthlyTrend: {
            month: string;
            amount: number;
        }[];
        projectBreakdown: {
            projectId: string;
            projectName: string;
            amount: number;
        }[];
    }>;
    getMyPendingApprovals(user: any): Promise<{
        approvals: ({
            id: string;
            type: string;
            title: string;
            projectId: string;
            projectName: any;
            proposedAt: any;
            amount: number;
            status: string;
        } | null)[];
        total: number;
    }>;
    getSpendingSummary(projectId: string, user: any): Promise<{
        projectId: string;
        projectName: any;
        totalSpent: number;
        approvedSpent: number;
        pendingSpent: number;
        rejectedSpent: number;
        approvedCount: number;
        pendingCount: number;
        rejectedCount: number;
        spendingCount: number;
        targetAmount: any;
        remaining: number;
    }>;
    getBulkSpendingSummary(projectIds: string[], user: any): Promise<{
        summaries: any[];
    }>;
    exportExpenses(user: any, format?: string, filters?: {
        fromDate?: string;
        toDate?: string;
        projectId?: string;
        ledgerId?: string;
        subLedger?: string;
    }): Promise<{
        format: string;
        mimeType: string;
        content: string;
        filename: string;
        encoding?: undefined;
    } | {
        format: string;
        mimeType: string;
        encoding: string;
        content: string;
        filename: string;
    }>;
    private buildFilterFileSuffix;
    private getDaysBetween;
}
