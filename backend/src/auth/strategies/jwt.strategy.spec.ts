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

  it('falls back when secret is missing and still validates payload', () => {
    const getMock = jest.fn().mockReturnValue(undefined);
    const configService = {
      get: getMock,
    } as unknown as ConfigService;
    const strategy = new JwtStrategy(configService);

    const payload = { sub: 'u1', email: 'u1@example.com', role: 'admin' };
    const result = strategy.validate(payload);

    expect(result).toEqual({
      userId: 'u1',
      email: 'u1@example.com',
      role: 'admin',
    });
    expect(getMock).toHaveBeenCalledWith('JWT_SECRET');
  });
});
