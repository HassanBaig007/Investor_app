import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

describe('LocalStrategy', () => {
  let authService: { validateUser: jest.Mock };
  let strategy: LocalStrategy;

  beforeEach(() => {
    authService = { validateUser: jest.fn() };
    strategy = new LocalStrategy(authService as any);
  });

  it('uses identifier argument when present', async () => {
    authService.validateUser.mockResolvedValue({ id: 'u1' });

    const user = await strategy.validate(
      { body: { email: 'ignored@example.com' } } as any,
      'person@example.com',
      'secret',
    );

    expect(authService.validateUser).toHaveBeenCalledWith(
      'person@example.com',
      'secret',
    );
    expect(user).toEqual({ id: 'u1' });
  });

  it('falls back to request body email when identifier is blank', async () => {
    authService.validateUser.mockResolvedValue({ id: 'u2' });

    await strategy.validate(
      { body: { email: 'fallback@example.com' } } as any,
      '   ',
      'secret',
    );

    expect(authService.validateUser).toHaveBeenCalledWith(
      'fallback@example.com',
      'secret',
    );
  });

  it('coerces primitive identifiers from request body to string', async () => {
    authService.validateUser.mockResolvedValue({ id: 'u3' });

    await strategy.validate({ body: { phone: 12345 } } as any, '', 'secret');

    expect(authService.validateUser).toHaveBeenCalledWith('12345', 'secret');
  });

  it('throws UnauthorizedException when credentials are invalid', async () => {
    authService.validateUser.mockResolvedValue(null);

    await expect(
      strategy.validate({ body: { identifier: 'nobody' } } as any, '', 'wrong'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
