import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROLES, hasPermission, getAllPermissions, isProjectAdmin } from '../utils/permissions';
import { updateFromBackendConfig } from '../utils/validationUtils';
import { api } from '../services/api';

// Create the Auth Context
const AuthContext = createContext(null);

// Storage keys
const STORAGE_KEYS = {
    HAS_LOGGED_IN_BEFORE: 'splitflow_has_logged_in_before',
    SHOW_INFO_MODAL: 'splitflow_show_info_modal',
};

/**
 * AuthProvider - Centralized authentication and RBAC state management
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

    /**
     * Check if user has logged in before
     */
    const checkFirstTimeUser = useCallback(async () => {
        try {
            const hasLoggedInBefore = await AsyncStorage.getItem(STORAGE_KEYS.HAS_LOGGED_IN_BEFORE);
            return hasLoggedInBefore !== 'true';
        } catch {
            return true; // Assume first time if error
        }
    }, []);

    /**
     * Mark user as having logged in
     */
    const markAsLoggedIn = useCallback(async () => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.HAS_LOGGED_IN_BEFORE, 'true');
        } catch (error) {
            console.log('Error saving login state:', error);
        }
    }, []);

    /**
     * Dismiss the info modal and save state
     */
    const dismissInfoModal = useCallback(async () => {
        setShowInfoModal(false);
        setIsFirstTimeUser(false);
        await markAsLoggedIn();
    }, [markAsLoggedIn]);

    // Storage key for onboarding status (matches App.js)
    const ONBOARDING_KEY_PREFIX = 'splitflow_onboarded_';

    /**
     * Check onboarding status for user
     */
    const checkOnboardingStatus = useCallback(async (userId) => {
        try {
            const key = `${ONBOARDING_KEY_PREFIX}${userId}`;
            const hasCompletedOnboarding = await AsyncStorage.getItem(key);
            return hasCompletedOnboarding === 'true';
        } catch (error) {
            console.log('Error checking onboarding status:', error);
            return true; // Default to completed on error to avoid sticking
        }
    }, []);

    /**
     * Login user and set role
     */
    const login = useCallback(async (userData) => {
        // userData will now be the real user object from the backend
        const userId = userData?._id || userData?.id;

        // Check if this is first time user
        const isFirstTime = await checkFirstTimeUser();
        setIsFirstTimeUser(isFirstTime);

        // Check onboarding status
        const onboarded = await checkOnboardingStatus(userId);
        setIsOnboarded(onboarded);

        const loggedInUser = {
            ...userData,
            id: userId,
            role: userData.role || ROLES.INVESTOR,
            permissions: getAllPermissions(userData.role || ROLES.INVESTOR),
            isFirstTimeUser: isFirstTime,
        };

        setUser(loggedInUser);
        setIsAuthenticated(true);

        // Asynchronously fetch authoritative permissions and app config from backend (non-blocking)
        Promise.all([
            api.getMyPermissions().catch(() => null),
            api.getAppConfig().catch(() => null),
        ]).then(([serverPerms, appConfig]) => {
            if (serverPerms?.permissions?.length > 0) {
                setUser(prev => ({ ...prev, permissions: serverPerms.permissions }));
            }
            // Update validation rules from backend config (password policy, disposable emails)
            if (appConfig) {
                updateFromBackendConfig(appConfig);
            }
        });

        // Show info modal only for first time users
        if (isFirstTime) {
            setShowInfoModal(true);
        }

        return { success: true, user: loggedInUser };
    }, [checkFirstTimeUser, checkOnboardingStatus]);

    /**
     * Restore session on app start
     */
    useEffect(() => {
        let isStopped = false;
        const restore = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token && !isAuthenticated && !isStopped) {
                    const userData = await api.getProfile();
                    if (!isStopped) await login(userData);
                }
            } catch (error) {
                console.log('Session restoration failed:', error);
            }
        };
        restore();
        return () => { isStopped = true; };
    }, [isAuthenticated, login]);


    /**
     * Logout user
     */
    const logout = useCallback(async () => {
        await AsyncStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    /**
     * Check if current user has a specific permission
     */
    const checkPermission = useCallback((permission) => {
        if (!user) return false;
        return hasPermission(user.role, permission);
    }, [user]);

    /**
     * Check if user is admin of a specific project
     */
    const checkProjectAdmin = useCallback((project) => {
        if (!user) return false;
        return isProjectAdmin(user.id, project);
    }, [user]);

    /**
     * Get user's effective role for a project
     * (Could be elevated to PROJECT_ADMIN if they created the project)
     */
    const getProjectRole = useCallback((project) => {
        if (!user) return ROLES.GUEST;
        if (isProjectAdmin(user.id, project)) return ROLES.PROJECT_ADMIN;
        return user.role;
    }, [user]);

    /**
     * Mark onboarding as complete
     */
    const completeOnboarding = useCallback(async () => {
        if (user?.id) {
            try {
                const key = `${ONBOARDING_KEY_PREFIX}${user.id}`;
                await AsyncStorage.setItem(key, 'true');
                setIsOnboarded(true);
            } catch (error) {
                console.log('Error saving onboarding status:', error);
            }
        } else {
            setIsOnboarded(true);
        }
    }, [user]);

    const value = React.useMemo(() => ({
        // State
        user,
        isAuthenticated,
        isOnboarded,
        showInfoModal,
        isFirstTimeUser,

        // Actions
        login,
        logout,
        completeOnboarding,
        dismissInfoModal,

        // RBAC helpers
        checkPermission,
        checkProjectAdmin,
        getProjectRole,
        hasPermission: (permission) => checkPermission(permission),
    }), [user, isAuthenticated, isOnboarded, showInfoModal, isFirstTimeUser, login, logout, completeOnboarding, dismissInfoModal, checkPermission, checkProjectAdmin, getProjectRole]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

/**
 * useAuth hook - Access auth context from any component
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

/**
 * ProtectedComponent - Wrapper that checks permissions before rendering
 */
export function ProtectedComponent({ permission, fallback = null, children }) {
    const { checkPermission } = useAuth();

    if (!checkPermission(permission)) {
        return fallback;
    }

    return children;
}

ProtectedComponent.propTypes = {
    permission: PropTypes.string.isRequired,
    fallback: PropTypes.node,
    children: PropTypes.node.isRequired,
};

export default AuthContext;
