import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationService } from './notifications.service';

// Mock mongoose fully to prevent Types.ObjectId BSON error
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => id),
    },
  };
});

describe('NotificationService', () => {
  let service: NotificationService;

  const mockNotificationModel = {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
  };

  // Helper to mock mongoose query chains
  const mockQuery = (result: any) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getModelToken('Notification'),
          useValue: mockNotificationModel,
        },
        { provide: getModelToken('Subscription'), useValue: {} },
        { provide: getModelToken('User'), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);

    // Mock global fetch
    globalThis.fetch = jest.fn() as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // isExpoPushToken
  // ═══════════════════════════════════════════════════════════════════
  describe('isExpoPushToken (private method)', () => {
    it('validates standard ExponentPushToken format', () => {
      expect(service['isExpoPushToken']('ExponentPushToken[xxxx-yyyy]')).toBe(
        true,
      );
    });

    it('validates newer ExpoPushToken format', () => {
      expect(service['isExpoPushToken']('ExpoPushToken[xxxx-yyyy]')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(service['isExpoPushToken']('ExponentPushToken[]')).toBe(false); // Empty brackets
      expect(service['isExpoPushToken']('invalid-token')).toBe(false);
      expect(service['isExpoPushToken']('')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // sendPush
  // ═══════════════════════════════════════════════════════════════════
  describe('sendPush', () => {
    class MockNotification {
      _id: string;
      save: jest.Mock<any, any>;
      constructor(dto: any) {
        Object.assign(this, dto);
        this._id = 'mock-notification-id';
        this.save = jest.fn().mockResolvedValue(this);
      }
    }

    beforeEach(() => {
      // Mock the save() call inside the service
      (service as any).notificationModel = MockNotification;
    });

    it('returns early and creates DB record if user has no valid push token', async () => {
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: null } }),
      );

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(result.reason).toBe('missing_or_invalid_push_token');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('sends fetch request to Expo and returns success', async () => {
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: 'ExpoPushToken[mock]' } }),
      );

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { status: 'ok' } }),
      });

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(true);
      expect(result.expoResult).toEqual({ data: { status: 'ok' } });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('ExpoPushToken[mock]'),
        }),
      );
    });

    it('handles HTTP error responses from Expo API', async () => {
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: 'ExpoPushToken[mock]' } }),
      );

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ errors: ['mock-error'] }),
      });

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(result.reason).toBe('expo_request_failed');
    });

    it('catches network exceptions during fetch', async () => {
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: 'ExpoPushToken[mock]' } }),
      );

      (globalThis.fetch as jest.Mock).mockRejectedValue(
        new Error('Network timeout'),
      );

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(result.reason).toBe('expo_request_exception');
    });
  });

  describe('CRUD operations stress', () => {
    it.each(Array.from({ length: 15 }, (_, i) => [`u${i}`]))(
      'findAll for user %s',
      async (uid) => {
        mockNotificationModel.find.mockReturnValue(mockQuery([]));
        await service.findAll(uid);
        expect(mockNotificationModel.find).toHaveBeenCalled();
      },
    );

    it.each(Array.from({ length: 10 }, (_, i) => [`n${i}`, `u${i}`]))(
      'markAsRead for notification %s',
      async (nid, uid) => {
        mockNotificationModel.findOneAndUpdate.mockReturnValue(mockQuery({}));
        await service.markAsRead(nid, uid);
        expect(mockNotificationModel.findOneAndUpdate).toHaveBeenCalled();
      },
    );

    it('markAllAsRead returns modifiedCount', async () => {
      mockNotificationModel.updateMany.mockResolvedValue({ modifiedCount: 5 });
      const res = await service.markAllAsRead('u1');
      expect(res.modifiedCount).toBe(5);
    });

    it('remove calls findOneAndDelete', async () => {
      mockNotificationModel.findOneAndDelete.mockReturnValue(mockQuery({}));
      await service.remove('n1', 'u1');
      expect(mockNotificationModel.findOneAndDelete).toHaveBeenCalled();
    });
  });
});
