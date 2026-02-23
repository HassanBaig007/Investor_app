import { Test, TestingModule } from '@nestjs/testing';
import { ModificationsController } from './modifications.controller';
import { ModificationsService } from './modifications.service';

describe('ModificationsController', () => {
  let controller: ModificationsController;

  const mockModificationsService = {
    createRequest: jest.fn(),
    approveRequest: jest.fn(),
    create: jest.fn(),
    vote: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModificationsController],
      providers: [
        { provide: ModificationsService, useValue: mockModificationsService },
      ],
    }).compile();

    controller = module.get<ModificationsController>(ModificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // create
  // ═══════════════════════════════════════════════════════════════════
  describe('create', () => {
    it('delegates to modificationsService.create', async () => {
      const mockReq = { user: { userId: 'u1' } };
      const dto = { projectId: 'p1', type: 'add_investor', payload: {} } as any;
      mockModificationsService.create.mockResolvedValue({ _id: 'm1', ...dto });

      const result = await controller.create(mockReq, dto);

      expect(mockModificationsService.create).toHaveBeenCalledWith(
        dto,
        mockReq.user,
      );
      expect(result).toEqual({ _id: 'm1', ...dto });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // approve
  // ═══════════════════════════════════════════════════════════════════
  describe('approve', () => {
    it('delegates to modificationsService.vote with approved status', async () => {
      const mockReq = { user: { userId: 'u1', role: 'super_admin' } };

      mockModificationsService.vote.mockResolvedValue({ success: true });

      const result = await controller.approve(mockReq, 'm1');

      expect(mockModificationsService.vote).toHaveBeenCalledWith(
        'm1',
        'u1',
        'approved',
        undefined,
        mockReq.user,
      );
      expect(result).toEqual({ success: true });
    });
  });
});
