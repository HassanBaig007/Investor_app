import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

// Mock axios
jest.mock('axios', () => {
    const mAxiosInstance = {
        create: jest.fn().mockReturnThis(),
        interceptors: {
            request: { use: jest.fn(), eject: jest.fn() },
            response: { use: jest.fn(), eject: jest.fn() },
        },
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        defaults: { headers: { common: {} }, baseURL: '' },
    };
    return {
        create: jest.fn(() => mAxiosInstance),
        ...mAxiosInstance
    };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
}));

describe('api service', () => {
    let mockAxios;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAxios = axios.create();
    });

    describe('api.login', () => {
        it('should call /auth/login and persist tokens on success', async () => {
            const mockResponse = {
                data: {
                    access_token: 'new-at',
                    refresh_token: 'new-rt',
                    user: { id: '123' }
                }
            };
            mockAxios.post.mockResolvedValueOnce(mockResponse);

            const result = await api.login('user@test.com', 'password123');

            expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', {
                identifier: 'user@test.com',
                email: 'user@test.com',
                password: 'password123'
            });
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'new-at');
            expect(result.user.id).toBe('123');
        });
    });

    describe('api.logout', () => {
        it('should call /auth/logout and clear tokens', async () => {
            mockAxios.post.mockResolvedValueOnce({ data: { success: true } });
            await api.logout();
            expect(mockAxios.post).toHaveBeenCalledWith('/auth/logout');
            expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['token', 'refreshToken']);
        });
    });

    describe('api.getAdminStats', () => {
        it('should fetch stats from /admin/stats', async () => {
            mockAxios.get.mockResolvedValueOnce({ data: { activeProjects: 10 } });
            const result = await api.getAdminStats();
            expect(mockAxios.get).toHaveBeenCalledWith('/admin/stats');
            expect(result.activeProjects).toBe(10);
        });
    });
});
