import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectAnalyticsService } from './project-analytics.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    acceptInvitation: jest.fn(),
  };

  const mockAnalyticsService = {
    getProjectAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: ProjectAnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // create
  // ═══════════════════════════════════════════════════════════════════
  describe('create', () => {
    it('delegates to projectsService.create', async () => {
      const mockReq = { user: { userId: 'u1' } };
      const dto = { title: 'New Project' } as any;
      mockProjectsService.create.mockResolvedValue({ _id: 'p1', ...dto });

      const result = await controller.create(mockReq, dto);

      expect(mockProjectsService.create).toHaveBeenCalledWith(
        dto,
        mockReq.user,
      );
      expect(result).toEqual({ _id: 'p1', ...dto });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════
  describe('findAll', () => {
    it('delegates to projectsService.findAll with the user context', async () => {
      const mockReq = { user: { userId: 'u1', role: 'investor' } };
      mockProjectsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockReq);

      expect(mockProjectsService.findAll).toHaveBeenCalledWith({
        userId: 'u1',
        role: 'investor',
      });
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // findOne
  // ═══════════════════════════════════════════════════════════════════
  describe('findOne', () => {
    it('delegates to projectsService.findOne', async () => {
      const mockReq = { user: { userId: 'u1', role: 'investor' } };
      mockProjectsService.findOne.mockResolvedValue({ _id: 'p1' });

      const result = await controller.findOne('p1', mockReq);

      expect(mockProjectsService.findOne).toHaveBeenCalledWith('p1', {
        userId: 'u1',
        role: 'investor',
      });
      expect(result).toEqual({ _id: 'p1' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // acceptInvitation
  // ═══════════════════════════════════════════════════════════════════
  describe('acceptInvitation', () => {
    it('delegates to projectsService.acceptInvitation', async () => {
      const mockReq = { user: { userId: 'u1' } };

      mockProjectsService.acceptInvitation.mockResolvedValue({ success: true });

      const result = await controller.acceptInvitation(mockReq, 'p1');

      expect(mockProjectsService.acceptInvitation).toHaveBeenCalledWith(
        'p1',
        mockReq.user,
      );
      expect(result).toEqual({ success: true });
    });
  });
});
