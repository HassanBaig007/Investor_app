import { ProjectsService } from '../projects/projects.service';
export declare class ProjectAnalyticsService {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    getPortfolioAnalytics(userId: string): Promise<{
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
}
