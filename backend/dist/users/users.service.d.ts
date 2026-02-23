import { Model } from 'mongoose';
import { UserDocument } from './schemas/user.schema';
import { ProjectDocument } from '../projects/schemas/project.schema';
import { SpendingDocument } from '../finance/schemas/finance.schema';
import { ModificationRequestDocument } from '../modifications/schemas/modification-request.schema';
import { NotificationDocument } from '../notifications/schemas/notification.schema';
export declare class UsersService {
    private readonly userModel;
    private readonly projectModel;
    private readonly spendingModel;
    private readonly modificationModel;
    private readonly notificationModel;
    constructor(userModel: Model<UserDocument>, projectModel: Model<ProjectDocument>, spendingModel: Model<SpendingDocument>, modificationModel: Model<ModificationRequestDocument>, notificationModel: Model<NotificationDocument>);
    create(createUserDto: any): Promise<UserDocument>;
    findOne(email: string): Promise<UserDocument | null>;
    findByIdentifier(identifier: string): Promise<UserDocument | null>;
    findBySocialSub(provider: 'google' | 'apple', sub: string): Promise<UserDocument | null>;
    findById(id: string): Promise<UserDocument | null>;
    findAll(): Promise<UserDocument[]>;
    update(id: string, updateDto: any): Promise<UserDocument | null>;
    updateKyc(id: string, kycData: any): Promise<UserDocument | null>;
    updateSettings(id: string, settings: any): Promise<UserDocument | null>;
    updateNotificationPrefs(id: string, prefs: any): Promise<UserDocument | null>;
    setRefreshTokenHash(id: string, refreshTokenHash: string): Promise<void>;
    clearRefreshTokenHash(id: string): Promise<void>;
    countInvestors(): Promise<number>;
    deleteAccount(userId: string, password: string): Promise<{
        deleted: true;
    }>;
    exportUserData(userId: string): Promise<Record<string, any>>;
    registerPushToken(userId: string, pushToken: string): Promise<{
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
