import { Model } from 'mongoose';
import { ModificationRequestDocument } from './schemas/modification-request.schema';
import { ProjectsService } from '../projects/projects.service';
import { NotificationService } from '../notifications/notifications.service';
export declare class ModificationsService {
    private readonly modificationModel;
    private readonly projectsService;
    private readonly notificationService;
    constructor(modificationModel: Model<ModificationRequestDocument>, projectsService: ProjectsService, notificationService: NotificationService);
    private getId;
    private getVotesObject;
    private getVoteSummary;
    private normalizeModification;
    create(createDto: any, user: any): Promise<any>;
    vote(modId: string, userId: string, vote: 'approved' | 'rejected', reason?: string, user?: any): Promise<any>;
    findAll(projectId: string, user?: {
        userId: string;
        role?: string;
    }): Promise<any[]>;
}
