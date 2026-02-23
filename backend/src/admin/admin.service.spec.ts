import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/projects.service';
import { ModificationsService } from '../modifications/modifications.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockUsersService = {
    countInvestors: jest.fn(),
  };

  const mockProjectsService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: ModificationsService, useValue: {} },
        { provide: getModelToken('AppConfig'), useValue: {} },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // getStats
  // ═══════════════════════════════════════════════════════════════════
  describe('getStats', () => {
    it('calculates global platform statistics correctly', async () => {
      // Mock 5 total investors
      mockUsersService.countInvestors.mockResolvedValue(5);

      // Mock 2 projects
      const mockProjects = [
        {
          status: 'active',
          raisedAmount: 50000,
          targetAmount: 100000, // 50% funded
          investors: [
            { role: 'active' },
            { role: 'pending' },
            { role: 'pending' },
          ],
        },
        {
          status: 'draft',
          raisedAmount: 10000,
          targetAmount: 200000, // 5% funded
          investors: [{ role: 'pending' }],
        },
      ];

      mockProjectsService.findAll.mockResolvedValue(mockProjects);

      const stats = await service.getStats();

      // Ensure admin uses super_admin role to fetch EVERYTHING
      expect(mockProjectsService.findAll).toHaveBeenCalledWith({
        userId: '',
        role: 'super_admin',
      });

      // Active projects only count 'active'
      expect(stats.activeProjects).toBe(1);

      // Total AUM = 50k + 10k = 60k
      expect(stats.totalAUM).toBe(60000);

      // Funding Progress = (60k / 300k) * 100 = 20%
      expect(stats.fundingProgress).toBe(20);
      expect(stats.monthlyGrowth).toBe(20);

      expect(stats.totalInvestors).toBe(5);

      // Pending Approvals = 2 from p1 + 1 from p2 = 3
      expect(stats.pendingApprovals).toBe(3);
    });

    it.each(
      Array.from({ length: 35 }, (_, i) => [
        i * 1000, // totalRaised
        i * 2000, // totalTarget
        i + 5, // investorCount
      ]),
    )(
      'stats variation #%#: raised %i target %i investors %i',
      async (raised, target, invCount) => {
        mockUsersService.countInvestors.mockResolvedValue(invCount);
        mockProjectsService.findAll.mockResolvedValue([
          {
            status: 'active',
            raisedAmount: raised,
            targetAmount: target,
            investors: [],
          },
        ]);

        const res = await service.getStats();
        expect(res.totalAUM).toBe(raised);
        expect(res.totalInvestors).toBe(invCount);
        if (target > 0) {
          expect(res.fundingProgress).toBeGreaterThan(0);
        }
      },
    );

    it('handles empty investors array in project', async () => {
      mockProjectsService.findAll.mockResolvedValue([
        { status: 'active', investors: null },
      ]);
      mockUsersService.countInvestors.mockResolvedValue(1);
      const stats = await service.getStats();
      expect(stats.pendingApprovals).toBe(0);
    });
  });
});
