import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getAllPermissionsForRole } from './guards/permissions.guard';

// ─── Silence jose imports that break Jest ───
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

// Mock the service — controller tests verify delegation, not business logic
const mockAuthService = () => ({
  login: jest.fn(),
  register: jest.fn(),
  loginWithGoogle: jest.fn(),
  loginWithApple: jest.fn(),
  getProfile: jest.fn(),
  logout: jest.fn(),
  refreshTokens: jest.fn(),
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: ReturnType<typeof mockAuthService>;

  beforeEach(async () => {
    authService = mockAuthService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  // POST /auth/login
  // ═══════════════════════════════════════════════════════════════════
  describe('login', () => {
    it('should delegate to authService.login with the user from the request', async () => {
      const reqUser = { userId: 'uid', email: 'a@b.com', role: 'investor' };
      const expected = {
        access_token: 'at',
        refresh_token: 'rt',
        user: reqUser,
      };
      authService.login.mockResolvedValue(expected);

      const result = await controller.login({ user: reqUser });

      expect(authService.login).toHaveBeenCalledWith(reqUser);
      expect(result).toEqual(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /auth/register
  // ═══════════════════════════════════════════════════════════════════
  describe('register', () => {
    it('should delegate to authService.register with the DTO', async () => {
      const dto = {
        email: 'new@x.com',
        name: 'N',
        password: 'P@ss1234!!',
      } as any;
      const expected = { id: 'new-id', email: 'new@x.com' };
      authService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /auth/login/google
  // ═══════════════════════════════════════════════════════════════════
  describe('googleLogin', () => {
    it('should delegate to authService.loginWithGoogle with the idToken', async () => {
      const dto = { idToken: 'google-id-token-123' } as any;
      const expected = { access_token: 'at' };
      authService.loginWithGoogle.mockResolvedValue(expected);

      const result = await controller.googleLogin(dto);

      expect(authService.loginWithGoogle).toHaveBeenCalledWith(
        'google-id-token-123',
      );
      expect(result).toEqual(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /auth/login/apple
  // ═══════════════════════════════════════════════════════════════════
  describe('appleLogin', () => {
    it('should delegate to authService.loginWithApple with idToken and profile', async () => {
      const dto = {
        idToken: 'apple-token',
        email: 'a@apple.com',
        name: 'Apple User',
      } as any;
      authService.loginWithApple.mockResolvedValue({ access_token: 'at' });

      await controller.appleLogin(dto);

      expect(authService.loginWithApple).toHaveBeenCalledWith('apple-token', {
        email: 'a@apple.com',
        name: 'Apple User',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /auth/me
  // ═══════════════════════════════════════════════════════════════════
  describe('getProfile', () => {
    it('should call authService.getProfile with userId from JWT payload', async () => {
      const profileData = { id: 'uid', email: 'a@b.com', name: 'User' };
      authService.getProfile.mockResolvedValue(profileData);

      const result = await controller.getProfile({ user: { userId: 'uid' } });

      expect(authService.getProfile).toHaveBeenCalledWith('uid');
      expect(result).toEqual(profileData);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /auth/logout
  // ═══════════════════════════════════════════════════════════════════
  describe('logout', () => {
    it('should delegate to authService.logout with userId', async () => {
      authService.logout.mockResolvedValue({ success: true });

      const result = await controller.logout({ user: { userId: 'uid' } });

      expect(authService.logout).toHaveBeenCalledWith('uid');
      expect(result).toEqual({ success: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /auth/refresh
  // ═══════════════════════════════════════════════════════════════════
  describe('refresh', () => {
    it('should delegate to authService.refreshTokens when refreshToken is provided', async () => {
      const expected = { access_token: 'new-at', refresh_token: 'new-rt' };
      authService.refreshTokens.mockResolvedValue(expected);

      const result = await controller.refresh({ refreshToken: 'old-rt' });

      expect(authService.refreshTokens).toHaveBeenCalledWith('old-rt');
      expect(result).toEqual(expected);
    });

    it('should throw BadRequestException when refreshToken is missing', () => {
      expect(() => controller.refresh({})).toThrow(BadRequestException);
      expect(() => controller.refresh({})).toThrow('refreshToken is required');
    });

    it('should throw BadRequestException when body has undefined refreshToken', () => {
      expect(() => controller.refresh({ refreshToken: undefined })).toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /auth/my-permissions
  // ═══════════════════════════════════════════════════════════════════
  describe('getMyPermissions', () => {
    it('should return role and permissions for an investor', () => {
      const req = { user: { userId: 'uid', role: 'investor' } };
      const result = controller.getMyPermissions(req);

      expect(result.role).toBe('investor');
      expect(result.permissions).toBeInstanceOf(Array);
      expect(result.permissions.length).toBeGreaterThan(0);
      // Cross-check against the real permission function
      expect(result.permissions).toEqual(getAllPermissionsForRole('investor'));
    });

    it('should return all permissions for super_admin', () => {
      const req = { user: { userId: 'uid', role: 'super_admin' } };
      const result = controller.getMyPermissions(req);

      expect(result.role).toBe('super_admin');
      const allPerms = getAllPermissionsForRole('super_admin');
      expect(result.permissions).toEqual(allPerms);
      expect(result.permissions.length).toBeGreaterThan(10); // sanity check
    });

    it('should return empty permissions for guest', () => {
      const req = { user: { userId: 'uid', role: 'guest' } };
      const result = controller.getMyPermissions(req);

      expect(result.role).toBe('guest');
      expect(result.permissions).toEqual([]);
    });

    it('should return inherited investor + project_admin permissions for project_admin', () => {
      const req = { user: { userId: 'uid', role: 'project_admin' } };
      const result = controller.getMyPermissions(req);

      expect(result.role).toBe('project_admin');
      // project_admin should have investor permissions inherited
      const investorPerms = getAllPermissionsForRole('investor');
      for (const perm of investorPerms) {
        expect(result.permissions).toContain(perm);
      }
    });
  });
});
