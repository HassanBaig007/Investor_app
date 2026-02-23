import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsController', () => {
  let controller: AnnouncementsController;

  const mockAnnouncementsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    markAsRead: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementsController],
      providers: [
        {
          provide: AnnouncementsService,
          useValue: mockAnnouncementsService,
        },
      ],
    }).compile();

    controller = module.get<AnnouncementsController>(AnnouncementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to service with dto and request user id', async () => {
    const req = { user: { userId: 'u1' } };
    const dto = { title: 'Important update', body: 'Body text' };
    mockAnnouncementsService.create.mockResolvedValue({
      _id: 'a1',
      ...dto,
    });

    const result = await controller.create(req as any, dto);

    expect(mockAnnouncementsService.create).toHaveBeenCalledWith(dto, 'u1');
    expect(result).toEqual({ _id: 'a1', ...dto });
  });

  it('findAll delegates to service', async () => {
    mockAnnouncementsService.findAll.mockResolvedValue([{ _id: 'a1' }]);

    const result = await controller.findAll();

    expect(mockAnnouncementsService.findAll).toHaveBeenCalled();
    expect(result).toEqual([{ _id: 'a1' }]);
  });

  it('findOne delegates to service', async () => {
    mockAnnouncementsService.findOne.mockResolvedValue({ _id: 'a1' });

    const result = await controller.findOne('a1');

    expect(mockAnnouncementsService.findOne).toHaveBeenCalledWith('a1');
    expect(result).toEqual({ _id: 'a1' });
  });

  it('markAsRead delegates to service with announcement id and user id', async () => {
    const req = { user: { userId: 'u2' } };
    mockAnnouncementsService.markAsRead.mockResolvedValue({ success: true });

    const result = await controller.markAsRead('a2', req as any);

    expect(mockAnnouncementsService.markAsRead).toHaveBeenCalledWith(
      'a2',
      'u2',
    );
    expect(result).toEqual({ success: true });
  });

  it('delete delegates to service', async () => {
    mockAnnouncementsService.remove.mockResolvedValue({ deleted: true });

    const result = await controller.delete('a3');

    expect(mockAnnouncementsService.remove).toHaveBeenCalledWith('a3');
    expect(result).toEqual({ deleted: true });
  });
});
