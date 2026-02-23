import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ProjectAnalyticsService {
  constructor(private readonly projectsService: ProjectsService) {}

  async getPortfolioAnalytics(userId: string) {
    const projects = await this.projectsService.findAll({
      userId,
      role: 'investor',
    });

    const totalAUM = projects.reduce(
      (sum, p) => sum + (p.raisedAmount || 0),
      0,
    );
    const totalCurrentValue = projects.reduce(
      (sum, p) => sum + (p.currentValuation || p.targetAmount || 0),
      0,
    );
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const totalInvested = totalAUM;
    const returnsPercent =
      totalInvested > 0
        ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
        : 0;

    const monthlyReturns = new Array(12).fill(0).map((_, index) => {
      const month = index + 1;
      const trend = returnsPercent / 12;
      return {
        month,
        return: Number((trend * month).toFixed(2)),
      };
    });

    const byType = projects.reduce(
      (acc, project) => {
        const key = project.type || 'other';
        acc[key] = (acc[key] || 0) + (project.raisedAmount || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    const assetAllocation = Object.entries(byType).map(([name, value]) => ({
      name,
      value: Number(value.toFixed ? value.toFixed(2) : value),
    }));

    return {
      totalValuation: totalCurrentValue,
      totalInvested,
      activeProjects,
      monthlyReturns,
      assetAllocation,
    };
  }
}
