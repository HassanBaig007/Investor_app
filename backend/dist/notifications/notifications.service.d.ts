import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { UserDocument } from '../users/schemas/user.schema';
export declare class NotificationService {
    private readonly notificationModel;
    private readonly userModel;
    private readonly logger;
    constructor(notificationModel: Model<NotificationDocument>, userModel: Model<UserDocument>);
    private isExpoPushToken;
    sendPush(recipientId: string, title: string, body: string, data?: any): Promise<{
        notificationId: string;
        delivered: boolean;
        reason: string;
        expoResult?: undefined;
    } | {
        notificationId: string;
        delivered: boolean;
        reason: string;
        expoResult: any;
    } | {
        notificationId: string;
        delivered: boolean;
        expoResult: any;
        reason?: undefined;
    }>;
    findAll(recipientId: string): Promise<(import("mongoose").Document<unknown, {}, NotificationDocument, {}, import("mongoose").DefaultSchemaOptions> & Notification & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    markAsRead(id: string, recipientId: string): Promise<(import("mongoose").Document<unknown, {}, NotificationDocument, {}, import("mongoose").DefaultSchemaOptions> & Notification & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    markAllAsRead(recipientId: string): Promise<{
        modifiedCount: number;
    }>;
    remove(id: string, recipientId: string): Promise<(import("mongoose").Document<unknown, {}, NotificationDocument, {}, import("mongoose").DefaultSchemaOptions> & Notification & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
}
