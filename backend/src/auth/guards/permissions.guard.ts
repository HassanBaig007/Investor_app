import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Backend-authoritative RBAC permission system.
 * This replaces frontend-only permission checking with server-side enforcement.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 *   @SetMetadata('permissions', ['create_modification', 'edit_project'])
 */

// Permission definitions (single source of truth — frontend mirrors these for UI only)
export const BACKEND_PERMISSIONS = {
  // Portfolio
  VIEW_PORTFOLIO: 'view_portfolio',
  VIEW_INVESTMENTS: 'view_investments',
  VIEW_REPORTS: 'view_reports',
  VIEW_ANALYTICS: 'view_analytics',

  // Project management
  CREATE_PROJECT: 'create_project',
  VIEW_PROJECT_DETAILS: 'view_project_details',
  EDIT_PROJECT: 'edit_project',
  DELETE_PROJECT: 'delete_project',

  // Investor management
  ADD_INVESTOR: 'add_investor',
  REMOVE_INVESTOR: 'remove_investor',
  VIEW_INVESTOR_LIST: 'view_investor_list',

  // Approvals
  VOTE_ON_MODIFICATIONS: 'vote_on_modifications',
  CREATE_MODIFICATION: 'create_modification',
  VIEW_APPROVAL_CHAIN: 'view_approval_chain',

  // Profile
  VIEW_PROFILE: 'view_profile',
  EDIT_PROFILE: 'edit_profile',
  VIEW_SETTINGS: 'view_settings',

  // Admin
  VIEW_ADMIN_DASHBOARD: 'view_admin_dashboard',
  MANAGE_USERS: 'manage_users',
};

// Role → Permissions mapping (authoritative, server-side)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  guest: [],
  investor: [
    BACKEND_PERMISSIONS.VIEW_PORTFOLIO,
    BACKEND_PERMISSIONS.VIEW_INVESTMENTS,
    BACKEND_PERMISSIONS.VIEW_REPORTS,
    BACKEND_PERMISSIONS.VIEW_ANALYTICS,
    BACKEND_PERMISSIONS.CREATE_PROJECT,
    BACKEND_PERMISSIONS.VIEW_PROJECT_DETAILS,
    BACKEND_PERMISSIONS.VOTE_ON_MODIFICATIONS,
    BACKEND_PERMISSIONS.VIEW_APPROVAL_CHAIN,
    BACKEND_PERMISSIONS.VIEW_PROFILE,
    BACKEND_PERMISSIONS.EDIT_PROFILE,
    BACKEND_PERMISSIONS.VIEW_SETTINGS,
  ],
  project_admin: [
    // Inherits investor permissions + management
    BACKEND_PERMISSIONS.ADD_INVESTOR,
    BACKEND_PERMISSIONS.REMOVE_INVESTOR,
    BACKEND_PERMISSIONS.VIEW_INVESTOR_LIST,
    BACKEND_PERMISSIONS.EDIT_PROJECT,
    BACKEND_PERMISSIONS.CREATE_MODIFICATION,
  ],
  admin: [
    BACKEND_PERMISSIONS.VIEW_ADMIN_DASHBOARD,
    BACKEND_PERMISSIONS.MANAGE_USERS,
  ],
  super_admin: Object.values(BACKEND_PERMISSIONS), // All permissions
};

/**
 * Get all permissions for a role including inherited ones.
 */
export function getAllPermissionsForRole(role: string): string[] {
  if (role === 'super_admin') return Object.values(BACKEND_PERMISSIONS);

  const directPerms = ROLE_PERMISSIONS[role] || [];

  // Inheritance chain
  const inherited: string[] = [];
  if (role === 'project_admin' || role === 'admin' || role === 'super_admin') {
    inherited.push(...(ROLE_PERMISSIONS['investor'] || []));
  }
  if (role === 'admin' || role === 'super_admin') {
    inherited.push(...(ROLE_PERMISSIONS['project_admin'] || []));
  }

  return [...new Set([...directPerms, ...inherited])];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No specific permissions required
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: { role: string } }>();
    const user = request.user;

    if (!user?.role) return false;

    // Super admin bypasses all checks
    if (user.role === 'super_admin') return true;

    const userPermissions = getAllPermissionsForRole(user.role);
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return true;
  }
}
