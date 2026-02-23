import { FinanceService } from './finance.service';
import { CreateSpendingDto } from './dto/create-spending.dto';
type AuthRequest = {
    user: {
        userId: string;
        role?: string;
    };
};
export declare class FinanceController {
    private readonly financeService;
    constructor(financeService: FinanceService);
    addSpending(req: AuthRequest, createSpendingDto: CreateSpendingDto): Promise<any>;
    voteSpending(req: AuthRequest, id: string, vote: 'approved' | 'rejected'): Promise<any>;
    searchSpendings(req: AuthRequest, projectId: string, search?: string, status?: string, page?: string, limit?: string): Promise<{
        spendings: any[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    findAll(req: AuthRequest, projectId: string, ownerUserId?: string, status?: string, fromDate?: string, toDate?: string): Promise<any[]>;
    createLedger(req: AuthRequest, createLedgerDto: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/finance.schema").Ledger, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/finance.schema").Ledger & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    findAllLedgers(req: AuthRequest, projectId: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/finance.schema").Ledger, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/finance.schema").Ledger & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
    findOneLedger(req: AuthRequest, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/finance.schema").Ledger, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/finance.schema").Ledger & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    updateLedger(req: AuthRequest, id: string, updateDto: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/finance.schema").Ledger, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/finance.schema").Ledger & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    deleteLedger(req: AuthRequest, id: string): Promise<{
        deleted: boolean;
    }>;
    getMyExpenses(req: AuthRequest, query?: {
        fromDate?: string;
        toDate?: string;
        category?: string;
        projectId?: string;
        ledgerId?: string;
        subLedger?: string;
        page?: string;
        limit?: string;
    }): Promise<{
        expenses: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getExpenseAnalytics(req: AuthRequest, fromDate?: string, toDate?: string): Promise<{
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
    getMyPendingApprovals(req: AuthRequest): Promise<{
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
    getSpendingSummary(req: AuthRequest, projectId: string): Promise<{
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
    getBulkSpendingSummary(req: AuthRequest, projectIdsParam?: string): Promise<{
        summaries: any[];
    }>;
    exportExpenses(req: AuthRequest, query?: {
        format?: string;
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
}
export {};
