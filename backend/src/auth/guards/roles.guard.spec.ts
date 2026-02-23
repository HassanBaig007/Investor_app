import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: { get: jest.Mock };
  let guard: RolesGuard;

  const makeContext = (user: any) =>
    ({
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows access when route has no roles metadata', () => {
    reflector.get.mockReturnValue(undefined);

    const allowed = guard.canActivate(makeContext({ role: 'investor' }));

    expect(allowed).toBe(true);
  });

  it('denies access when user has no role', () => {
    reflector.get.mockReturnValue(['admin']);

    const allowed = guard.canActivate(makeContext({}));

    expect(allowed).toBe(false);
  });

  it('allows super_admin regardless of required roles', () => {
    reflector.get.mockReturnValue(['investor']);

    const allowed = guard.canActivate(makeContext({ role: 'super_admin' }));

    expect(allowed).toBe(true);
  });

  it('treats project_admin as admin for admin-protected routes', () => {
    reflector.get.mockReturnValue(['admin']);

    const allowed = guard.canActivate(makeContext({ role: 'project_admin' }));

    expect(allowed).toBe(true);
  });

  it('throws ForbiddenException when user role does not match required role', () => {
    reflector.get.mockReturnValue(['investor']);

    expect(() => guard.canActivate(makeContext({ role: 'guest' }))).toThrow(
      ForbiddenException,
    );
  });
});
