import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('reads JWT secret from config during construction', () => {
    const getMock = jest.fn().mockReturnValue('test-secret');
    const configService = {
      get: getMock,
    } as unknown as ConfigService;

    const strategy = new JwtStrategy(configService);

    expect(strategy).toBeDefined();
    expect(getMock).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('throws when JWT secret is missing', () => {
    const getMock = jest.fn().mockReturnValue(undefined);
    const configService = {
      get: getMock,
    } as unknown as ConfigService;

    expect(() => new JwtStrategy(configService)).toThrow(
      'JWT secret is not configured',
    );
    expect(getMock).toHaveBeenCalledWith('JWT_SECRET');
  });
});
