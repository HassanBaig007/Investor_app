import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { api } from './api';

class NotificationService {
    static pushToken = null;
    static notificationListener = null;
    static responseListener = null;
    static tokenRefreshUnsubscribe = null;
    static foregroundMessageUnsubscribe = null;
    static openedNotificationUnsubscribe = null;

    static hasNativeFirebaseMessagingModules() {
        return Boolean(
            NativeModules?.RNFBAppModule && NativeModules?.RNFBMessagingModule,
        );
    }

    static getMessaging() {
        if (!this.hasNativeFirebaseMessagingModules()) {
            return null;
        }

        try {
            const messaging = require('@react-native-firebase/messaging').default;
            return typeof messaging === 'function' ? messaging : null;
        } catch {
            return null;
        }
    }

    static toLegacyPayload(remoteMessage) {
        const content = {
            title: remoteMessage?.notification?.title || '',
            body: remoteMessage?.notification?.body || '',
            data: remoteMessage?.data || {},
        };

        return {
            request: { content },
            notification: { request: { content } },
            raw: remoteMessage || null,
        };
    }

    static attachTokenRefreshListener() {
        if (this.tokenRefreshUnsubscribe) return;

        const messaging = this.getMessaging();
        if (!messaging) return;

        this.tokenRefreshUnsubscribe = messaging().onTokenRefresh(async (token) => {
            this.pushToken = token || null;
            await this.registerPushTokenWithBackend(this.pushToken);
        });
    }

    static async initialize() {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                return false;
            }

            const pushToken = await this.registerForPushNotifications();
            await this.registerPushTokenWithBackend(pushToken);

            if (Platform.OS === 'android') {
                await this.setupAndroidChannels();
            }

            this.attachTokenRefreshListener();

            return true;
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
            return false;
        }
    }

    static async requestPermissions() {
        const messaging = this.getMessaging();
        if (!messaging) return false;

        if (Platform.OS === 'ios') {
            const authStatus = await messaging().requestPermission();
            const { AUTHORIZED, PROVISIONAL } = messaging.AuthorizationStatus;
            return authStatus === AUTHORIZED || authStatus === PROVISIONAL;
        }

        if (Platform.OS === 'android' && Platform.Version >= 33) {
            const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
            const alreadyGranted = await PermissionsAndroid.check(permission);
            if (alreadyGranted) return true;

            const status = await PermissionsAndroid.request(permission);
            return status === PermissionsAndroid.RESULTS.GRANTED;
        }

        return true;
    }

    static async registerForPushNotifications() {
        const messaging = this.getMessaging();
        if (!messaging) return null;

        try {
            if (typeof messaging().registerDeviceForRemoteMessages === 'function') {
                await messaging().registerDeviceForRemoteMessages();
            }

            const token = await messaging().getToken();
            this.pushToken = token || null;
            return this.pushToken;
        } catch (error) {
            console.warn('Could not get push token:', error?.message || error);
            return null;
        }
    }

    static async setupAndroidChannels() {
        return true;
    }

    static async sendLocalNotification(title, body, data = {}, channelId = 'default') {
        void title;
        void body;
        void data;
        void channelId;
        return `local-${Date.now()}`;
    }

    static async scheduleNotification(title, body, triggerSeconds, data = {}) {
        void title;
        void body;
        void triggerSeconds;
        void data;
        return `scheduled-${Date.now()}`;
    }

    static async cancelNotification(_notificationId) {
        return;
    }

    static async cancelAllNotifications() {
        return;
    }

    static async getScheduledNotifications() {
        return [];
    }

    static setupListeners(onNotificationReceived, onNotificationResponse) {
        this.removeListeners();

        this.notificationListener = onNotificationReceived || null;
        this.responseListener = onNotificationResponse || null;

        const messaging = this.getMessaging();
        if (!messaging) return;

        this.foregroundMessageUnsubscribe = messaging().onMessage((remoteMessage) => {
            if (this.notificationListener) {
                this.notificationListener(this.toLegacyPayload(remoteMessage));
            }
        });

        this.openedNotificationUnsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
            if (this.responseListener) {
                this.responseListener(this.toLegacyPayload(remoteMessage));
            }
        });

        messaging()
            .getInitialNotification()
            .then((remoteMessage) => {
                if (remoteMessage && this.responseListener) {
                    this.responseListener(this.toLegacyPayload(remoteMessage));
                }
            })
            .catch(() => undefined);
    }

    static removeListeners() {
        if (typeof this.foregroundMessageUnsubscribe === 'function') {
            this.foregroundMessageUnsubscribe();
        }
        if (typeof this.openedNotificationUnsubscribe === 'function') {
            this.openedNotificationUnsubscribe();
        }
        if (typeof this.tokenRefreshUnsubscribe === 'function') {
            this.tokenRefreshUnsubscribe();
        }

        this.foregroundMessageUnsubscribe = null;
        this.openedNotificationUnsubscribe = null;
        this.tokenRefreshUnsubscribe = null;
        this.notificationListener = null;
        this.responseListener = null;
    }

    static async setBadgeCount(_count) {
        return;
    }

    static async notifySpendingAdded(amount, category, projectName) {
        return this.sendLocalNotification(
            '💰 Spending Added',
            `₹${amount.toLocaleString()} spent on ${category} in ${projectName}`,
            { type: 'spending', category, amount },
            'transactions'
        );
    }

    static async notifyMemberAdded(memberName, projectName) {
        return this.sendLocalNotification(
            '👤 New Member',
            `${memberName} has been added to ${projectName}`,
            { type: 'member_added', memberName },
            'members'
        );
    }

    static async notifyMemberRemoved(memberName, projectName) {
        return this.sendLocalNotification(
            '👤 Member Removed',
            `${memberName} has been removed from ${projectName}`,
            { type: 'member_removed', memberName },
            'members'
        );
    }

    static async notifyAdminPromoted(memberName, projectName) {
        return this.sendLocalNotification(
            '🛡️ New Admin',
            `${memberName} is now an admin of ${projectName}`,
            { type: 'admin_promoted', memberName },
            'members'
        );
    }

    static async notifyProjectUpdate(projectName, updateType) {
        return this.sendLocalNotification(
            '📊 Project Update',
            `${projectName}: ${updateType}`,
            { type: 'project_update', projectName },
            'projects'
        );
    }

    static async notifyApprovalRequest(requestType, projectName) {
        return this.sendLocalNotification(
            '⏳ Approval Required',
            `New ${requestType} request for ${projectName}`,
            { type: 'approval_request', requestType },
            'default'
        );
    }

    static async scheduleDailyReminder(hour = 9, minute = 0) {
        return this.scheduleNotification(
            '📈 Daily Check-In',
            "Don't forget to review your projects and update spendings!",
            0,
            { hour, minute, repeats: true }
        );
    }

    static async registerPushTokenWithBackend(pushToken) {
        if (!pushToken) return;

        try {
            await api.registerPushToken(pushToken);
        } catch (error) {
            console.warn('Could not register push token with backend:', error?.message || error);
        }
    }
}

export default NotificationService;
