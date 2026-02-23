import { NotificationService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    findAll(req: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/notification.schema").NotificationDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/notification.schema").Notification & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    markAllAsRead(req: any): Promise<{
        modifiedCount: number;
    }>;
    markAsRead(id: string, req: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/notification.schema").NotificationDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/notification.schema").Notification & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    remove(id: string, req: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/notification.schema").NotificationDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/notification.schema").Notification & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
}
