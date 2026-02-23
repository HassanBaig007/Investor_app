import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
export type AnnouncementDocument = Announcement & Document;
export declare class Announcement {
    title: string;
    content: string;
    priority: string;
    createdBy: User;
    isActive: boolean;
    readBy: User[];
}
export declare const AnnouncementSchema: MongooseSchema<Announcement, import("mongoose").Model<Announcement, any, any, any, (Document<unknown, any, Announcement, any, import("mongoose").DefaultSchemaOptions> & Announcement & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Announcement, any, import("mongoose").DefaultSchemaOptions> & Announcement & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Announcement>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Announcement, Document<unknown, {}, Announcement, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    title?: import("mongoose").SchemaDefinitionProperty<string, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    content?: import("mongoose").SchemaDefinitionProperty<string, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    priority?: import("mongoose").SchemaDefinitionProperty<string, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    createdBy?: import("mongoose").SchemaDefinitionProperty<User, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    readBy?: import("mongoose").SchemaDefinitionProperty<User[], Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Announcement>;
