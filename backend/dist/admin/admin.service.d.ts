import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
export declare class AdminService {
    private readonly projectsService;
    private readonly usersService;
    constructor(projectsService: ProjectsService, usersService: UsersService);
    getStats(): Promise<{
        activeProjects: number;
        totalAUM: number;
        fundingProgress: number;
        totalInvestors: number;
        pendingApprovals: number;
        monthlyGrowth: number;
    }>;
}
