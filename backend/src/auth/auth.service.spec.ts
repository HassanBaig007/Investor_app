import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// ─── Mock bcrypt at the module level ───
jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('mock-salt'),
  hash: jest.fn().mockResolvedValue('hashed-value'),
  compare: jest.fn(),
}));

// ─── Silence google-auth-library and jose imports ───
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

// ─── Helpers ───
const mockUserDoc = (overrides: any = {}) => ({
  _id: 'user-id-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'investor',
  passwordHash: 'hashed-password',
  refreshTokenHash: 'hashed-refresh-token',
  toObject: jest.fn().mockReturnValue({
    _id: 'user-id-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'investor',
    passwordHash: 'hashed-password',
    ...overrides,
  }),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;

  beforeEach(async () => {
    usersService = {
      findByIdentifier: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findBySocialSub: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
      clearRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
      getAppConfig: jest.fn().mockReturnValue({
        disposableEmailDomains: [
          'tempmail.com',
          'throwaway.email',
          'guerrillamail.com',
          'mailinator.com',
          'yopmail.com',
        ],
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  // validateUser
  // ═══════════════════════════════════════════════════════════════════
  describe('validateUser', () => {
    it('should return user object (without passwordHash) when credentials are valid', async () => {
      const user = mockUserDoc();
      usersService.findByIdentifier.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'correct-password',
      );

      expect(usersService.findByIdentifier).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correct-password',
        'hashed-password',
      );
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null when password does not match', async () => {
      const user = mockUserDoc();
      usersService.findByIdentifier.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });

    it('should return null when user is not found', async () => {
      usersService.findByIdentifier!.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'any-password',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // login
  // ═══════════════════════════════════════════════════════════════════
  describe('login', () => {
    it('should return access_token, refresh_token, and sanitized user object', async () => {
      jwtService
        .sign!.mockReturnValueOnce('access-token-value')
        .mockReturnValueOnce('refresh-token-value');

      const user = {
        _id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'investor',
      };
      const result = await service.login(user);

      expect(result).toEqual({
        access_token: 'access-token-value',
        refresh_token: 'refresh-token-value',
        user: {
          id: 'user-id-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'investor',
        },
      });
    });

    it('should persist the refresh token hash', async () => {
      const user = {
        _id: 'user-id-456',
        email: 'a@b.com',
        name: 'A',
        role: 'investor',
      };
      await service.login(user);

      expect(usersService.setRefreshTokenHash).toHaveBeenCalledWith(
        'user-id-456',
        expect.any(String),
      );
    });

    it('should generate access token with 60m expiry and refresh with 7d expiry', async () => {
      const user = {
        _id: 'uid',
        email: 'x@y.com',
        name: 'X',
        role: 'investor',
      };
      await service.login(user);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      // First call: access token
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        { email: 'x@y.com', sub: 'uid', role: 'investor' },
        { expiresIn: '60m' },
      );
      // Second call: refresh token
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        { email: 'x@y.com', sub: 'uid', role: 'investor', type: 'refresh' },
        { expiresIn: '7d' },
      );
    });

    it('should handle user with .id instead of ._id (passport format)', async () => {
      const passportUser = {
        id: 'passport-uid',
        email: 'p@q.com',
        name: 'P',
        role: 'guest',
      };
      const result = await service.login(passportUser);

      expect(result.user.id).toBe('passport-uid');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // refreshTokens
  // ═══════════════════════════════════════════════════════════════════
  describe('refreshTokens', () => {
    it('should return new access and refresh tokens when refresh token is valid', async () => {
      jwtService.verify!.mockReturnValue({
        sub: 'user-id-123',
        email: 'test@example.com',
        role: 'investor',
        type: 'refresh',
      });
      const user = mockUserDoc();
      usersService.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService
        .sign!.mockReturnValueOnce('new-access')
        .mockReturnValueOnce('new-refresh');

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toEqual({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      });
    });

    it('should throw UnauthorizedException when jwt.verify fails', async () => {
      jwtService.verify!.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when payload type is not "refresh"', async () => {
      jwtService.verify!.mockReturnValue({
        sub: 'user-id-123',
        email: 'test@example.com',
        role: 'investor',
        type: 'access', // wrong type
      });

      await expect(service.refreshTokens('wrong-type-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when payload has no sub', async () => {
      jwtService.verify!.mockReturnValue({
        email: 'test@example.com',
        role: 'investor',
        type: 'refresh',
        // missing sub
      });

      await expect(service.refreshTokens('no-sub-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      jwtService.verify!.mockReturnValue({
        sub: 'deleted-user',
        email: 'gone@example.com',
        role: 'investor',
        type: 'refresh',
      });
      usersService.findById!.mockResolvedValue(null);

      await expect(service.refreshTokens('orphan-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user has no refreshTokenHash (logged out)', async () => {
      jwtService.verify!.mockReturnValue({
        sub: 'user-id-123',
        email: 'test@example.com',
        role: 'investor',
        type: 'refresh',
      });
      const user = mockUserDoc({ refreshTokenHash: null });
      usersService.findById.mockResolvedValue(user);

      await expect(service.refreshTokens('stale-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when bcrypt.compare returns false (token mismatch)', async () => {
      jwtService.verify!.mockReturnValue({
        sub: 'user-id-123',
        email: 'test@example.com',
        role: 'investor',
        type: 'refresh',
      });
      const user = mockUserDoc();
      usersService.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens('mismatched-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // logout
  // ═══════════════════════════════════════════════════════════════════
  describe('logout', () => {
    it('should clear refresh token hash and return success', async () => {
      const result = await service.logout('user-id-123');

      expect(usersService.clearRefreshTokenHash).toHaveBeenCalledWith(
        'user-id-123',
      );
      expect(result).toEqual({ success: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // register
  // ═══════════════════════════════════════════════════════════════════
  describe('register', () => {
    const validDto = {
      email: 'new@example.com',
      name: 'New User',
      password: 'Str0ng!Pass',
      role: 'investor',
    };

    it('should create a new user and return sanitized response (no passwordHash)', async () => {
      usersService.findOne!.mockResolvedValue(null);
      const createdUser = mockUserDoc({
        email: 'new@example.com',
        name: 'New User',
      });
      usersService.create.mockResolvedValue(createdUser);

      const result = await service.register(validDto);

      expect(usersService.create).toHaveBeenCalledWith(validDto);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException if email already exists', async () => {
      const existingUser = mockUserDoc();
      usersService.findOne.mockResolvedValue(existingUser);

      await expect(service.register(validDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.register(validDto)).rejects.toThrow(
        'An account with this email already exists',
      );
    });

    it('should force role to "investor" when self-assigning elevated roles', async () => {
      usersService.findOne!.mockResolvedValue(null);
      const createdUser = mockUserDoc();
      usersService.create.mockResolvedValue(createdUser);

      const escalationDto = { ...validDto, role: 'super_admin' };
      await service.register(escalationDto);

      // The dto should have been mutated to safe default
      expect(escalationDto.role).toBe('investor');
    });

    it('should allow "guest" role self-assignment', async () => {
      usersService.findOne!.mockResolvedValue(null);
      const createdUser = mockUserDoc({ role: 'guest' });
      usersService.create.mockResolvedValue(createdUser);

      const guestDto = { ...validDto, role: 'guest' };
      await service.register(guestDto);

      expect(guestDto.role).toBe('guest');
    });

    it('should block disposable email domains', async () => {
      const disposableDto = { ...validDto, email: 'user@mailinator.com' };

      await expect(service.register(disposableDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.register(disposableDto)).rejects.toThrow(
        'Temporary or disposable email addresses are not allowed',
      );
    });

    it('should block all known disposable domains', async () => {
      const domains = [
        'tempmail.com',
        'throwaway.email',
        'guerrillamail.com',
        'yopmail.com',
      ];
      for (const domain of domains) {
        await expect(
          service.register({ ...validDto, email: `user@${domain}` }),
        ).rejects.toThrow(UnauthorizedException);
      }
    });

    it('should allow legitimate email domains', async () => {
      usersService.findOne!.mockResolvedValue(null);
      const createdUser = mockUserDoc();
      usersService.create.mockResolvedValue(createdUser);

      await expect(
        service.register({ ...validDto, email: 'user@gmail.com' }),
      ).resolves.toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // changePassword
  // ═══════════════════════════════════════════════════════════════════
  describe('changePassword', () => {
    it('should change password successfully when current password is correct', async () => {
      const user = mockUserDoc();
      usersService.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.changePassword(
        'user-id-123',
        'current-pass',
        'new-pass',
      );

      expect(result).toEqual({ success: true });
      expect(bcrypt.hash).toHaveBeenCalledWith('new-pass', 'mock-salt');
      expect(user.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      const user = mockUserDoc();
      usersService.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-id-123', 'wrong-pass', 'new-pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      usersService.findById!.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', 'any', 'any'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should hash the new password with bcrypt before saving', async () => {
      const user = mockUserDoc();
      usersService.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.changePassword('user-id-123', 'current', 'newP@ss123');

      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('newP@ss123', 'mock-salt');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // getProfile
  // ═══════════════════════════════════════════════════════════════════
  describe('getProfile', () => {
    it('should return user profile without passwordHash', async () => {
      const user = mockUserDoc();
      usersService.findById.mockResolvedValue(user);

      const result = await service.getProfile('user-id-123');

      expect(result).toHaveProperty('id', 'user-id-123');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      usersService.findById!.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should include both id and _id fields in response', async () => {
      const user = mockUserDoc();
      usersService.findById.mockResolvedValue(user);

      const result = await service.getProfile('user-id-123');

      expect(result.id).toBe('user-id-123');
      expect(result._id).toBe('user-id-123');
    });
  });
});
