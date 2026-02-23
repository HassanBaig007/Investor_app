import axios from 'axios';
import { api } from '../api';

jest.mock('axios', () => {
    const instance = {
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
        create: jest.fn(() => instance),
    };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
}));

describe('api stress/volume behavior', () => {
    let mockAxios;

    beforeEach(() => {
        mockAxios = axios.create();
        mockAxios.get.mockReset();
        mockAxios.post.mockReset();
        mockAxios.put.mockReset();
        mockAxios.delete.mockReset();
    });

    it('normalizes high-volume spending payloads without losing IDs', async () => {
        const spendings = Array.from({ length: 500 }, (_, i) => ({
            _id: `s-${i}`,
            amount: i + 1,
            addedBy: { _id: `u-${i % 17}`, name: `User ${i % 17}` },
            fundedBy: { _id: `u-${(i + 3) % 17}`, name: `User ${(i + 3) % 17}` },
            ledger: { _id: `l-${i % 9}`, name: `Ledger ${i % 9}` },
            approvals: {
                [`u-${i % 17}`]: {
                    status: i % 2 === 0 ? 'approved' : 'rejected',
                    user: { _id: `u-${i % 17}`, name: `User ${i % 17}` },
                },
            },
            createdAt: '2026-02-01T10:00:00.000Z',
        }));

        mockAxios.get.mockResolvedValueOnce({ data: spendings });

        const result = await api.getSpendings('project-1');

        expect(result).toHaveLength(500);
        expect(result[0]).toEqual(expect.objectContaining({
            id: 's-0',
            addedById: 'u-0',
            ledgerId: 'l-0',
        }));
        expect(result[499].id).toBe('s-499');
    });

    it('aggregates and de-duplicates large cross-project modification sets', async () => {
        const projects = Array.from({ length: 80 }, (_, i) => ({
            _id: `p-${i}`,
            name: `Project ${i}`,
            investors: [{ role: 'active' }, { role: 'active' }, { role: 'active' }],
        }));

        mockAxios.get.mockImplementation((url, config) => {
            if (url === '/projects') {
                return Promise.resolve({ data: projects });
            }

            if (url === '/modifications') {
                const pid = config?.params?.projectId;
                const numeric = Number(String(pid).split('-')[1] || 0);
                const rows = Array.from({ length: 6 }, (_, idx) => {
                    const sharedId = `global-${idx}`;
                    const uniqueId = `${pid}-m-${idx}`;
                    return {
                        _id: idx % 3 === 0 ? sharedId : uniqueId,
                        project: { _id: pid, name: `Project ${numeric}` },
                        votes: {
                            a: { status: 'approved' },
                            b: { status: idx % 2 === 0 ? 'approved' : 'rejected' },
                        },
                    };
                });
                return Promise.resolve({ data: rows });
            }

            return Promise.resolve({ data: [] });
        });

        const result = await api.getModifications();

        const uniqueIds = new Set(result.map((item) => item.id));
        expect(result.length).toBe(uniqueIds.size);
        expect(result.length).toBeGreaterThan(80);
        expect(result[0]).toHaveProperty('votes');
    });
});
