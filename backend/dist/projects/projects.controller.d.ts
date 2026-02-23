import { ProjectsService } from './projects.service';
import { ProjectAnalyticsService } from './project-analytics.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateMarketPriceDto } from './dto/update-market-price.dto';
import { UpdateMarketNewsItemDto } from './dto/update-market-news-item.dto';
export declare const Roles: (...roles: string[]) => import("@nestjs/common").CustomDecorator<string>;
export declare class ProjectsController {
    private readonly projectsService;
    private readonly analyticsService;
    constructor(projectsService: ProjectsService, analyticsService: ProjectAnalyticsService);
    getAnalytics(req: any): Promise<{
        totalValuation: number;
        totalInvested: number;
        activeProjects: number;
        monthlyReturns: {
            month: number;
            return: number;
        }[];
        assetAllocation: {
            name: string;
            value: number;
        }[];
    }>;
    create(req: any, createProjectDto: CreateProjectDto): Promise<import("./schemas/project.schema").Project>;
    findAll(req: any): Promise<import("./schemas/project.schema").Project[]>;
    getProjectTypes(): {
        id: string;
        label: string;
        icon: string;
    }[];
    getRiskLevels(): {
        id: string;
        label: string;
        color: string;
    }[];
    getMarketPrices(): Promise<(import("./schemas/market-price.schema").MarketPrice & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getNews(): Promise<(import("./schemas/market-news-item.schema").MarketNewsItem & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    updateMarketPrice(id: string, updateDto: UpdateMarketPriceDto): Promise<import("./schemas/market-price.schema").MarketPrice & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateNewsItem(id: string, updateDto: UpdateMarketNewsItemDto): Promise<import("./schemas/market-news-item.schema").MarketNewsItem & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    exportProjectDetails(id: string, req: any, format?: string): Promise<{
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
    findOne(id: string, req: any): Promise<import("./schemas/project.schema").Project | null>;
    addMember(req: any, id: string, userId: string, role: string): Promise<any>;
    removeMember(req: any, id: string, userId: string): Promise<any>;
    updateMemberRole(req: any, id: string, userId: string, role: string): Promise<any>;
    getInviteCandidates(req: any, id: string): Promise<any[]>;
    inviteMember(req: any, id: string, userId: string, role: string): Promise<any>;
    acceptInvitation(req: any, id: string): Promise<any>;
    declineInvitation(req: any, id: string): Promise<{
        success: boolean;
    }>;
    update(req: any, id: string, updateDto: any): Promise<import("./schemas/project.schema").Project | null>;
}
