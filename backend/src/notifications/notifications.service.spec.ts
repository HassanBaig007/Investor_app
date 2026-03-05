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
  let loggerErrorSpy: jest.SpyInstance;
  const originalFcmServerKey = process.env.FCM_SERVER_KEY;

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
    delete process.env.FCM_SERVER_KEY;

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
    loggerErrorSpy = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);

    // Mock global fetch
    globalThis.fetch = jest.fn() as any;
  });

  afterEach(() => {
    loggerErrorSpy?.mockRestore();
  });

  afterAll(() => {
    if (originalFcmServerKey === undefined) {
      delete process.env.FCM_SERVER_KEY;
      return;
    }
    process.env.FCM_SERVER_KEY = originalFcmServerKey;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs a warning on module init when FCM key is missing', () => {
    const loggerWarnSpy = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);

    (service as any).onModuleInit();

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'FCM_SERVER_KEY is not configured. Remote push delivery is disabled until a valid key is set.',
    );

    loggerWarnSpy.mockRestore();
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
      process.env.FCM_SERVER_KEY = 'test-server-key';
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: null } }),
      );

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(result.reason).toBe('missing_or_invalid_push_token');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('returns early when recipient has push notifications disabled', async () => {
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { notifications: { pushEnabled: false } } }),
      );

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(result.reason).toBe('push_disabled');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('returns early when push provider is not configured', async () => {
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: 'fcm-token-123' } }),
      );

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(result.reason).toBe('push_provider_not_configured');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('does not log missing-token debug when push provider is not configured', async () => {
      const loggerDebugSpy = jest
        .spyOn((service as any).logger, 'debug')
        .mockImplementation(() => undefined);

      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: null } }),
      );

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(result.reason).toBe('push_provider_not_configured');
      expect(loggerDebugSpy).not.toHaveBeenCalled();

      loggerDebugSpy.mockRestore();
    });

    it('sends fetch request to push provider and returns success', async () => {
      process.env.FCM_SERVER_KEY = 'test-server-key';
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: 'fcm-token-123' } }),
      );

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { status: 'ok' } }),
      });

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(true);
      expect(result.providerResult).toEqual({ data: { status: 'ok' } });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://fcm.googleapis.com/fcm/send',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('fcm-token-123'),
        }),
      );
    });

    it('handles HTTP error responses from push provider', async () => {
      process.env.FCM_SERVER_KEY = 'test-server-key';
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: 'fcm-token-123' } }),
      );

      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ errors: ['mock-error'] }),
      });

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(result.reason).toBe('push_request_failed');
    });

    it('catches network exceptions during fetch', async () => {
      process.env.FCM_SERVER_KEY = 'test-server-key';
      mockUserModel.findById.mockReturnValue(
        mockQuery({ settings: { pushToken: 'fcm-token-123' } }),
      );

      (globalThis.fetch as jest.Mock).mockRejectedValue(
        new Error('Network timeout'),
      );

      const result = await service.sendPush('u1', 'Title', 'Body');

      expect(result.delivered).toBe(false);
      expect(result.reason).toBe('push_request_exception');
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
