"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = exports.BACKEND_PERMISSIONS = void 0;
exports.getAllPermissionsForRole = getAllPermissionsForRole;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
exports.BACKEND_PERMISSIONS = {
    VIEW_PORTFOLIO: 'view_portfolio',
    VIEW_INVESTMENTS: 'view_investments',
    VIEW_REPORTS: 'view_reports',
    VIEW_ANALYTICS: 'view_analytics',
    CREATE_PROJECT: 'create_project',
    VIEW_PROJECT_DETAILS: 'view_project_details',
    EDIT_PROJECT: 'edit_project',
    DELETE_PROJECT: 'delete_project',
    ADD_INVESTOR: 'add_investor',
    REMOVE_INVESTOR: 'remove_investor',
    VIEW_INVESTOR_LIST: 'view_investor_list',
    VOTE_ON_MODIFICATIONS: 'vote_on_modifications',
    CREATE_MODIFICATION: 'create_modification',
    VIEW_APPROVAL_CHAIN: 'view_approval_chain',
    VIEW_PROFILE: 'view_profile',
    EDIT_PROFILE: 'edit_profile',
    VIEW_SETTINGS: 'view_settings',
    VIEW_ADMIN_DASHBOARD: 'view_admin_dashboard',
    MANAGE_USERS: 'manage_users',
};
const ROLE_PERMISSIONS = {
    guest: [],
    investor: [
        exports.BACKEND_PERMISSIONS.VIEW_PORTFOLIO,
        exports.BACKEND_PERMISSIONS.VIEW_INVESTMENTS,
        exports.BACKEND_PERMISSIONS.VIEW_REPORTS,
        exports.BACKEND_PERMISSIONS.VIEW_ANALYTICS,
        exports.BACKEND_PERMISSIONS.CREATE_PROJECT,
        exports.BACKEND_PERMISSIONS.VIEW_PROJECT_DETAILS,
        exports.BACKEND_PERMISSIONS.VOTE_ON_MODIFICATIONS,
        exports.BACKEND_PERMISSIONS.VIEW_APPROVAL_CHAIN,
        exports.BACKEND_PERMISSIONS.VIEW_PROFILE,
        exports.BACKEND_PERMISSIONS.EDIT_PROFILE,
        exports.BACKEND_PERMISSIONS.VIEW_SETTINGS,
    ],
    project_admin: [
        exports.BACKEND_PERMISSIONS.ADD_INVESTOR,
        exports.BACKEND_PERMISSIONS.REMOVE_INVESTOR,
        exports.BACKEND_PERMISSIONS.VIEW_INVESTOR_LIST,
        exports.BACKEND_PERMISSIONS.EDIT_PROJECT,
        exports.BACKEND_PERMISSIONS.CREATE_MODIFICATION,
    ],
    admin: [
        exports.BACKEND_PERMISSIONS.VIEW_ADMIN_DASHBOARD,
        exports.BACKEND_PERMISSIONS.MANAGE_USERS,
    ],
    super_admin: Object.values(exports.BACKEND_PERMISSIONS),
};
function getAllPermissionsForRole(role) {
    if (role === 'super_admin')
        return Object.values(exports.BACKEND_PERMISSIONS);
    const directPerms = ROLE_PERMISSIONS[role] || [];
    const inherited = [];
    if (role === 'project_admin' || role === 'admin' || role === 'super_admin') {
        inherited.push(...(ROLE_PERMISSIONS['investor'] || []));
    }
    if (role === 'admin' || role === 'super_admin') {
        inherited.push(...(ROLE_PERMISSIONS['project_admin'] || []));
    }
    return [...new Set([...directPerms, ...inherited])];
}
let PermissionsGuard = class PermissionsGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredPermissions = this.reflector.get('permissions', context.getHandler());
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        const request = context
            .switchToHttp()
            .getRequest();
        const user = request.user;
        if (!user?.role)
            return false;
        if (user.role === 'super_admin')
            return true;
        const userPermissions = getAllPermissionsForRole(user.role);
        const hasPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));
        if (!hasPermission) {
            throw new common_1.ForbiddenException('Insufficient permissions for this action');
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map