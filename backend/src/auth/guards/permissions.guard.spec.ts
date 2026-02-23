import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  BACKEND_PERMISSIONS,
  PermissionsGuard,
  getAllPermissionsForRole,
} from './permissions.guard';

describe('getAllPermissionsForRole', () => {
  it('returns empty list for unknown roles', () => {
    expect(getAllPermissionsForRole('unknown_role')).toEqual([]);
  });

  it('returns inherited investor permissions for project_admin', () => {
    const permissions = getAllPermissionsForRole('project_admin');

    expect(permissions).toContain(BACKEND_PERMISSIONS.CREATE_MODIFICATION);
    expect(permissions).toContain(BACKEND_PERMISSIONS.VIEW_PORTFOLIO);
  });

  it('returns all permissions for super_admin', () => {
    const permissions = getAllPermissionsForRole('super_admin');

    expect(permissions).toContain(BACKEND_PERMISSIONS.MANAGE_USERS);
    expect(permissions).toContain(BACKEND_PERMISSIONS.VIEW_PORTFOLIO);
  });
});

describe('PermissionsGuard', () => {
  let reflector: { get: jest.Mock };
  let guard: PermissionsGuard;

  const makeContext = (user: any) =>
    ({
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  it('allows access when no permissions metadata exists', () => {
    reflector.get.mockReturnValue(undefined);

    const allowed = guard.canActivate(makeContext({ role: 'guest' }));

    expect(allowed).toBe(true);
  });

  it('denies access when user has no role', () => {
    reflector.get.mockReturnValue([BACKEND_PERMISSIONS.VIEW_PROFILE]);

    const allowed = guard.canActivate(makeContext({}));

    expect(allowed).toBe(false);
  });

  it('allows super_admin to bypass checks', () => {
    reflector.get.mockReturnValue([BACKEND_PERMISSIONS.MANAGE_USERS]);

    const allowed = guard.canActivate(makeContext({ role: 'super_admin' }));

    expect(allowed).toBe(true);
  });

  it('allows user when one required permission is present', () => {
    reflector.get.mockReturnValue([
      BACKEND_PERMISSIONS.MANAGE_USERS,
      BACKEND_PERMISSIONS.VIEW_PROFILE,
    ]);

    const allowed = guard.canActivate(makeContext({ role: 'investor' }));

    expect(allowed).toBe(true);
  });

  it('throws ForbiddenException when required permissions are missing', () => {
    reflector.get.mockReturnValue([BACKEND_PERMISSIONS.DELETE_PROJECT]);

    expect(() => guard.canActivate(makeContext({ role: 'guest' }))).toThrow(
      ForbiddenException,
    );
  });
});
