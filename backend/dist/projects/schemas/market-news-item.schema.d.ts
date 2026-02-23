import { Document } from 'mongoose';
export type MarketNewsItemDocument = MarketNewsItem & Document;
export declare class MarketNewsItem {
    title: string;
    time: string;
    category: string;
    description: string;
    trend: string;
    displayOrder: number;
    isActive: boolean;
}
export declare const MarketNewsItemSchema: import("mongoose").Schema<MarketNewsItem, import("mongoose").Model<MarketNewsItem, any, any, any, (Document<unknown, any, MarketNewsItem, any, import("mongoose").DefaultSchemaOptions> & MarketNewsItem & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, MarketNewsItem, any, import("mongoose").DefaultSchemaOptions> & MarketNewsItem & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, MarketNewsItem>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MarketNewsItem, Document<unknown, {}, MarketNewsItem, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<MarketNewsItem & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    title?: import("mongoose").SchemaDefinitionProperty<string, MarketNewsItem, Document<unknown, {}, MarketNewsItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketNewsItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    time?: import("mongoose").SchemaDefinitionProperty<string, MarketNewsItem, Document<unknown, {}, MarketNewsItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketNewsItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    category?: import("mongoose").SchemaDefinitionProperty<string, MarketNewsItem, Document<unknown, {}, MarketNewsItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketNewsItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, MarketNewsItem, Document<unknown, {}, MarketNewsItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketNewsItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    trend?: import("mongoose").SchemaDefinitionProperty<string, MarketNewsItem, Document<unknown, {}, MarketNewsItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketNewsItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    displayOrder?: import("mongoose").SchemaDefinitionProperty<number, MarketNewsItem, Document<unknown, {}, MarketNewsItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketNewsItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, MarketNewsItem, Document<unknown, {}, MarketNewsItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketNewsItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, MarketNewsItem>;
