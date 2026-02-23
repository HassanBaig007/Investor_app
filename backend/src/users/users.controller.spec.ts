import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';

// ─── Silence jose imports that break Jest ───
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateKyc: jest.fn(),
    updateSettings: jest.fn(),
    updateNotificationPrefs: jest.fn(),
    deleteAccount: jest.fn(),
    exportUserData: jest.fn(),
    registerPushToken: jest.fn(),
    getAppConfig: jest.fn(),
  };

  const mockAuthService = {
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // updateSettings
  // ═══════════════════════════════════════════════════════════════════
  describe('updateSettings', () => {
    it('delegates to usersService.updateSettings', async () => {
      const mockUser = { userId: 'u1' };
      const dto = { theme: 'dark' };
      mockUsersService.updateSettings.mockResolvedValue({
        _id: 'u1',
        settings: dto,
      });

      const result = await controller.updateSettings({ user: mockUser }, dto);

      expect(mockUsersService.updateSettings).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ theme: 'dark' }),
      );
      expect(result).toHaveProperty('settings');
      expect(result.settings.theme).toBe('dark');
    });
  });

  describe('findAll', () => {
    it('sanitizes password hashes from user list', async () => {
      mockUsersService.findAll.mockResolvedValue([
        { _id: 'u1', email: 'a@x.com', passwordHash: 'secret' },
      ]);

      const users = await controller.findAll();

      expect(users).toEqual([{ _id: 'u1', email: 'a@x.com' }]);
    });
  });

  describe('getProfile', () => {
    it('loads and sanitizes profile for current user', async () => {
      mockUsersService.findById.mockResolvedValue({
        _id: 'u1',
        name: 'Alice',
        passwordHash: 'hidden',
      });

      const profile = await controller.getProfile({ user: { userId: 'u1' } });

      expect(mockUsersService.findById).toHaveBeenCalledWith('u1');
      expect(profile).toEqual({ _id: 'u1', name: 'Alice' });
    });
  });

  describe('getSettings', () => {
    it('returns normalized fallback settings when user has no settings', async () => {
      mockUsersService.findById.mockResolvedValue({
        _id: 'u1',
        settings: null,
      });

      const result = await controller.getSettings({ user: { userId: 'u1' } });

      expect(result.theme).toBe('light');
      expect(result.notifications.pushEnabled).toBe(true);
    });
  });

  describe('updateProfile', () => {
    it('whitelists allowed fields before calling service', async () => {
      mockUsersService.update.mockResolvedValue({
        _id: 'u1',
        name: 'Updated',
        role: 'investor',
        passwordHash: 'should-not-leak',
      });

      const result = await controller.updateProfile(
        { user: { userId: 'u1' } },
        {
          name: 'Updated',
          role: 'admin',
          passwordHash: 'bad',
          phone: '123',
        },
      );

      expect(mockUsersService.update).toHaveBeenCalledWith('u1', {
        name: 'Updated',
        phone: '123',
      });
      expect(result.passwordHash).toBeUndefined();
    });
  });

  describe('updateKyc', () => {
    it('delegates KYC update and sanitizes response', async () => {
      mockUsersService.updateKyc.mockResolvedValue({
        _id: 'u1',
        kyc: { pan: 'ABCDE1234F' },
        passwordHash: 'hidden',
      });

      const result = await controller.updateKyc(
        { user: { userId: 'u1' } },
        { pan: 'ABCDE1234F' },
      );

      expect(mockUsersService.updateKyc).toHaveBeenCalledWith('u1', {
        pan: 'ABCDE1234F',
      });
      expect(result.passwordHash).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // updateNotificationPrefs
  // ═══════════════════════════════════════════════════════════════════
  describe('updateNotificationPreferences', () => {
    it('delegates to usersService.updateNotificationPrefs', async () => {
      const mockUser = { userId: 'u1' };
      const dto = { emailEnabled: false, pushEnabled: true };

      const mockResponse = { _id: 'u1', settings: { notifications: dto } };
      mockUsersService.updateNotificationPrefs.mockResolvedValue(mockResponse);

      const result = await controller.updateNotificationPreferences(
        { user: mockUser },
        dto,
      );

      expect(mockUsersService.updateNotificationPrefs).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining(dto),
      );
      expect(result).toHaveProperty('settings');
      expect(result).toHaveProperty('notifications');
    });

    it('supports backend-style notification field names', async () => {
      const mockUser = { userId: 'u1' };
      const dto = {
        push: false,
        email: true,
        approvals: false,
        spendingAlerts: true,
      };

      mockUsersService.updateNotificationPrefs.mockResolvedValue({
        _id: 'u1',
        settings: { notifications: dto },
      });

      await controller.updateNotificationPreferences({ user: mockUser }, dto);

      expect(mockUsersService.updateNotificationPrefs).toHaveBeenCalledWith(
        'u1',
        {
          pushEnabled: false,
          emailEnabled: true,
          approvalReminders: false,
          reportAlerts: true,
        },
      );
    });
  });

  describe('changePassword', () => {
    it('delegates to AuthService.changePassword', async () => {
      mockAuthService.changePassword.mockResolvedValue({ success: true });

      const result = await controller.changePassword(
        { user: { userId: 'u1' } },
        { currentPassword: 'old', newPassword: 'new' },
      );

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'u1',
        'old',
        'new',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('account management routes', () => {
    it('deleteAccount delegates to usersService.deleteAccount', async () => {
      mockUsersService.deleteAccount.mockResolvedValue({ success: true });

      const result = await controller.deleteAccount(
        { user: { userId: 'u1' } },
        { password: 'Secret123!' },
      );

      expect(mockUsersService.deleteAccount).toHaveBeenCalledWith(
        'u1',
        'Secret123!',
      );
      expect(result.success).toBe(true);
    });

    it('exportData delegates to usersService.exportUserData', async () => {
      mockUsersService.exportUserData.mockResolvedValue({ user: { id: 'u1' } });

      const result = await controller.exportData({ user: { userId: 'u1' } });

      expect(mockUsersService.exportUserData).toHaveBeenCalledWith('u1');
      expect(result.user.id).toBe('u1');
    });

    it('registerPushToken delegates to usersService.registerPushToken', async () => {
      mockUsersService.registerPushToken.mockResolvedValue({ success: true });

      const result = await controller.registerPushToken(
        { user: { userId: 'u1' } },
        { pushToken: 'ExponentPushToken[abc]' },
      );

      expect(mockUsersService.registerPushToken).toHaveBeenCalledWith(
        'u1',
        'ExponentPushToken[abc]',
      );
      expect(result.success).toBe(true);
    });

    it('getAppConfig delegates to usersService.getAppConfig', () => {
      mockUsersService.getAppConfig.mockReturnValue({
        passwordPolicy: { minLength: 8 },
      });

      const result = controller.getAppConfig();

      expect(mockUsersService.getAppConfig).toHaveBeenCalledTimes(1);
      expect(result.passwordPolicy.minLength).toBe(8);
    });
  });
});
