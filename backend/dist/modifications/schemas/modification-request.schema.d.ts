import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Project } from '../../projects/schemas/project.schema';
export type ModificationRequestDocument = ModificationRequest & Document;
export declare class Vote {
    user: User;
    status: string;
    date: Date;
}
export declare const VoteSchema: MongooseSchema<Vote, import("mongoose").Model<Vote, any, any, any, (Document<unknown, any, Vote, any, import("mongoose").DefaultSchemaOptions> & Vote & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Vote, any, import("mongoose").DefaultSchemaOptions> & Vote & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Vote>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Vote, Document<unknown, {}, Vote, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Vote & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    user?: import("mongoose").SchemaDefinitionProperty<User, Vote, Document<unknown, {}, Vote, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vote & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, Vote, Document<unknown, {}, Vote, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vote & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    date?: import("mongoose").SchemaDefinitionProperty<Date, Vote, Document<unknown, {}, Vote, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vote & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Vote>;
export declare class ModificationRequest {
    project: Project;
    type: string;
    title: string;
    description: string;
    details: any;
    requestedBy: User;
    status: string;
    rejectedBy: User;
    rejectedAt?: Date;
    rejectionReason?: string;
    votes: Map<string, Vote>;
}
export declare const ModificationRequestSchema: MongooseSchema<ModificationRequest, import("mongoose").Model<ModificationRequest, any, any, any, (Document<unknown, any, ModificationRequest, any, import("mongoose").DefaultSchemaOptions> & ModificationRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, ModificationRequest, any, import("mongoose").DefaultSchemaOptions> & ModificationRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, ModificationRequest>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ModificationRequest, Document<unknown, {}, ModificationRequest, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    project?: import("mongoose").SchemaDefinitionProperty<Project, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    type?: import("mongoose").SchemaDefinitionProperty<string, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    details?: import("mongoose").SchemaDefinitionProperty<any, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    requestedBy?: import("mongoose").SchemaDefinitionProperty<User, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rejectedBy?: import("mongoose").SchemaDefinitionProperty<User, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rejectedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rejectionReason?: import("mongoose").SchemaDefinitionProperty<string | undefined, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    votes?: import("mongoose").SchemaDefinitionProperty<Map<string, Vote>, ModificationRequest, Document<unknown, {}, ModificationRequest, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ModificationRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ModificationRequest>;
