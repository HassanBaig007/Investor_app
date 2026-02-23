import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { MarketPrice, MarketPriceDocument } from './schemas/market-price.schema';
import { MarketNewsItem, MarketNewsItemDocument } from './schemas/market-news-item.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateMarketPriceDto } from './dto/update-market-price.dto';
import { UpdateMarketNewsItemDto } from './dto/update-market-news-item.dto';
import { SpendingDocument, LedgerDocument } from '../finance/schemas/finance.schema';
export declare class ProjectsService {
    private readonly projectModel;
    private readonly marketPriceModel;
    private readonly marketNewsItemModel;
    private readonly userModel;
    private readonly notificationModel;
    private readonly spendingModel;
    private readonly ledgerModel;
    private readonly logger;
    private readonly VALID_TRANSITIONS;
    constructor(projectModel: Model<ProjectDocument>, marketPriceModel: Model<MarketPriceDocument>, marketNewsItemModel: Model<MarketNewsItemDocument>, userModel: Model<any>, notificationModel: Model<any>, spendingModel: Model<SpendingDocument>, ledgerModel: Model<LedgerDocument>);
    private escapeCsvCell;
    private getActorContext;
    private buildProjectExportFileName;
    exportProjectDetails(projectId: string, user: any, format?: string): Promise<{
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
    private readonly defaultMarketPrices;
    private readonly defaultMarketNews;
    private ensureMarketPricesSeeded;
    private ensureMarketNewsSeeded;
    private isPrivilegedRole;
    private isProjectMember;
    private getRefId;
    private getSuperAdmins;
    private ensureSuperAdminMembership;
    private sanitizeProjectForResponse;
    private assertCanManageMembers;
    create(createProjectDto: CreateProjectDto, creator: any): Promise<Project>;
    findAll(user: {
        userId: string;
        role?: string;
    } | null): Promise<Project[]>;
    findOne(id: string, viewer?: {
        userId: string;
        role?: string;
    }): Promise<Project | null>;
    inviteMember(projectId: string, userId: string, role?: string, actor?: {
        userId: string;
        role?: string;
    }): Promise<any>;
    acceptInvitation(projectId: string, actor: {
        userId: string;
        role?: string;
    }): Promise<any>;
    declineInvitation(projectId: string, actor: {
        userId: string;
        role?: string;
    }): Promise<{
        success: boolean;
    }>;
    addMember(projectId: string, userId: string, role?: string, actor?: {
        userId: string;
        role?: string;
    }): Promise<any>;
    removeMember(projectId: string, userId: string, actor?: {
        userId: string;
        role?: string;
    }): Promise<any>;
    updateMemberRole(projectId: string, userId: string, role: string, actor?: {
        userId: string;
        role?: string;
    }): Promise<any>;
    getInviteCandidates(projectId: string, actor: {
        userId: string;
        role?: string;
    }): Promise<any[]>;
    update(id: string, updateDto: any, actor?: {
        userId: string;
        role?: string;
    }): Promise<Project | null>;
    getMarketPrices(): Promise<(MarketPrice & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getNews(): Promise<(MarketNewsItem & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    updateMarketPrice(id: string, updateDto: UpdateMarketPriceDto): Promise<MarketPrice & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateNewsItem(id: string, updateDto: UpdateMarketNewsItemDto): Promise<MarketNewsItem & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
