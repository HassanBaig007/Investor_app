import { Model } from 'mongoose';
import { Announcement, AnnouncementDocument } from './schemas/announcement.schema';
export declare class AnnouncementsService {
    private readonly announcementModel;
    constructor(announcementModel: Model<AnnouncementDocument>);
    create(createDto: any, userId: string): Promise<import("mongoose").Document<unknown, {}, AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    findAll(): Promise<(import("mongoose").Document<unknown, {}, AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    findOne(id: string): Promise<(import("mongoose").Document<unknown, {}, AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    update(id: string, updateDto: any): Promise<(import("mongoose").Document<unknown, {}, AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    markAsRead(id: string, userId: string): Promise<(import("mongoose").Document<unknown, {}, AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    remove(id: string): Promise<(import("mongoose").Document<unknown, {}, AnnouncementDocument, {}, import("mongoose").DefaultSchemaOptions> & Announcement & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
}
