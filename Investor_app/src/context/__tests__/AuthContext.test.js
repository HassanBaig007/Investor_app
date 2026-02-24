import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../AuthContext';
import { api } from '../../services/api';

const mockIsSensorAvailable = jest.fn();
const mockSimplePrompt = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
}));

jest.mock('react-native-biometrics', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        isSensorAvailable: mockIsSensorAvailable,
        simplePrompt: mockSimplePrompt,
    })),
}));

jest.mock('../../utils/validationUtils', () => ({
    ...jest.requireActual('../../utils/validationUtils'),
    updateFromBackendConfig: jest.fn(),
}));

jest.mock('../../services/api', () => ({
    api: {
        getProfile: jest.fn(),
        getMyPermissions: jest.fn(),
        getAppConfig: jest.fn(),
        updateSettings: jest.fn(),
        login: jest.fn(),
    },
}));

describe('AuthContext', () => {
    let latestAuth;
    let storage;

    const Consumer = () => {
        latestAuth = useAuth();
        return (
            <Text testID="auth-state">
                {latestAuth.isAuthenticated ? 'authenticated' : 'guest'}
            </Text>
        );
    };

    const renderProvider = () => render(
        <AuthProvider>
            <Consumer />
        </AuthProvider>,
    );

    beforeEach(() => {
        latestAuth = undefined;
        storage = {};
        jest.clearAllMocks();

        AsyncStorage.getItem.mockImplementation(async (key) => (
            Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null
        ));
        AsyncStorage.setItem.mockImplementation(async (key, value) => {
            storage[key] = value;
        });
        AsyncStorage.removeItem.mockImplementation(async (key) => {
            delete storage[key];
        });
        AsyncStorage.multiRemove.mockImplementation(async (keys) => {
            keys.forEach((key) => delete storage[key]);
        });

        mockIsSensorAvailable.mockResolvedValue({ available: true, biometryType: 'TouchID' });
        mockSimplePrompt.mockResolvedValue({ success: true });

        api.getProfile.mockResolvedValue({ _id: 'restored-user' });
        api.getMyPermissions.mockResolvedValue({ permissions: ['can_view'] });
        api.getAppConfig.mockResolvedValue({ validation: {} });
        api.updateSettings.mockResolvedValue({ success: true });
        api.login.mockResolvedValue({ success: true, user: { _id: 'bio-user' } });
    });

    it('throws when useAuth is used outside provider', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const BadConsumer = () => {
            useAuth();
            return null;
        };

        expect(() => render(<BadConsumer />)).toThrow('useAuth must be used within an AuthProvider');
        errorSpy.mockRestore();
    });

    it('login sets authenticated state and first-time modal', async () => {
        renderProvider();
        await waitFor(() => expect(latestAuth).toBeDefined());

        await act(async () => {
            await latestAuth.login({ _id: 'user-1', role: 'investor', name: 'Ada Lovelace' });
        });

        expect(latestAuth.isAuthenticated).toBe(true);
        expect(latestAuth.user.id).toBe('user-1');
        expect(latestAuth.showInfoModal).toBe(true);
        await waitFor(() => expect(latestAuth.user.permissions).toEqual(['can_view']));
    });

    it('dismissInfoModal updates persisted first-login flag', async () => {
        renderProvider();
        await waitFor(() => expect(latestAuth).toBeDefined());

        await act(async () => {
            await latestAuth.login({ _id: 'user-2', role: 'investor', name: 'Grace Hopper' });
        });
        expect(latestAuth.showInfoModal).toBe(true);

        await act(async () => {
            await latestAuth.dismissInfoModal();
        });

        expect(storage.splitflow_has_logged_in_before).toBe('true');
        expect(latestAuth.showInfoModal).toBe(false);
    });

    it('disableBiometric clears persisted credentials and server setting', async () => {
        storage.splitflow_biometric_enabled = 'true';
        storage.splitflow_biometric_creds = 'encoded-creds';
        renderProvider();
        await waitFor(() => expect(latestAuth).toBeDefined());

        const result = await latestAuth.disableBiometric();

        expect(result).toEqual({ success: true });
        expect(storage.splitflow_biometric_enabled).toBe('false');
        expect(storage.splitflow_biometric_creds).toBeUndefined();
        expect(api.updateSettings).toHaveBeenCalledWith({ biometricEnabled: false });
    });

    it('loginWithBiometric fails when biometric is disabled', async () => {
        storage.splitflow_biometric_enabled = 'false';
        renderProvider();
        await waitFor(() => expect(latestAuth).toBeDefined());

        const result = await latestAuth.loginWithBiometric();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Biometric login is not enabled.');
        expect(api.login).not.toHaveBeenCalled();
    });

    it('logout clears token and resets auth state', async () => {
        renderProvider();
        await waitFor(() => expect(latestAuth).toBeDefined());

        await act(async () => {
            await latestAuth.login({ _id: 'user-3', role: 'investor', name: 'Alan Turing' });
        });
        expect(latestAuth.isAuthenticated).toBe(true);

        await act(async () => {
            await latestAuth.logout();
        });

        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
        expect(latestAuth.isAuthenticated).toBe(false);
        expect(latestAuth.user).toBeNull();
    });

    it('restores session when token exists', async () => {
        storage.token = 'jwt-token';
        api.getProfile.mockResolvedValue({ _id: 'restored', role: 'investor', name: 'Restored User' });

        renderProvider();

        await waitFor(() => expect(api.getProfile).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(latestAuth.isAuthenticated).toBe(true));
        expect(latestAuth.user.id).toBe('restored');
    });

    it('loginWithBiometric fails when credentials are missing', async () => {
        storage.splitflow_biometric_enabled = 'true';
        renderProvider();
        await waitFor(() => expect(latestAuth).toBeDefined());

        const result = await latestAuth.loginWithBiometric();

        expect(result.success).toBe(false);
        expect(result.error).toBe('No stored credentials. Please login with password first.');
        expect(api.login).not.toHaveBeenCalled();
    });

    it('exposes permission and project role helpers', async () => {
        renderProvider();
        await waitFor(() => expect(latestAuth).toBeDefined());
        await act(async () => {
            await latestAuth.login({ _id: 'user-4', role: 'investor', name: 'User Four' });
        });

        expect(latestAuth.checkPermission('create_project')).toBe(true);
        expect(latestAuth.hasPermission('view_profile')).toBe(true);
        expect(latestAuth.checkProjectAdmin({ createdBy: 'user-4' })).toBe(true);
        expect(latestAuth.getProjectRole({ createdBy: 'user-4' })).toBe('project_admin');
    });

    it('completeOnboarding stores onboarding flag for logged-in user', async () => {
        renderProvider();
        await waitFor(() => expect(latestAuth).toBeDefined());
        await act(async () => {
            await latestAuth.login({ _id: 'user-5', role: 'investor', name: 'User Five' });
        });

        await act(async () => {
            await latestAuth.completeOnboarding();
        });

        expect(storage['splitflow_onboarded_user-5']).toBe('true');
        expect(latestAuth.isOnboarded).toBe(true);
    });
});
