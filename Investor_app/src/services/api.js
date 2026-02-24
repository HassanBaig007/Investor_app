import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseCandidates, getInitialApiBase } from '../utils/apiConfig';

const stripApiSuffix = (baseUrl) => {
    if (!baseUrl) return null;
    return baseUrl.replace(/\/api\/?$/, '');
};

let apiBaseCandidates = getApiBaseCandidates();
const refreshApiBaseCandidates = () => {
    const latest = getApiBaseCandidates();
    apiBaseCandidates = [...new Set([...latest, ...apiBaseCandidates])];
    return apiBaseCandidates;
};

let activeApiBase = getInitialApiBase();

const setActiveApiBase = (base) => {
    if (!base || base === activeApiBase) return;
    activeApiBase = base;
    instance.defaults.baseURL = `${base}/api`;
    console.log('[API] Switched Base URL:', instance.defaults.baseURL);
};

const API_URL = `${activeApiBase}/api`;
console.log('[API] Base URL:', API_URL);
console.log('[API] Fallback Candidates:', apiBaseCandidates);

const instance = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
    },
});

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

const persistAuthTokens = async ({ accessToken, refreshToken }) => {
    if (accessToken) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
};

const clearAuthTokens = async () => {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
};

let refreshPromise = null;

const getId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value._id || value.id || null;
};

const toPlainObject = (value) => {
    if (!value) return {};
    if (value instanceof Map) return Object.fromEntries(value.entries());
    return value;
};

const normalizeSettings = (settings) => {
    const source = settings || {};
    if (
        source?.theme &&
        typeof source?.biometricEnabled === 'boolean' &&
        source?.notifications?.pushEnabled !== undefined
    ) {
        return source;
    }
    const notifications = source.notifications || {};

    const isDark = source.theme
        ? source.theme === 'dark'
        : !!source.darkMode;

    return {
        theme: isDark ? 'dark' : 'light',
        darkMode: isDark,
        biometricEnabled: source.biometricEnabled ?? source.biometric ?? false,
        language: source.language || 'en',
        currency: source.currency || 'INR',
        notifications: {
            pushEnabled: notifications.pushEnabled ?? notifications.push ?? true,
            emailEnabled: notifications.emailEnabled ?? notifications.email ?? true,
            approvalReminders: notifications.approvalReminders ?? notifications.approvals ?? true,
            reportAlerts: notifications.reportAlerts ?? notifications.spendingAlerts ?? true,
        },
    };
};

const mapSettingsForBackend = (settings) => {
    const source = settings || {};
    const notifications = source.notifications || {};
    const isDark = source.theme
        ? source.theme === 'dark'
        : !!source.darkMode;

    return {
        darkMode: isDark,
        biometric: source.biometricEnabled ?? source.biometric ?? false,
        language: source.language || 'en',
        currency: source.currency || 'INR',
        notifications: {
            push: notifications.pushEnabled ?? notifications.push ?? true,
            email: notifications.emailEnabled ?? notifications.email ?? true,
            approvals: notifications.approvalReminders ?? notifications.approvals ?? true,
            spendingAlerts: notifications.reportAlerts ?? notifications.spendingAlerts ?? true,
        },
    };
};

const normalizeModification = (item, project = null) => {
    if (
        item?.id &&
        item?.projectId &&
        item?.votesSummary &&
        item?.votesMap
    ) {
        return {
            ...item,
            votes: {
                approved: item.votesSummary.approved,
                rejected: item.votesSummary.rejected,
                pending: item.votesSummary.pending,
                total: item.votesSummary.total,
            },
        };
    }

    const votesObject = toPlainObject(item?.votes) || {};
    const voteEntries = Object.entries(votesObject);

    const approved = voteEntries.filter(([, v]) => v?.status === 'approved').length;
    const rejected = voteEntries.filter(([, v]) => v?.status === 'rejected').length;

    const activeInvestors = (project?.investors || []).filter((inv) => inv?.role === 'active').length;
    const totalVotes = activeInvestors || (approved + rejected);
    const pendingVotes = Math.max(totalVotes - approved - rejected, 0);

    const id = getId(item);
    const projectId = getId(item?.project) || getId(project);
    const projectName = item?.projectName || item?.project?.name || project?.name || 'Project';

    return {
        ...item,
        id,
        projectId,
        projectName,
        votesMap: votesObject,
        votes: {
            approved,
            rejected,
            pending: pendingVotes,
            total: totalVotes,
        },
    };
};

