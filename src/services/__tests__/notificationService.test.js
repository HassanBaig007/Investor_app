import NotificationService from '../notificationService';
import { api } from '../api';

const mockOnTokenRefreshUnsubscribe = jest.fn();
const mockOnMessageUnsubscribe = jest.fn();
const mockOnOpenedUnsubscribe = jest.fn();

const mockMessagingInstance = {
    requestPermission: jest.fn(),
    registerDeviceForRemoteMessages: jest.fn(),
    getToken: jest.fn(),
    onTokenRefresh: jest.fn(),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn(),
};

const mockMessagingFactory = jest.fn(() => mockMessagingInstance);
mockMessagingFactory.AuthorizationStatus = {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    DENIED: 0,
};

jest.mock('../api', () => ({
    api: {
        registerPushToken: jest.fn(),
    },
}));

jest.mock('react-native', () => ({
    Platform: { OS: 'android', Version: 34 },
    PermissionsAndroid: {
        PERMISSIONS: {
            POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
        },
        RESULTS: {
            GRANTED: 'granted',
            DENIED: 'denied',
        },
        check: jest.fn(),
        request: jest.fn(),
    },
}));

describe('NotificationService', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();

        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(NotificationService, 'getMessaging').mockReturnValue(mockMessagingFactory);

        NotificationService.pushToken = null;
        NotificationService.notificationListener = null;
        NotificationService.responseListener = null;
        NotificationService.tokenRefreshUnsubscribe = null;
        NotificationService.foregroundMessageUnsubscribe = null;
        NotificationService.openedNotificationUnsubscribe = null;

        mockMessagingInstance.requestPermission.mockResolvedValue(
            mockMessagingFactory.AuthorizationStatus.AUTHORIZED,
        );
        mockMessagingInstance.registerDeviceForRemoteMessages.mockResolvedValue(undefined);
        mockMessagingInstance.getToken.mockResolvedValue('fcm-token-default');
        mockMessagingInstance.onTokenRefresh.mockReturnValue(mockOnTokenRefreshUnsubscribe);
        mockMessagingInstance.onMessage.mockReturnValue(mockOnMessageUnsubscribe);
        mockMessagingInstance.onNotificationOpenedApp.mockReturnValue(mockOnOpenedUnsubscribe);
        mockMessagingInstance.getInitialNotification.mockResolvedValue(null);
    });

    it('initialize returns false when permissions are denied', async () => {
        const permissionsSpy = jest
            .spyOn(NotificationService, 'requestPermissions')
            .mockResolvedValue(false);
        const registerSpy = jest.spyOn(
            NotificationService,
            'registerForPushNotifications',
        );

        const result = await NotificationService.initialize();

        expect(result).toBe(false);
        expect(registerSpy).not.toHaveBeenCalled();
        permissionsSpy.mockRestore();
    });

    it('initialize registers push token and android channels on success', async () => {
        jest
            .spyOn(NotificationService, 'requestPermissions')
            .mockResolvedValue(true);
        const registerSpy = jest
            .spyOn(NotificationService, 'registerForPushNotifications')
            .mockResolvedValue('fcm-token-x');
        const registerBackendSpy = jest
            .spyOn(NotificationService, 'registerPushTokenWithBackend')
            .mockResolvedValue(undefined);
        const channelsSpy = jest
            .spyOn(NotificationService, 'setupAndroidChannels')
            .mockResolvedValue(true);

        const result = await NotificationService.initialize();

        expect(result).toBe(true);
        expect(registerSpy).toHaveBeenCalledTimes(1);
        expect(registerBackendSpy).toHaveBeenCalledWith('fcm-token-x');
        expect(channelsSpy).toHaveBeenCalledTimes(1);
        expect(mockMessagingInstance.onTokenRefresh).toHaveBeenCalledTimes(1);
    });

    it('initialize returns false when initialization throws', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        jest
            .spyOn(NotificationService, 'requestPermissions')
            .mockRejectedValue(new Error('permission crash'));

        const result = await NotificationService.initialize();

        expect(result).toBe(false);
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('registerForPushNotifications gets and caches Firebase token', async () => {
        mockMessagingInstance.getToken.mockResolvedValue('fcm-token-abc');

        const token = await NotificationService.registerForPushNotifications();

        expect(mockMessagingInstance.registerDeviceForRemoteMessages).toHaveBeenCalledTimes(1);
        expect(mockMessagingInstance.getToken).toHaveBeenCalledTimes(1);
        expect(token).toBe('fcm-token-abc');
        expect(NotificationService.pushToken).toBe('fcm-token-abc');
    });

    it('setup listener lifecycle updates internal references', () => {
        const onReceive = jest.fn();
        const onResponse = jest.fn();

        NotificationService.setupListeners(onReceive, onResponse);
        expect(NotificationService.notificationListener).toBe(onReceive);
        expect(NotificationService.responseListener).toBe(onResponse);
        expect(mockMessagingInstance.onMessage).toHaveBeenCalledTimes(1);
        expect(mockMessagingInstance.onNotificationOpenedApp).toHaveBeenCalledTimes(1);

        NotificationService.removeListeners();
        expect(mockOnMessageUnsubscribe).toHaveBeenCalledTimes(1);
        expect(mockOnOpenedUnsubscribe).toHaveBeenCalledTimes(1);
        expect(NotificationService.notificationListener).toBeNull();
        expect(NotificationService.responseListener).toBeNull();
    });

    it('notifySpendingAdded delegates to sendLocalNotification with payload', async () => {
        const sendSpy = jest
            .spyOn(NotificationService, 'sendLocalNotification')
            .mockResolvedValue('local-123');

        const id = await NotificationService.notifySpendingAdded(
            15000,
            'Materials',
            'Project One',
        );

        expect(sendSpy).toHaveBeenCalledWith(
            '💰 Spending Added',
            '₹15,000 spent on Materials in Project One',
            { type: 'spending', category: 'Materials', amount: 15000 },
            'transactions',
        );
        expect(id).toBe('local-123');
    });

    it('notification helper wrappers map to the expected channels', async () => {
        const sendSpy = jest
            .spyOn(NotificationService, 'sendLocalNotification')
            .mockResolvedValue('local-1');
        const scheduleSpy = jest
            .spyOn(NotificationService, 'scheduleNotification')
            .mockResolvedValue('scheduled-1');

        await NotificationService.notifyMemberAdded('Alex', 'Project A');
        await NotificationService.notifyMemberRemoved('Alex', 'Project A');
        await NotificationService.notifyAdminPromoted('Sam', 'Project A');
        await NotificationService.notifyProjectUpdate('Project A', 'Valuation updated');
        await NotificationService.notifyApprovalRequest('spending', 'Project A');
        await NotificationService.scheduleDailyReminder(8, 30);

        expect(sendSpy).toHaveBeenCalledWith(
            '👤 New Member',
            'Alex has been added to Project A',
            { type: 'member_added', memberName: 'Alex' },
            'members',
        );
        expect(sendSpy).toHaveBeenCalledWith(
            '👤 Member Removed',
            'Alex has been removed from Project A',
            { type: 'member_removed', memberName: 'Alex' },
            'members',
        );
        expect(sendSpy).toHaveBeenCalledWith(
            '🛡️ New Admin',
            'Sam is now an admin of Project A',
            { type: 'admin_promoted', memberName: 'Sam' },
            'members',
        );
        expect(sendSpy).toHaveBeenCalledWith(
            '📊 Project Update',
            'Project A: Valuation updated',
            { type: 'project_update', projectName: 'Project A' },
            'projects',
        );
        expect(sendSpy).toHaveBeenCalledWith(
            '⏳ Approval Required',
            'New spending request for Project A',
            { type: 'approval_request', requestType: 'spending' },
            'default',
        );
        expect(scheduleSpy).toHaveBeenCalledWith(
            '📈 Daily Check-In',
            "Don't forget to review your projects and update spendings!",
            0,
            { hour: 8, minute: 30, repeats: true },
        );
    });

    it('send and schedule methods return deterministic ID prefixes', async () => {
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

        const localId = await NotificationService.sendLocalNotification(
            'Title',
            'Body',
        );
        const scheduledId = await NotificationService.scheduleNotification(
            'Title',
            'Body',
            60,
        );

        expect(localId).toBe('local-1700000000000');
        expect(scheduledId).toBe('scheduled-1700000000000');
        nowSpy.mockRestore();
    });

    it('passive notification control methods resolve safely', async () => {
        await expect(NotificationService.setupAndroidChannels()).resolves.toBe(
            true,
        );
        await expect(NotificationService.cancelNotification('n1')).resolves.toBeUndefined();
        await expect(NotificationService.cancelAllNotifications()).resolves.toBeUndefined();
        await expect(NotificationService.getScheduledNotifications()).resolves.toEqual([]);
        await expect(NotificationService.setBadgeCount(2)).resolves.toBeUndefined();
    });

    it('registerPushTokenWithBackend calls API and swallows API errors', async () => {
        api.registerPushToken.mockRejectedValueOnce(new Error('network error'));

        await expect(
            NotificationService.registerPushTokenWithBackend('fcm-token-123'),
        ).resolves.toBeUndefined();
        expect(api.registerPushToken).toHaveBeenCalledWith('fcm-token-123');
    });

    it('registerPushTokenWithBackend skips when token is empty', async () => {
        await NotificationService.registerPushTokenWithBackend('');

        expect(api.registerPushToken).not.toHaveBeenCalled();
    });
});
