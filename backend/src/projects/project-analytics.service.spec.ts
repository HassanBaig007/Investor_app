import { ProjectAnalyticsService } from './project-analytics.service';

describe('ProjectAnalyticsService', () => {
  let service: ProjectAnalyticsService;
  let projectsService: { findAll: jest.Mock };

  beforeEach(() => {
    projectsService = {
      findAll: jest.fn(),
    };
    service = new ProjectAnalyticsService(projectsService as any);
  });

  it('builds portfolio analytics from project data', async () => {
    projectsService.findAll.mockResolvedValue([
      {
        type: 'agri',
        status: 'active',
        raisedAmount: 1000,
        currentValuation: 1200,
        targetAmount: 1500,
      },
      {
        type: 'real-estate',
        status: 'funding',
        raisedAmount: 500,
        currentValuation: 700,
        targetAmount: 900,
      },
    ]);

    const result = await service.getPortfolioAnalytics('u1');

    expect(projectsService.findAll).toHaveBeenCalledWith({
      userId: 'u1',
      role: 'investor',
    });
    expect(result.totalValuation).toBe(1900);
    expect(result.totalInvested).toBe(1500);
    expect(result.activeProjects).toBe(1);
    expect(result.monthlyReturns).toHaveLength(12);
    expect(result.assetAllocation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'agri', value: 1000 }),
        expect.objectContaining({ name: 'real-estate', value: 500 }),
      ]),
    );
  });

  it('returns zeroed returns curve when invested amount is zero', async () => {
    projectsService.findAll.mockResolvedValue([
      {
        type: 'agri',
        status: 'pending',
        raisedAmount: 0,
        currentValuation: 0,
        targetAmount: 0,
      },
    ]);

    const result = await service.getPortfolioAnalytics('u2');

    expect(result.totalInvested).toBe(0);
    expect(result.monthlyReturns.every((row: any) => row.return === 0)).toBe(
      true,
    );
  });
});
