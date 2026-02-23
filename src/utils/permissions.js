/**
 * RBAC Permissions and Roles Configuration
 * Defines role hierarchy and permission mappings for InvestFlow
 */

// Role definitions with hierarchy level
export const ROLES = {
    GUEST: 'guest',           // Level 0: Can only view public info
    INVESTOR: 'investor',     // Level 1: Standard investor features
    PROJECT_ADMIN: 'project_admin', // Level 2: Can manage their projects
    SUPER_ADMIN: 'super_admin',     // Level 3: Full platform access (future)
};

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY = {
    [ROLES.GUEST]: 0,
    [ROLES.INVESTOR]: 1,
    [ROLES.PROJECT_ADMIN]: 2,
    [ROLES.SUPER_ADMIN]: 3,
};

// Permission definitions
export const PERMISSIONS = {
    // Portfolio permissions
    VIEW_PORTFOLIO: 'view_portfolio',
    VIEW_INVESTMENTS: 'view_investments',
    VIEW_REPORTS: 'view_reports',
    VIEW_ANALYTICS: 'view_analytics',

    // Project permissions
    CREATE_PROJECT: 'create_project',
    VIEW_PROJECT_DETAILS: 'view_project_details',
    EDIT_PROJECT: 'edit_project',
    DELETE_PROJECT: 'delete_project',

    // Investor management (Project Admin only)
    ADD_INVESTOR: 'add_investor',
    REMOVE_INVESTOR: 'remove_investor',
    VIEW_INVESTOR_LIST: 'view_investor_list',

    // Approval permissions
    VOTE_ON_MODIFICATIONS: 'vote_on_modifications',
    CREATE_MODIFICATION: 'create_modification',
    VIEW_APPROVAL_CHAIN: 'view_approval_chain',

    // Profile permissions
    VIEW_PROFILE: 'view_profile',
    EDIT_PROFILE: 'edit_profile',
    VIEW_SETTINGS: 'view_settings',
};

// Role to Permissions mapping
export const ROLE_PERMISSIONS = {
    [ROLES.GUEST]: [
        // Guests can only view limited public info
    ],

    [ROLES.INVESTOR]: [
        PERMISSIONS.VIEW_PORTFOLIO,
        PERMISSIONS.VIEW_INVESTMENTS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.CREATE_PROJECT,
        PERMISSIONS.VIEW_PROJECT_DETAILS,
        PERMISSIONS.VOTE_ON_MODIFICATIONS,
        PERMISSIONS.VIEW_APPROVAL_CHAIN,
        PERMISSIONS.VIEW_PROFILE,
        PERMISSIONS.EDIT_PROFILE,
        PERMISSIONS.VIEW_SETTINGS,
    ],

    [ROLES.PROJECT_ADMIN]: [
        // Inherits all INVESTOR permissions plus:
        PERMISSIONS.ADD_INVESTOR,
        PERMISSIONS.REMOVE_INVESTOR,
        PERMISSIONS.VIEW_INVESTOR_LIST,
        PERMISSIONS.EDIT_PROJECT,
        PERMISSIONS.CREATE_MODIFICATION,
    ],

    [ROLES.SUPER_ADMIN]: [
        // Has all permissions
        ...Object.values(PERMISSIONS),
    ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (role, permission) => {
    if (!role || !permission) return false;

    // Super admin has all permissions
    if (role === ROLES.SUPER_ADMIN) return true;

    // Get permissions for the role
    const rolePerms = ROLE_PERMISSIONS[role] || [];

    // Check if permission exists in role's permissions
    if (rolePerms.includes(permission)) return true;

    // Check inherited permissions (role hierarchy)

    // If project admin, also include investor permissions
    if (role === ROLES.PROJECT_ADMIN) {
        const investorPerms = ROLE_PERMISSIONS[ROLES.INVESTOR] || [];
        if (investorPerms.includes(permission)) return true;
    }

    return false;
};

/**
 * Get all permissions for a role including inherited ones
 * @param {string} role - User's role
 * @returns {string[]}
 */
export const getAllPermissions = (role) => {
    if (role === ROLES.SUPER_ADMIN) {
        return Object.values(PERMISSIONS);
    }

    let permissions = [...(ROLE_PERMISSIONS[role] || [])];

    // Add inherited permissions based on hierarchy
    const roleLevel = ROLE_HIERARCHY[role] || 0;

    Object.entries(ROLE_HIERARCHY).forEach(([r, level]) => {
        if (level < roleLevel && ROLE_PERMISSIONS[r]) {
            permissions = [...permissions, ...ROLE_PERMISSIONS[r]];
        }
    });

    return [...new Set(permissions)]; // Remove duplicates
};

/**
 * Check if user has project-level admin rights
 * @param {string} userId - Current user ID
 * @param {object} project - Project object with projectAdmins array
 * @returns {boolean}
 */
export const isProjectAdmin = (userId, project) => {
    if (!userId || !project) return false;
    return !!(project.projectAdmins?.includes(userId) || project.createdBy === userId);
};

/**
 * Check if user is an investor in a project
 * @param {string} userId - Current user ID
 * @param {object} project - Project object with projectInvestors array
 * @returns {boolean}
 */
export const isProjectInvestor = (userId, project) => {
    if (!userId || !project) return false;
    return !!project.projectInvestors?.includes(userId);
};
