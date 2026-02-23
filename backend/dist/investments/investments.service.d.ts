import { Model } from 'mongoose';
import { ProjectDocument } from '../projects/schemas/project.schema';
export declare class InvestmentsService {
    private readonly projectModel;
    constructor(projectModel: Model<ProjectDocument>);
    private getExpectedEndDate;
    private buildInvestment;
    private getQuarterPeriods;
    private hasInvestmentBeforeDate;
    private isCurrentQuarter;
    private buildQuarterlyReport;
    getQuarterlyReports(userId: string): Promise<any[]>;
    getQuarterlyReportDownload(userId: string, reportId: string, format?: string): Promise<{
        format: string;
        mimeType: string;
        filename: string;
        content: string;
    }>;
    getPortfolio(userId: string): Promise<{
        totalInvested: number;
        currentValue: number;
        returns: number;
        returnsPercent: number;
        lastUpdated: string;
    }>;
    getInvestments(userId: string): Promise<{
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
    getInvestmentById(id: string, userId: string): Promise<{
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
    getPerformanceMetrics(userId: string, period?: string): Promise<{
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
}
