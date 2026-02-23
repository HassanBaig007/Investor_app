import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

describe('api service wrapper coverage', () => {
    let mockAxios;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAxios = axios.create();
    });

    it('handles profile endpoints', async () => {
        mockAxios.get.mockResolvedValueOnce({ data: { id: 'u1' } });
        mockAxios.put
            .mockResolvedValueOnce({ data: { id: 'u1', name: 'Updated' } })
            .mockResolvedValueOnce({ data: { pan: 'ABCDE1234F' } });

        const profile = await api.getProfile();
        const updated = await api.updateProfile({ name: 'Updated' });
        const kyc = await api.updateKyc({ pan: 'ABCDE1234F' });

        expect(profile.id).toBe('u1');
        expect(updated.name).toBe('Updated');
        expect(kyc.pan).toBe('ABCDE1234F');
        expect(mockAxios.put).toHaveBeenNthCalledWith(1, '/users/profile', { name: 'Updated' });
        expect(mockAxios.put).toHaveBeenNthCalledWith(2, '/users/kyc', { pan: 'ABCDE1234F' });
    });

    it('normalizes spending list from getSpendings', async () => {
        mockAxios.get.mockResolvedValueOnce({
            data: [
                {
                    _id: 's1',
                    amount: 120,
                    addedBy: { _id: 'u1', name: 'Alice' },
                    approvals: {
                        u1: { status: 'approved', user: { _id: 'u1', name: 'Alice' } },
                    },
                    createdAt: '2026-02-01T10:00:00.000Z',
                },
            ],
        });

        const spendings = await api.getSpendings('p1', { status: 'approved' });

        expect(mockAxios.get).toHaveBeenCalledWith('/finance/spendings', {
            params: {
                projectId: 'p1',
                ownerUserId: undefined,
                status: 'approved',
                fromDate: undefined,
                toDate: undefined,
            },
        });
        expect(spendings[0]).toEqual(expect.objectContaining({
            id: 's1',
            addedById: 'u1',
            fundedById: 'u1',
        }));
        expect(spendings[0].approvals.u1.user).toBe('u1');
    });

    it('maps addSpending payload and normalizes response', async () => {
        mockAxios.post.mockResolvedValueOnce({
            data: { _id: 's2', ledger: { _id: 'l1' }, addedBy: { _id: 'u1' } },
        });

        const result = await api.addSpending({
            projectId: 'p1',
            amount: 500,
            ledger: 'l1',
            subLedger: 'Marketing',
        });

        expect(mockAxios.post).toHaveBeenCalledWith('/finance/spendings', {
            projectId: 'p1',
            amount: 500,
            ledgerId: 'l1',
            subLedger: 'Marketing',
        });
        expect(result.id).toBe('s2');
        expect(result.ledgerId).toBe('l1');
    });

    it('maps createProject payload shape expected by backend', async () => {
        mockAxios.post.mockResolvedValueOnce({ data: { _id: 'p100', name: 'New Project' } });

        await api.createProject({
            name: 'New Project',
            type: 'agri',
            target: '15000',
            expectedReturn: '12%',
            riskLevel: 'medium',
            duration: '12m',
        });

        expect(mockAxios.post).toHaveBeenCalledWith('/projects', {
            name: 'New Project',
            type: 'agri',
            description: '',
            targetAmount: 15000,
            minInvestment: 0,
            riskLevel: 'medium',
            returnRate: '12%',
            duration: '12m',
        });
    });

    it('normalizes modification votes for a single project', async () => {
        mockAxios.get.mockResolvedValueOnce({
            data: [
                {
                    _id: 'm1',
                    project: { _id: 'p1', name: 'P1' },
                    votes: {
                        a: { status: 'approved' },
                        b: { status: 'rejected' },
                    },
                },
            ],
        });

        const modifications = await api.getModifications('p1');

        expect(modifications[0]).toEqual(expect.objectContaining({
            id: 'm1',
            projectId: 'p1',
            projectName: 'P1',
        }));
        expect(modifications[0].votes).toEqual({
            approved: 1,
            rejected: 1,
            pending: 0,
            total: 2,
        });
    });

    it('fetches cross-project modifications and de-dupes by id', async () => {
        mockAxios.get.mockImplementation((url, config) => {
            if (url === '/projects') {
                return Promise.resolve({ data: [{ _id: 'p1', name: 'P1' }, { _id: 'p2', name: 'P2' }] });
            }
            if (url === '/modifications' && config?.params?.projectId === 'p1') {
                return Promise.resolve({ data: [{ _id: 'm1', project: 'p1' }] });
            }
            if (url === '/modifications' && config?.params?.projectId === 'p2') {
                return Promise.resolve({ data: [{ _id: 'm1', project: 'p2' }, { _id: 'm2', project: 'p2' }] });
            }
            return Promise.resolve({ data: [] });
        });

        const modifications = await api.getModifications();

        expect(modifications).toHaveLength(2);
        expect(modifications.map((m) => m.id).sort()).toEqual(['m1', 'm2']);
    });

    it('normalizes settings on read and maps legacy fields', async () => {
        mockAxios.get.mockResolvedValueOnce({
            data: {
                darkMode: true,
                biometric: true,
                language: 'en',
                currency: 'INR',
                notifications: {
                    push: false,
                    email: true,
                    approvals: false,
                    spendingAlerts: true,
                },
            },
        });

        const settings = await api.getSettings();

        expect(settings).toEqual({
            theme: 'dark',
            darkMode: true,
            biometricEnabled: true,
            language: 'en',
            currency: 'INR',
            notifications: {
                pushEnabled: false,
                emailEnabled: true,
                approvalReminders: false,
                reportAlerts: true,
            },
        });
    });

    it('updateSettings merges current and input notifications before backend put', async () => {
        mockAxios.get.mockResolvedValueOnce({
            data: {
                darkMode: false,
                notifications: {
                    push: false,
                    email: true,
                    approvals: true,
                    spendingAlerts: false,
                },
            },
        });
        mockAxios.put.mockResolvedValueOnce({
            data: {
                settings: {
                    darkMode: true,
                    biometric: false,
                    language: 'en',
                    currency: 'INR',
                    notifications: {
                        push: true,
                        email: true,
                        approvals: true,
                        spendingAlerts: false,
                    },
                },
            },
        });

        const result = await api.updateSettings({
            theme: 'dark',
            notifications: { pushEnabled: true },
        });

        expect(mockAxios.put).toHaveBeenCalledWith('/users/settings', {
            darkMode: true,
            biometric: false,
            language: 'en',
            currency: 'INR',
            notifications: {
                push: true,
                email: true,
                approvals: true,
                spendingAlerts: false,
            },
        });
        expect(result.theme).toBe('dark');
        expect(result.notifications.pushEnabled).toBe(true);
    });

    it('updateNotificationPreferences maps compact payload and returns normalized notifications', async () => {
        mockAxios.get.mockResolvedValueOnce({
            data: {
                notifications: {
                    pushEnabled: false,
                    emailEnabled: true,
                    approvalReminders: true,
                    reportAlerts: false,
                },
            },
        });
        mockAxios.put.mockResolvedValueOnce({
            data: {
                settings: {
                    notifications: {
                        push: true,
                        email: true,
                        approvals: false,
                        spendingAlerts: true,
                    },
                },
            },
        });

        const notifications = await api.updateNotificationPreferences({
            pushEnabled: true,
            approvalReminders: false,
        });

        expect(mockAxios.put).toHaveBeenCalledWith('/users/settings/notifications', {
            push: true,
            email: true,
            approvals: false,
            spendingAlerts: false,
        });
        expect(notifications).toEqual({
            pushEnabled: true,
            emailEnabled: true,
            approvalReminders: false,
            reportAlerts: true,
        });
    });

    it('handles project invite endpoints and addInvestor call variants', async () => {
        mockAxios.post
            .mockResolvedValueOnce({ data: { _id: 'p1' } })
            .mockResolvedValueOnce({ data: { accepted: true } })
            .mockResolvedValueOnce({ data: { declined: true } })
            .mockResolvedValueOnce({ data: { _id: 'p1', investors: [] } });
        mockAxios.get.mockResolvedValueOnce({ data: [{ _id: 'u20' }] });

        const candidates = await api.getProjectInviteCandidates('p1');
        const invited = await api.inviteUserToProject('p1', 'u20', 'active');
        const accepted = await api.acceptInvitation('p1');
        const declined = await api.declineInvitation('p1');
        const added = await api.addInvestor('p1', 'u30', undefined, 'passive');

        expect(candidates).toHaveLength(1);
        expect(invited._id).toBe('p1');
        expect(accepted.accepted).toBe(true);
        expect(declined.declined).toBe(true);
        expect(added.success).toBe(true);
    });

    it('supports bulk spending summary shortcut and endpoint call', async () => {
        const empty = await api.getBulkSpendingSummary([]);
        expect(empty).toEqual({ summaries: [] });

        mockAxios.get.mockResolvedValueOnce({ data: { summaries: [{ projectId: 'p1' }] } });
        const populated = await api.getBulkSpendingSummary(['p1', 'p2']);

        expect(mockAxios.get).toHaveBeenCalledWith('/finance/spending-summary/bulk', {
            params: { projectIds: 'p1,p2' },
        });
        expect(populated.summaries).toHaveLength(1);
    });

    it('normalizes ledger operations', async () => {
        mockAxios.get
            .mockResolvedValueOnce({ data: [{ _id: 'l1', subLedgers: ['S1'] }] })
            .mockResolvedValueOnce({ data: { _id: 'l1', subLedgers: [] } });
        mockAxios.post.mockResolvedValueOnce({ data: { _id: 'l2', subLedgers: [] } });
        mockAxios.put.mockResolvedValueOnce({ data: { _id: 'l2', subLedgers: ['S2'] } });
        mockAxios.delete.mockResolvedValueOnce({ data: { deleted: true } });

        const ledgers = await api.getLedgers('p1');
        const one = await api.getLedger('l1');
        const created = await api.createLedger({ projectId: 'p1', name: 'Ops' });
        const updated = await api.updateLedger('l2', { name: 'Ops+' });
        const deleted = await api.deleteLedger('l2');

        expect(ledgers[0].id).toBe('l1');
        expect(one.id).toBe('l1');
        expect(created.id).toBe('l2');
        expect(updated.subLedgers).toEqual(['S2']);
        expect(deleted.deleted).toBe(true);
    });

    it('clears auth tokens after account deletion', async () => {
        mockAxios.delete.mockResolvedValueOnce({ data: { success: true } });

        const result = await api.deleteAccount('Secret123!');

        expect(mockAxios.delete).toHaveBeenCalledWith('/users/account', {
            data: { password: 'Secret123!' },
        });
        expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['token', 'refreshToken']);
        expect(result.success).toBe(true);
    });

    it('exposes metadata and legal wrappers plus active base url getter', async () => {
        mockAxios.get
            .mockResolvedValueOnce({ data: ['agri', 'real-estate'] })
            .mockResolvedValueOnce({ data: ['low', 'medium', 'high'] })
            .mockResolvedValueOnce({ data: [{ id: 'mp1' }] })
            .mockResolvedValueOnce({ data: [{ id: 'n1' }] })
            .mockResolvedValueOnce({ data: { id: 'privacy-policy' } })
            .mockResolvedValueOnce({ data: { id: 'terms-of-service' } });

        const types = await api.getProjectTypes();
        const risks = await api.getRiskLevels();
        const prices = await api.getMarketPrices();
        const news = await api.getNews();
        const privacy = await api.getPrivacyPolicy();
        const terms = await api.getTermsOfService();
        const baseUrl = api.getBaseUrl();

        expect(types).toHaveLength(2);
        expect(risks).toContain('medium');
        expect(prices[0].id).toBe('mp1');
        expect(news[0].id).toBe('n1');
        expect(privacy.id).toBe('privacy-policy');
        expect(terms.id).toBe('terms-of-service');
        expect(typeof baseUrl).toBe('string');
        expect(baseUrl.length).toBeGreaterThan(0);
    });
});
