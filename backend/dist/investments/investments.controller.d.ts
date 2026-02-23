import { Request } from 'express';
import { InvestmentsService } from './investments.service';
type AuthenticatedRequest = Request & {
    user: {
        userId: string;
    };
};
export declare class InvestmentsController {
    private readonly investmentsService;
    constructor(investmentsService: InvestmentsService);
    getPortfolio(req: AuthenticatedRequest): Promise<{
        totalInvested: number;
        currentValue: number;
        returns: number;
        returnsPercent: number;
        lastUpdated: string;
    }>;
    getInvestments(req: AuthenticatedRequest): Promise<{
        id: string;
        projectId: any;
        name: any;
        type: any;
        invested: any;
        currentValue: number;
        returns: number;
        returnsPercent: number;
        status: any;
        progress: number;
        startDate: any;
        expectedEndDate: string | null;
    }[]>;
    getQuarterlyReports(req: AuthenticatedRequest): Promise<any[]>;
    downloadQuarterlyReport(req: AuthenticatedRequest, reportId: string, format?: string): Promise<{
        format: string;
        mimeType: string;
        filename: string;
        content: string;
    }>;
    getPerformanceMetrics(req: AuthenticatedRequest, period?: string): Promise<{
        period: string;
        hasData: boolean;
        message: string;
        metrics: null;
        chartData: never[];
        hasHistoricalData?: undefined;
        portfolio?: undefined;
    } | {
        period: string;
        hasData: boolean;
        hasHistoricalData: boolean;
        message: string | undefined;
        metrics: {
            cagr: number;
            returnsPercent: number;
            totalReturns: number;
            sharpeRatio: number | null;
            maxDrawdown: number | null;
            volatility: number | null;
        };
        chartData: {
            label: any;
            value: number;
        }[];
        portfolio: {
            totalInvested: number;
            currentValue: number;
            returns: number;
            returnsPercent: number;
        };
    }>;
    getInvestmentById(id: string, req: AuthenticatedRequest): Promise<{
        id: string;
        projectId: any;
        name: any;
        type: any;
        invested: any;
        currentValue: number;
        returns: number;
        returnsPercent: number;
        status: any;
        progress: number;
        startDate: any;
        expectedEndDate: string | null;
    }>;
}
export {};
