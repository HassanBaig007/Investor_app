import { ModificationsService } from './modifications.service';
export declare class ModificationsController {
    private readonly modificationsService;
    constructor(modificationsService: ModificationsService);
    create(req: any, createDto: any): Promise<any>;
    vote(req: any, id: string, vote: 'approved' | 'rejected', reason?: string): Promise<any>;
    approve(req: any, id: string): Promise<any>;
    reject(req: any, id: string, reason: string): Promise<any>;
    findAll(req: any, projectId: string): Promise<any[]>;
}
