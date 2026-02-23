import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;

  const mockAdminService = {
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // getStats
  // ═══════════════════════════════════════════════════════════════════
  describe('getStats', () => {
    it('delegates to adminService.getStats()', async () => {
      const mockStats = { activeProjects: 5, totalAUM: 10000 };
      mockAdminService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(mockAdminService.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });
});
