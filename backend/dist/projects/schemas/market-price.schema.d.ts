import { Document } from 'mongoose';
export type MarketPriceDocument = MarketPrice & Document;
export declare class MarketPrice {
    name: string;
    price: string;
    trend: string;
    icon: string;
    color: string;
    positive: boolean;
    displayOrder: number;
    isActive: boolean;
}
export declare const MarketPriceSchema: import("mongoose").Schema<MarketPrice, import("mongoose").Model<MarketPrice, any, any, any, (Document<unknown, any, MarketPrice, any, import("mongoose").DefaultSchemaOptions> & MarketPrice & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, MarketPrice, any, import("mongoose").DefaultSchemaOptions> & MarketPrice & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, MarketPrice>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MarketPrice, Document<unknown, {}, MarketPrice, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<MarketPrice & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, MarketPrice, Document<unknown, {}, MarketPrice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketPrice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    price?: import("mongoose").SchemaDefinitionProperty<string, MarketPrice, Document<unknown, {}, MarketPrice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketPrice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    trend?: import("mongoose").SchemaDefinitionProperty<string, MarketPrice, Document<unknown, {}, MarketPrice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketPrice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    icon?: import("mongoose").SchemaDefinitionProperty<string, MarketPrice, Document<unknown, {}, MarketPrice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketPrice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    color?: import("mongoose").SchemaDefinitionProperty<string, MarketPrice, Document<unknown, {}, MarketPrice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketPrice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    positive?: import("mongoose").SchemaDefinitionProperty<boolean, MarketPrice, Document<unknown, {}, MarketPrice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketPrice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    displayOrder?: import("mongoose").SchemaDefinitionProperty<number, MarketPrice, Document<unknown, {}, MarketPrice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketPrice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, MarketPrice, Document<unknown, {}, MarketPrice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<MarketPrice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, MarketPrice>;
