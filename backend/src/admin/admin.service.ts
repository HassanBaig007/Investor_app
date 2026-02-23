import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
  ) {}

  async getStats() {
    const projects = await this.projectsService.findAll({
      userId: '',
      role: 'super_admin',
    }); // Admin sees all

    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const totalRaised = projects.reduce(
      (sum, p) => sum + (p.raisedAmount || 0),
      0,
    );
    const totalTarget = projects.reduce(
      (sum, p) => sum + (p.targetAmount || 0),
      0,
    );

    const totalInvestors = await this.usersService.countInvestors();

    // Count actual pending investor requests across all projects
    const pendingApprovals = projects.reduce((sum, p) => {
      return (
        sum + (p.investors?.filter((i) => i.role === 'pending').length || 0)
      );
    }, 0);

    return {
      activeProjects,
      totalAUM: totalRaised,
      fundingProgress: totalTarget > 0 ? (totalRaised / totalTarget) * 100 : 0,
      totalInvestors,
      pendingApprovals,
      monthlyGrowth:
        totalTarget > 0
          ? Number(((totalRaised / totalTarget) * 100).toFixed(1))
          : 0, // Derived from actual funding progress
    };
  }
}
