import { AnnouncementsService } from './announcements.service';
export declare class AnnouncementsController {
    private readonly announcementsService;
    constructor(announcementsService: AnnouncementsService);
    create(req: any, createDto: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/announcement.schema").AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/announcement.schema").Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    findAll(): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/announcement.schema").AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/announcement.schema").Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    findOne(id: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/announcement.schema").AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/announcement.schema").Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    markAsRead(id: string, req: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/announcement.schema").AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/announcement.schema").Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    delete(id: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/announcement.schema").AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/announcement.schema").Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
}
