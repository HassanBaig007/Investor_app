import {
    ROLES,
    PERMISSIONS,
    hasPermission,
    getAllPermissions,
    isProjectAdmin,
    isProjectInvestor
} from '../permissions';

describe('permissions logic', () => {

    describe('hasPermission', () => {
        it('should return false if role or permission is missing', () => {
            expect(hasPermission(null, PERMISSIONS.VIEW_PORTFOLIO)).toBe(false);
            expect(hasPermission(ROLES.INVESTOR, null)).toBe(false);
        });

        it('should allow everything for SUPER_ADMIN', () => {
            expect(hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.DELETE_PROJECT)).toBe(true);
            expect(hasPermission(ROLES.SUPER_ADMIN, 'random_permission')).toBe(true);
        });

        it('should allow INVESTOR to view portfolio', () => {
            expect(hasPermission(ROLES.INVESTOR, PERMISSIONS.VIEW_PORTFOLIO)).toBe(true);
        });

        it('should NOT allow INVESTOR to add investors', () => {
            expect(hasPermission(ROLES.INVESTOR, PERMISSIONS.ADD_INVESTOR)).toBe(false);
        });

        it('should allow PROJECT_ADMIN to add investors', () => {
            expect(hasPermission(ROLES.PROJECT_ADMIN, PERMISSIONS.ADD_INVESTOR)).toBe(true);
        });

        it('should allow PROJECT_ADMIN to inherit INVESTOR permissions', () => {
            expect(hasPermission(ROLES.PROJECT_ADMIN, PERMISSIONS.VIEW_PORTFOLIO)).toBe(true);
        });

        it('should return false for unknown roles', () => {
            expect(hasPermission('unknown_role', PERMISSIONS.VIEW_PORTFOLIO)).toBe(false);
        });
    });

    describe('getAllPermissions', () => {
        it('should return all permissions for SUPER_ADMIN', () => {
            const perms = getAllPermissions(ROLES.SUPER_ADMIN);
            expect(perms.length).toBe(Object.values(PERMISSIONS).length);
        });

        it('should return a specific list for INVESTOR', () => {
            const perms = getAllPermissions(ROLES.INVESTOR);
            expect(perms).toContain(PERMISSIONS.VIEW_PORTFOLIO);
            expect(perms).not.toContain(PERMISSIONS.ADD_INVESTOR);
        });

        it('should include inherited permissions for PROJECT_ADMIN', () => {
            const perms = getAllPermissions(ROLES.PROJECT_ADMIN);
            expect(perms).toContain(PERMISSIONS.ADD_INVESTOR); // Own
            expect(perms).toContain(PERMISSIONS.VIEW_PORTFOLIO); // Inherited
        });
    });

    describe('isProjectAdmin', () => {
        const userId = 'user123';

        it('should return true if user is in projectAdmins list', () => {
            const project = { projectAdmins: ['user123', 'other'] };
            expect(isProjectAdmin(userId, project)).toBe(true);
        });

        it('should return true if user is the creator', () => {
            const project = { createdBy: 'user123', projectAdmins: [] };
            expect(isProjectAdmin(userId, project)).toBe(true);
        });

        it('should return false if user is neither', () => {
            const project = { createdBy: 'admin', projectAdmins: ['other'], ownerUserId: 'other' };
            expect(isProjectAdmin(userId, project)).toBe(false);
        });

        it('should return false if inputs are missing', () => {
            expect(isProjectAdmin(null, {})).toBe(false);
            expect(isProjectAdmin('id', null)).toBe(false);
        });
    });

    describe('isProjectInvestor', () => {
        const userId = 'user123';

        it('should return true if user is in projectInvestors list', () => {
            const project = { projectInvestors: ['user123', 'other'] };
            expect(isProjectInvestor(userId, project)).toBe(true);
        });

        it('should return false if user is not in list', () => {
            const project = { projectInvestors: ['other'] };
            expect(isProjectInvestor(userId, project)).toBe(false);
        });

        it('should handle undefined lists', () => {
            const project = {};
            expect(isProjectInvestor(userId, project)).toBe(false);
        });
    });
});
