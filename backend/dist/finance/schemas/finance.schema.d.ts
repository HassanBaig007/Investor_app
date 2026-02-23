import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Project } from '../../projects/schemas/project.schema';
export type SpendingDocument = Spending & Document;
export declare class Approval {
    user: User;
    userName: string;
    status: string;
    date: Date;
}
export declare const ApprovalSchema: MongooseSchema<Approval, import("mongoose").Model<Approval, any, any, any, (Document<unknown, any, Approval, any, import("mongoose").DefaultSchemaOptions> & Approval & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Approval, any, import("mongoose").DefaultSchemaOptions> & Approval & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Approval>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Approval, Document<unknown, {}, Approval, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Approval & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    user?: import("mongoose").SchemaDefinitionProperty<User, Approval, Document<unknown, {}, Approval, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Approval & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userName?: import("mongoose").SchemaDefinitionProperty<string, Approval, Document<unknown, {}, Approval, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Approval & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, Approval, Document<unknown, {}, Approval, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Approval & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    date?: import("mongoose").SchemaDefinitionProperty<Date, Approval, Document<unknown, {}, Approval, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Approval & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Approval>;
export declare class Spending {
    amount: number;
    description: string;
    category: string;
    paidTo: {
        person?: string;
        place?: string;
    };
    materialType: string;
    addedBy: User;
    fundedBy: User;
    project: Project;
    ledger: any;
    subLedger: string;
    date: string;
    status: string;
    approvals: Map<string, Approval>;
}
export declare const SpendingSchema: MongooseSchema<Spending, import("mongoose").Model<Spending, any, any, any, (Document<unknown, any, Spending, any, import("mongoose").DefaultSchemaOptions> & Spending & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Spending, any, import("mongoose").DefaultSchemaOptions> & Spending & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Spending>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Spending, Document<unknown, {}, Spending, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    amount?: import("mongoose").SchemaDefinitionProperty<number, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    category?: import("mongoose").SchemaDefinitionProperty<string, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paidTo?: import("mongoose").SchemaDefinitionProperty<{
        person?: string;
        place?: string;
    }, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    materialType?: import("mongoose").SchemaDefinitionProperty<string, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    addedBy?: import("mongoose").SchemaDefinitionProperty<User, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    fundedBy?: import("mongoose").SchemaDefinitionProperty<User, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    project?: import("mongoose").SchemaDefinitionProperty<Project, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    ledger?: import("mongoose").SchemaDefinitionProperty<any, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    subLedger?: import("mongoose").SchemaDefinitionProperty<string, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    date?: import("mongoose").SchemaDefinitionProperty<string, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    approvals?: import("mongoose").SchemaDefinitionProperty<Map<string, Approval>, Spending, Document<unknown, {}, Spending, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Spending & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Spending>;
export declare class Ledger {
    name: string;
    project: Project;
    subLedgers: string[];
}
export type LedgerDocument = Ledger & Document;
export declare const LedgerSchema: MongooseSchema<Ledger, import("mongoose").Model<Ledger, any, any, any, (Document<unknown, any, Ledger, any, import("mongoose").DefaultSchemaOptions> & Ledger & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Ledger, any, import("mongoose").DefaultSchemaOptions> & Ledger & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Ledger>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Ledger, Document<unknown, {}, Ledger, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Ledger & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Ledger, Document<unknown, {}, Ledger, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Ledger & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    project?: import("mongoose").SchemaDefinitionProperty<Project, Ledger, Document<unknown, {}, Ledger, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Ledger & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    subLedgers?: import("mongoose").SchemaDefinitionProperty<string[], Ledger, Document<unknown, {}, Ledger, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Ledger & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Ledger>;
