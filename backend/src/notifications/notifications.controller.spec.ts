import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockNotificationService = {
    findAll: jest.fn(),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to service with request user id', async () => {
    mockNotificationService.findAll.mockResolvedValue([{ _id: 'n1' }]);

    const result = await controller.findAll({ user: { userId: 'u1' } } as any);

    expect(mockNotificationService.findAll).toHaveBeenCalledWith('u1');
    expect(result).toEqual([{ _id: 'n1' }]);
  });

  it('markAllAsRead delegates to service', async () => {
    mockNotificationService.markAllAsRead.mockResolvedValue({
      modifiedCount: 3,
    });

    const result = await controller.markAllAsRead({
      user: { userId: 'u2' },
    } as any);

    expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('u2');
    expect(result).toEqual({ modifiedCount: 3 });
  });

  it('markAsRead delegates to service', async () => {
    mockNotificationService.markAsRead.mockResolvedValue({ _id: 'n9' });

    const result = await controller.markAsRead('n9', {
      user: { userId: 'u3' },
    } as any);

    expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('n9', 'u3');
    expect(result).toEqual({ _id: 'n9' });
  });

  it('remove delegates to service', async () => {
    mockNotificationService.remove.mockResolvedValue({ deleted: true });

    const result = await controller.remove('n4', {
      user: { userId: 'u4' },
    } as any);

    expect(mockNotificationService.remove).toHaveBeenCalledWith('n4', 'u4');
    expect(result).toEqual({ deleted: true });
  });
});
