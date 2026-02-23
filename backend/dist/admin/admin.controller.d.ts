import { AdminService } from './admin.service';
export declare const Roles: (...roles: string[]) => import("@nestjs/common").CustomDecorator<string>;
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getStats(): Promise<{
        activeProjects: number;
        totalAUM: number;
        fundingProgress: number;
        totalInvestors: number;
        pendingApprovals: number;
        monthlyGrowth: number;
    }>;
}