const normalizeLedger = (item) => ({
    ...item,
    id: getId(item),
    subLedgers: item?.subLedgers || [],
});

const normalizeSpending = (item) => {
    if (
        item?.id &&
        item?.addedById &&
        item?.fundedById &&
        item?.ledgerId !== undefined &&
        item?.approvals &&
        item?.date &&
        item?.time
    ) {
        return item;
    }

    const addedById = getId(item?.addedBy);
    const fundedById = getId(item?.fundedBy) || addedById;
    const approvalsObject = toPlainObject(item?.approvals) || {};

    // Preserve populated name data before overwriting refs with IDs
    const addedByName = (typeof item?.addedBy === 'object' && item?.addedBy?.name) ? item.addedBy.name : (item?.addedByName || null);
    const fundedByName = (typeof item?.fundedBy === 'object' && item?.fundedBy?.name) ? item.fundedBy.name : (item?.fundedByName || null);

    const approvals = Object.fromEntries(
        Object.entries(approvalsObject).map(([key, value]) => {
            const approvalUserId = getId(value?.user) || String(key);
            const approvalUserName = (typeof value?.user === 'object' && value?.user?.name) ? value.user.name : (value?.userName || null);
            return [String(key), {
                ...value,
                user: approvalUserId,
                userName: approvalUserName,
            }];
        })
    );

    // Derive date and time from createdAt if not present
    let spendingDate = item?.date || null;
    let spendingTime = item?.time || null;
    if (item?.createdAt) {
        const dt = new Date(item.createdAt);
        if (!spendingDate) {
            spendingDate = dt.toISOString().split('T')[0];
        }
        if (!spendingTime) {
            spendingTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }

    return {
        ...item,
        id: getId(item),
        productName: item?.productName || item?.materialType || '',
        ledgerId: getId(item?.ledger) || item?.ledgerId || null,
        addedBy: addedById || item?.addedBy,
        addedById,
        addedByName,
        fundedBy: fundedById,
        fundedById,
        fundedByName,
        date: spendingDate,
        time: spendingTime,
        approvals,
    };
};

// Attach JWT token to every request
instance.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Add response interceptor for global error handling
instance.interceptors.response.use(
    (response) => {
        const responseBase = stripApiSuffix(response?.config?.baseURL);
        if (responseBase) {
            if (!apiBaseCandidates.includes(responseBase)) {
                apiBaseCandidates = [responseBase, ...apiBaseCandidates];
            }
            setActiveApiBase(responseBase);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        const isNetworkError = !error.response && !!originalRequest;
        if (isNetworkError) {
            const candidates = refreshApiBaseCandidates();
            const requestBase = stripApiSuffix(originalRequest.baseURL) || activeApiBase;
            const triedBases = originalRequest._triedApiBases || [requestBase];
            const nextBase = candidates.find((base) => !triedBases.includes(base));

            if (nextBase) {
                originalRequest._triedApiBases = [...triedBases, nextBase];
                originalRequest.baseURL = `${nextBase}/api`;
                console.log('[API] Retry with Base URL:', originalRequest.baseURL);
                return instance(originalRequest);
            }
        }

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            const requestUrl = String(originalRequest.url || '');
            const isAuthRequest = requestUrl.includes('/auth/login')
                || requestUrl.includes('/auth/register')
                || requestUrl.includes('/auth/refresh');

            if (!isAuthRequest) {
                originalRequest._retry = true;
                try {
                    if (!refreshPromise) {
                        refreshPromise = (async () => {
                            const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
                            if (!refreshToken) {
                                throw new Error('No refresh token available');
                            }

                            const refreshResponse = await instance.post('/auth/refresh', { refreshToken });
                            const newAccessToken = refreshResponse?.data?.access_token;
                            const newRefreshToken = refreshResponse?.data?.refresh_token;

                            if (!newAccessToken || !newRefreshToken) {
                                throw new Error('Refresh response missing tokens');
                            }

                            await persistAuthTokens({
                                accessToken: newAccessToken,
                                refreshToken: newRefreshToken,
                            });

                            return newAccessToken;
                        })().finally(() => {
                            refreshPromise = null;
                        });
                    }

                    const newAccessToken = await refreshPromise;
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return instance(originalRequest);
                } catch (refreshError) {
                    await clearAuthTokens();
                    throw refreshError;
                }
            }

            await clearAuthTokens();
        }

        // Enhance error object with backend message
        const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
        error.friendlyMessage = message;

        throw error;
    }
);

export const api = {
    getAdminStats: async () => {
        const response = await instance.get('/admin/stats');
        return response.data;
    },
    // ============================================
    // AUTH
    // ============================================
    login: async (identifier, password) => {
        const normalizedIdentifier = String(identifier || '').trim();
        const response = await instance.post('/auth/login', {
            identifier: normalizedIdentifier,
            email: normalizedIdentifier,
            password,
        });
        if (response.data.access_token || response.data.refresh_token) {
            await persistAuthTokens({
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
            });
        }
        return {
            success: true,
            user: response.data.user || response.data,
            token: response.data.access_token
        };
    },

    logout: async () => {
        try {
            await instance.post('/auth/logout');
        } catch (e) {
            console.error('Logout API failed:', e.message);
        }
        await clearAuthTokens();
        return { success: true };
    },

    // ============================================
    // PROFILE APIs
    // ============================================
    getProfile: async () => {
        const response = await instance.get('/auth/me');
        return response.data;
    },

    updateProfile: async (profileData) => {
        const response = await instance.put('/users/profile', profileData);
        return response.data; // Backend returns the updated user directly
    },

    updateKyc: async (kycData) => {
        const response = await instance.put('/users/kyc', kycData);
        return response.data;
    },

    // ============================================
    // FINANCE APIs
    // ============================================
    getSpendings: async (projectId, options = {}) => {
        const response = await instance.get('/finance/spendings', {
            params: {
                projectId,
                ownerUserId: options.ownerUserId,
                status: options.status,
                fromDate: options.fromDate,
                toDate: options.toDate,
            }
        });
        return (response.data || []).map(normalizeSpending);
    },

    addSpending: async (spendingData) => {
        const payload = {
            ...spendingData,
            ledgerId: spendingData.ledgerId || spendingData.ledger || undefined,
            subLedger: spendingData.subLedger || undefined,
        };
        delete payload.ledger;
        const response = await instance.post('/finance/spendings', payload);
        return normalizeSpending(response.data);
    },

    voteSpending: async (spendingId, vote) => {
        const response = await instance.post(`/finance/spendings/${spendingId}/vote`, { vote });
        return normalizeSpending(response.data);
    },

    // ============================================
    // PROJECTS APIs
    // ============================================
    getProjects: async () => {
        const response = await instance.get('/projects');
        return response.data;
    },

    getProjectById: async (id) => {
        const response = await instance.get(`/projects/${id}`);
        return response.data;
    },

    createProject: async (projectData) => {
        const payload = {
            name: projectData.name,
            type: projectData.type,
            description: projectData.description || '',
            targetAmount: Number(projectData.targetAmount ?? projectData.target ?? 0),
            minInvestment: Number(projectData.minInvestment ?? 0),
            riskLevel: projectData.riskLevel,
            returnRate: projectData.returnRate ?? projectData.expectedReturn,
            duration: projectData.duration,
        };
        const response = await instance.post('/projects', payload);
        return response.data;
    },

    getProjectAnalytics: async () => {
        const response = await instance.get('/projects/analytics');
        return response.data;
    },

    // ============================================
    // MODIFICATIONS APIs
    // ============================================
    getModifications: async (projectId) => {
        if (projectId) {
            const response = await instance.get('/modifications', { params: { projectId } });
            return (response.data || []).map((item) => normalizeModification(item));
        }

        const projectsResponse = await instance.get('/projects');
        const projects = projectsResponse.data || [];

        const settled = await Promise.allSettled(
            projects.map((project) => {
                const id = getId(project);
                if (!id) return Promise.resolve([]);
                return instance
                    .get('/modifications', { params: { projectId: id } })
                    .then((result) => (result.data || []).map((item) => normalizeModification(item, project)));
            })
        );

        const flattened = settled
            .filter((result) => result.status === 'fulfilled')
            .flatMap((result) => result.value || []);

        const deduped = new Map();
        flattened.forEach((item) => {
            const id = item.id || getId(item);
            if (id) deduped.set(id, item);
        });

        return Array.from(deduped.values());
    },

    createModification: async (modData) => {
        const response = await instance.post('/modifications', modData);
        return response.data;
    },

    voteModification: async (modId, vote) => {
        const response = await instance.post(`/modifications/${modId}/vote`, { vote });
        return response.data;
    },

    // ============================================
    // NOTIFICATIONS
    // ============================================
    getNotifications: async () => {
        const response = await instance.get('/notifications');
        return response.data;
    },

    markNotificationRead: async (id) => {
        const response = await instance.post(`/notifications/${id}/read`);
        return response.data;
    },

    deleteNotification: async (id) => {
        const response = await instance.delete(`/notifications/${id}`);
        return response.data;
    },

    // ============================================
    // NEW P1 METHODS
    // ============================================
    register: async (name, email, password, role = 'investor') => {
        const response = await instance.post('/auth/register', { name, email, password, role });
        return response.data;
    },

    addInvestor: async (investorDataOrProjectId, userIdArg, _unusedInvestmentArg, roleArg) => {
        const investorData = typeof investorDataOrProjectId === 'object'
            ? investorDataOrProjectId
            : {
                projectId: investorDataOrProjectId,
                userId: userIdArg,
                role: roleArg,
            };

        const response = await instance.post(`/projects/${investorData.projectId}/investors`, {
            userId: investorData.userId || investorData.id,
            role: investorData.role || 'passive',
        });
        return { success: true, data: response.data };
    },

    approveRequest: async (requestId) => {
        const response = await instance.post(`/modifications/${requestId}/approve`);
        return response.data;
    },

    rejectRequest: async (requestId, reason) => {
        const response = await instance.post(`/modifications/${requestId}/reject`, { reason });
        return response.data;
    },

    // ============================================
    // ANNOUNCEMENTS APIs
    // ============================================
    getAnnouncements: async () => {
        const response = await instance.get('/announcements');
        return response.data;
    },

    getAnnouncementById: async (id) => {
        const response = await instance.get(`/announcements/${id}`);
        return response.data;
    },

    createAnnouncement: async (data) => {
        const response = await instance.post('/announcements', data);
        return { success: true, announcement: response.data };
    },

    deleteAnnouncement: async (id) => {
        const response = await instance.delete(`/announcements/${id}`);
        return response.data;
    },

    markAnnouncementRead: async (id) => {
        const response = await instance.post(`/announcements/${id}/read`);
        return response.data;
    },

    // ============================================
    // PROJECT METADATA APIs
    // ============================================
    getProjectTypes: async () => {
        const response = await instance.get('/projects/metadata/types');
        return response.data;
    },

    getRiskLevels: async () => {
        const response = await instance.get('/projects/metadata/risks');
        return response.data;
    },

    getMarketPrices: async () => {
        const response = await instance.get('/projects/metadata/market-prices');
        return response.data;
    },

    getNews: async () => {
        const response = await instance.get('/projects/metadata/news');
        return response.data;
    },

    updateMarketPrice: async (id, data) => {
        const response = await instance.put(`/projects/metadata/market-prices/${id}`, data);
        return response.data;
    },

    updateMarketNewsItem: async (id, data) => {
        const response = await instance.put(`/projects/metadata/news/${id}`, data);
        return response.data;
    },

    // ============================================
    // INVESTMENTS / PORTFOLIO APIs
    // ============================================
    getPortfolio: async () => {
        const response = await instance.get('/investments/portfolio');
        return response.data;
    },

    getInvestments: async () => {
        const response = await instance.get('/investments');
        return response.data;
    },

    getInvestmentById: async (id) => {
        const response = await instance.get(`/investments/${id}`);
        return response.data;
    },

    getPortfolioAnalytics: async () => {
        const response = await instance.get('/projects/analytics');
        return response.data;
    },

    getQuarterlyReports: async () => {
        const response = await instance.get('/investments/reports');
        return response.data;
    },

    downloadQuarterlyReport: async (reportId, format = 'html') => {
        const response = await instance.get(`/investments/reports/${reportId}/download`, {
            params: { format },
        });
        return response.data;
    },

    // ============================================
    // SETTINGS APIs
    // ============================================
    getSettings: async () => {
        const response = await instance.get('/users/settings');
        return normalizeSettings(response.data);
    },

    updateSettings: async (settingsData) => {
        const currentResponse = await instance.get('/users/settings');
        const currentNormalized = normalizeSettings(currentResponse.data);
        const mergedNotifications = settingsData.notifications
            ? { ...currentNormalized.notifications, ...settingsData.notifications }
            : currentNormalized.notifications;
        const mergedNormalized = {
            ...currentNormalized,
            ...settingsData,
            notifications: mergedNotifications,
        };
        const backendPayload = mapSettingsForBackend(mergedNormalized);
        const response = await instance.put('/users/settings', backendPayload);
        return normalizeSettings(response.data?.settings || response.data);
    },

    updateNotificationPreferences: async (prefs) => {
        const currentResponse = await instance.get('/users/settings');
        const currentNormalized = normalizeSettings(currentResponse.data);
        const mergedNotifications = {
            ...currentNormalized.notifications,
            ...prefs,
        };

        const backendPayload = {
            push: mergedNotifications.pushEnabled,
            email: mergedNotifications.emailEnabled,
            approvals: mergedNotifications.approvalReminders,
            spendingAlerts: mergedNotifications.reportAlerts,
        };

        const response = await instance.put('/users/settings/notifications', backendPayload);
        const responseSettings = response.data?.settings?.notifications || response.data?.notifications || response.data;

        return normalizeSettings({ notifications: responseSettings }).notifications;
    },

    // ============================================
    // USER MANAGEMENT APIs
    // ============================================
    getUsers: async () => {
        const response = await instance.get('/users');
        return response.data;
    },

    getProjectInviteCandidates: async (projectId) => {
        const response = await instance.get(`/projects/${projectId}/invite-candidates`);
        return response.data;
    },

    inviteUserToProject: async (projectId, userId, role = 'passive') => {
        const response = await instance.post(`/projects/${projectId}/invites`, { userId, role });
        return response.data;
    },

    acceptInvitation: async (projectId) => {
        const response = await instance.post(`/projects/${projectId}/invites/accept`);
        return response.data;
    },

    declineInvitation: async (projectId) => {
        const response = await instance.post(`/projects/${projectId}/invites/decline`);
        return response.data;
    },

    changePassword: async (currentPassword, newPassword) => {
        const response = await instance.post('/users/change-password', { currentPassword, newPassword });
        return response.data;
    },

    // ============================================
    // ACCOUNT MANAGEMENT (App Store Compliance)
    // ============================================

    /** Delete user account — required by Apple App Store § 5.1.1 */
    deleteAccount: async (password) => {
        const response = await instance.delete('/users/account', { data: { password } });
        await clearAuthTokens();
        return response.data;
    },

    /** Export all user data (GDPR compliance) */
    exportUserData: async () => {
        const response = await instance.get('/users/export-data');
        return response.data;
    },

    /** Register push notification token with backend */
    registerPushToken: async (pushToken) => {
        const response = await instance.post('/users/push-token', { pushToken });
        return response.data;
    },

    /** Get app configuration (password policy, business rules, etc.) */
    getAppConfig: async () => {
        const response = await instance.get('/users/app-config');
        return response.data;
    },

    getPrivacyPolicy: async () => {
        const response = await instance.get('/legal/privacy-policy');
        return response.data;
    },

    getTermsOfService: async () => {
        const response = await instance.get('/legal/terms');
        return response.data;
    },

    /** Get server-computed permissions for the current user */
    getMyPermissions: async () => {
        const response = await instance.get('/auth/my-permissions');
        return response.data;
    },

    // ============================================
    // CONSOLIDATED FINANCE ENDPOINTS (eliminates N+1 pattern)
    // ============================================

    /** Get all user expenses across projects in one call */
    getMyExpenses: async (options = {}) => {
        const response = await instance.get('/finance/my-expenses', {
            params: {
                fromDate: options.fromDate,
                toDate: options.toDate,
                category: options.category,
                projectId: options.projectId,
                ledgerId: options.ledgerId,
                subLedger: options.subLedger,
                page: options.page,
                limit: options.limit,
            },
        });
        return response.data;
    },

    /** Get server-computed expense analytics */
    getExpenseAnalytics: async (options = {}) => {
        const response = await instance.get('/finance/expense-analytics', {
            params: {
                fromDate: options.fromDate,
                toDate: options.toDate,
            },
        });
        return response.data;
    },

    /** Get pending spending approvals requiring current user's vote */
    getMyPendingApprovals: async () => {
        const response = await instance.get('/finance/my-pending-approvals');
        return response.data;
    },

    /** Get pre-computed spending summary for a project */
    getSpendingSummary: async (projectId) => {
        const response = await instance.get('/finance/spending-summary', {
            params: { projectId },
        });
        return response.data;
    },

    getBulkSpendingSummary: async (projectIds = []) => {
        const ids = (projectIds || []).filter(Boolean);
        if (ids.length === 0) return { summaries: [] };
        const response = await instance.get('/finance/spending-summary/bulk', {
            params: { projectIds: ids.join(',') },
        });
        return response.data;
    },

    /** Server-generated financial report (CSV/XLSX) */
    exportExpenses: async (format = 'csv', options = {}) => {
        const response = await instance.get('/finance/export', {
            params: {
                format,
                fromDate: options.fromDate,
                toDate: options.toDate,
                projectId: options.projectId,
                ledgerId: options.ledgerId,
                subLedger: options.subLedger,
            },
        });
        return response.data;
    },

    /** Server-generated project details report (CSV/XLSX) */
    exportProjectDetails: async (projectId, format = 'xlsx') => {
        const response = await instance.get(`/projects/${projectId}/export`, {
            params: { format },
        });
        return response.data;
    },

    /** Get real performance metrics from backend */
    getPerformanceMetrics: async (period = '6M') => {
        const response = await instance.get('/investments/performance-metrics', {
            params: { period },
        });
        return response.data;
    },

    // ============================================
    // PROJECT MANAGEMENT APIs
    // ============================================
    updateProject: async (projectId, updateData) => {
        const response = await instance.put(`/projects/${projectId}`, updateData);
        return response.data;
    },

    removeInvestor: async (projectId, userId) => {
        const response = await instance.delete(`/projects/${projectId}/investors/${userId}`);
        return response.data;
    },

    updateMemberRole: async (projectId, userId, role) => {
        const response = await instance.put(`/projects/${projectId}/investors/${userId}`, { role });
        return response.data;
    },

    // ============================================
    // FILE UPLOADS
    // ============================================
    uploadFile: async (formData) => {
        const response = await instance.post('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // ============================================
    // BULK NOTIFICATIONS
    // ============================================
    markAllNotificationsRead: async () => {
        const response = await instance.post('/notifications/read-all');
        return response.data;
    },

    // ============================================
    // LEDGER MANAGEMENT
    // ============================================
    getLedgers: async (projectId) => {
        const response = await instance.get('/finance/ledgers', { params: { projectId } });
        return (response.data || []).map(normalizeLedger);
    },

    getLedger: async (ledgerId) => {
        const response = await instance.get(`/finance/ledgers/${ledgerId}`);
        return normalizeLedger(response.data);
    },

    createLedger: async (ledgerData) => {
        const response = await instance.post('/finance/ledgers', ledgerData);
        return normalizeLedger(response.data);
    },

    updateLedger: async (ledgerId, updateData) => {
        const response = await instance.put(`/finance/ledgers/${ledgerId}`, updateData);
        return normalizeLedger(response.data);
    },

    deleteLedger: async (ledgerId) => {
        const response = await instance.delete(`/finance/ledgers/${ledgerId}`);
        return response.data;
    },

    /** Returns the currently active API base URL (useful for diagnostics). */
    getBaseUrl: () => activeApiBase,
};

export default api;
