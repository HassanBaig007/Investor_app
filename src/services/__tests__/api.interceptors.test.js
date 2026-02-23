import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

jest.mock('axios', () => {
    const instance = jest.fn((config) => Promise.resolve({ data: { retried: true }, config }));
    instance.interceptors = {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
    };
    instance.get = jest.fn();
    instance.post = jest.fn();
    instance.put = jest.fn();
    instance.delete = jest.fn();
    instance.defaults = { headers: { common: {} }, baseURL: '' };

    return {
        create: jest.fn(() => instance),
    };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
}));

describe('api interceptor behavior', () => {
    let mockAxios;
    let requestSuccess;
    let responseSuccess;
    let responseError;

    beforeEach(() => {
        mockAxios = axios.create();
        requestSuccess = mockAxios.interceptors.request.use.mock.calls[0][0];
        responseSuccess = mockAxios.interceptors.response.use.mock.calls[0][0];
        responseError = mockAxios.interceptors.response.use.mock.calls[0][1];

        mockAxios.mockClear();
        mockAxios.get.mockReset();
        mockAxios.post.mockReset();
        mockAxios.put.mockReset();
        mockAxios.delete.mockReset();
        AsyncStorage.setItem.mockReset();
        AsyncStorage.getItem.mockReset();
        AsyncStorage.removeItem.mockReset();
        AsyncStorage.multiRemove.mockReset();
    });

    it('attaches bearer token in request interceptor when token exists', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('access-token');
        const config = { headers: {} };

        const nextConfig = await requestSuccess(config);

        expect(AsyncStorage.getItem).toHaveBeenCalledWith('token');
        expect(nextConfig.headers.Authorization).toBe('Bearer access-token');
    });

    it('updates active base url when successful response arrives from another base', async () => {
        const response = {
            config: { baseURL: 'http://10.0.2.2:3000/api' },
            data: { ok: true },
        };

        const result = await responseSuccess(response);

        expect(result).toBe(response);
        expect(mockAxios.defaults.baseURL).toBe('http://10.0.2.2:3000/api');
        expect(api.getBaseUrl()).toBe('http://10.0.2.2:3000');
    });

    it('refreshes token and retries original request on 401', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('refresh-token');
        mockAxios.post.mockResolvedValueOnce({
            data: {
                access_token: 'new-access',
                refresh_token: 'new-refresh',
            },
        });

        const originalRequest = {
            url: '/projects',
            headers: {},
            baseURL: 'http://localhost:3000/api',
        };

        const retried = await responseError({
            config: originalRequest,
            response: { status: 401 },
            message: 'Unauthorized',
        });

        expect(mockAxios.post).toHaveBeenCalledWith('/auth/refresh', {
            refreshToken: 'refresh-token',
        });
        expect(AsyncStorage.setItem).toHaveBeenNthCalledWith(1, 'token', 'new-access');
        expect(AsyncStorage.setItem).toHaveBeenNthCalledWith(2, 'refreshToken', 'new-refresh');
        expect(originalRequest._retry).toBe(true);
        expect(originalRequest.headers.Authorization).toBe('Bearer new-access');
        expect(retried.data.retried).toBe(true);
    });

    it('clears tokens when refresh flow fails', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('refresh-token');
        mockAxios.post.mockRejectedValueOnce(new Error('refresh failed'));

        const originalRequest = {
            url: '/projects',
            headers: {},
            baseURL: 'http://localhost:3000/api',
        };

        await expect(
            responseError({
                config: originalRequest,
                response: { status: 401 },
                message: 'Unauthorized',
            }),
        ).rejects.toThrow('refresh failed');

        expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['token', 'refreshToken']);
    });

    it('does not refresh auth endpoints and still clears tokens on 401', async () => {
        const error = {
            config: { url: '/auth/login', headers: {} },
            response: { status: 401, data: { message: 'Invalid credentials' } },
            message: 'Unauthorized',
        };

        await expect(responseError(error)).rejects.toBe(error);

        expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['token', 'refreshToken']);
        expect(error.friendlyMessage).toBe('Invalid credentials');
    });

    it('coalesces concurrent 401 retries into a single refresh request', async () => {
        AsyncStorage.getItem.mockResolvedValue('refresh-token');
        mockAxios.post.mockResolvedValueOnce({
            data: {
                access_token: 'new-access',
                refresh_token: 'new-refresh',
            },
        });

        const firstRequest = {
            url: '/projects',
            headers: {},
            baseURL: 'http://localhost:3000/api',
        };
        const secondRequest = {
            url: '/finance/spendings',
            headers: {},
            baseURL: 'http://localhost:3000/api',
        };

        const [firstResult, secondResult] = await Promise.all([
            responseError({
                config: firstRequest,
                response: { status: 401 },
                message: 'Unauthorized',
            }),
            responseError({
                config: secondRequest,
                response: { status: 401 },
                message: 'Unauthorized',
            }),
        ]);

        expect(mockAxios.post).toHaveBeenCalledTimes(1);
        expect(firstRequest.headers.Authorization).toBe('Bearer new-access');
        expect(secondRequest.headers.Authorization).toBe('Bearer new-access');
        expect(firstResult.data.retried).toBe(true);
        expect(secondResult.data.retried).toBe(true);
    });

    it('clears tokens when refresh response is missing token pair', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('refresh-token');
        mockAxios.post.mockResolvedValueOnce({
            data: {
                access_token: 'new-access',
            },
        });

        const originalRequest = {
            url: '/projects',
            headers: {},
            baseURL: 'http://localhost:3000/api',
        };

        await expect(
            responseError({
                config: originalRequest,
                response: { status: 401 },
                message: 'Unauthorized',
            }),
        ).rejects.toThrow('Refresh response missing tokens');

        expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['token', 'refreshToken']);
    });
});
