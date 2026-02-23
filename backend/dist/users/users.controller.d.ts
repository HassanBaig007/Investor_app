import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
export declare class UsersController {
    private readonly usersService;
    private readonly authService;
    constructor(usersService: UsersService, authService: AuthService);
    private sanitizeUser;
    private normalizeSettingsForClient;
    private mapSettingsFromClient;
    findAll(): Promise<any[]>;
    getProfile(req: any): Promise<any>;
    getSettings(req: any): Promise<{
        theme: string;
        darkMode: boolean;
        biometricEnabled: any;
        language: any;
        currency: any;
        notifications: {
            pushEnabled: any;
            emailEnabled: any;
            approvalReminders: any;
            reportAlerts: any;
        };
    }>;
    updateProfile(req: any, updateDto: any): Promise<any>;
    updateKyc(req: any, kycData: any): Promise<any>;
    updateSettings(req: any, settingsDto: any): Promise<{
        settings: {
            theme: string;
            darkMode: boolean;
            biometricEnabled: any;
            language: any;
            currency: any;
            notifications: {
                pushEnabled: any;
                emailEnabled: any;
                approvalReminders: any;
                reportAlerts: any;
            };
        };
    }>;
    updateNotificationPreferences(req: any, prefsDto: any): Promise<{
        settings: {
            theme: string;
            darkMode: boolean;
            biometricEnabled: any;
            language: any;
            currency: any;
            notifications: {
                pushEnabled: any;
                emailEnabled: any;
                approvalReminders: any;
                reportAlerts: any;
            };
        };
        notifications: {
            pushEnabled: any;
            emailEnabled: any;
            approvalReminders: any;
            reportAlerts: any;
        };
    }>;
    changePassword(req: any, body: any): Promise<{
        success: boolean;
    }>;
    deleteAccount(req: any, body: any): Promise<{
        deleted: true;
    }>;
    exportData(req: any): Promise<Record<string, any>>;
    registerPushToken(req: any, body: any): Promise<{
        registered: true;
    }>;
    getAppConfig(): {
        passwordPolicy: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumber: boolean;
            requireSpecialChar: boolean;
        };
        approvalThresholdPercent: number;
        defaultBudget: number;
        disposableEmailDomains: string[];
        supportedCurrencies: string[];
        privacyPolicyUrl: string;
        termsOfServiceUrl: string;
    };
}
