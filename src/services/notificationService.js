import { Platform } from 'react-native';
import { api } from './api';

class NotificationService {
    static pushToken = null;
    static notificationListener = null;
    static responseListener = null;

    static async initialize() {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                console.log('Notification permissions not granted');
                return false;
            }

            await this.registerForPushNotifications();

            if (Platform.OS === 'android') {
                await this.setupAndroidChannels();
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
            return false;
        }
    }

    static async requestPermissions() {
        return true;
    }

    static async registerForPushNotifications() {
        try {
            return this.pushToken;
        } catch (error) {
            console.log('Could not get push token:', error.message);
            return null;
        }
    }

    static async setupAndroidChannels() {
        return true;
    }

    static async sendLocalNotification(title, body, data = {}, channelId = 'default') {
        console.log('[Notification]', { title, body, data, channelId });
        return `local-${Date.now()}`;
    }

    static async scheduleNotification(title, body, triggerSeconds, data = {}) {
        console.log('[Notification scheduled]', { title, body, triggerSeconds, data });
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
        this.notificationListener = onNotificationReceived || null;
        this.responseListener = onNotificationResponse || null;
    }

    static removeListeners() {
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
            console.log('Could not register push token with backend:', error.message);
        }
    }
}

export default NotificationService;
