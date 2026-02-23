import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
export type ProjectDocument = Project & Document;
export declare enum ProjectStatus {
    PENDING = "pending",
    FUNDING = "funding",
    ACTIVE = "active",
    COMPLETED = "completed"
}
export declare class ProjectInvestor {
    user: User;
    role: string;
    investedAmount: number;
    privacySettings: {
        isAnonymous: boolean;
        displayName: string;
    };
}
export declare const ProjectInvestorSchema: MongooseSchema<ProjectInvestor, import("mongoose").Model<ProjectInvestor, any, any, any, (Document<unknown, any, ProjectInvestor, any, import("mongoose").DefaultSchemaOptions> & ProjectInvestor & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, ProjectInvestor, any, import("mongoose").DefaultSchemaOptions> & ProjectInvestor & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, ProjectInvestor>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProjectInvestor, Document<unknown, {}, ProjectInvestor, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ProjectInvestor & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    user?: import("mongoose").SchemaDefinitionProperty<User, ProjectInvestor, Document<unknown, {}, ProjectInvestor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProjectInvestor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<string, ProjectInvestor, Document<unknown, {}, ProjectInvestor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProjectInvestor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    investedAmount?: import("mongoose").SchemaDefinitionProperty<number, ProjectInvestor, Document<unknown, {}, ProjectInvestor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProjectInvestor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    privacySettings?: import("mongoose").SchemaDefinitionProperty<{
        isAnonymous: boolean;
        displayName: string;
    }, ProjectInvestor, Document<unknown, {}, ProjectInvestor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProjectInvestor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ProjectInvestor>;
export declare class PendingInvitation {
    userId: string;
    role: string;
    invitedAt: Date;
}
export declare const PendingInvitationSchema: MongooseSchema<PendingInvitation, import("mongoose").Model<PendingInvitation, any, any, any, (Document<unknown, any, PendingInvitation, any, import("mongoose").DefaultSchemaOptions> & PendingInvitation & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, PendingInvitation, any, import("mongoose").DefaultSchemaOptions> & PendingInvitation & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, PendingInvitation>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PendingInvitation, Document<unknown, {}, PendingInvitation, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<PendingInvitation & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    userId?: import("mongoose").SchemaDefinitionProperty<string, PendingInvitation, Document<unknown, {}, PendingInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PendingInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<string, PendingInvitation, Document<unknown, {}, PendingInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PendingInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    invitedAt?: import("mongoose").SchemaDefinitionProperty<Date, PendingInvitation, Document<unknown, {}, PendingInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PendingInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, PendingInvitation>;
export declare class Project {
    name: string;
    type: string;
    description: string;
    targetAmount: number;
    raisedAmount: number;
    minInvestment: number;
    returnRate: number;
    duration: string;
    riskLevel: string;
    currentValuation: number;
    valuationHistory: {
        valuation: number;
        date: Date;
    }[];
    status: string;
    createdBy: User;
    investors: ProjectInvestor[];
    pendingInvitations: PendingInvitation[];
}
export declare const ProjectSchema: MongooseSchema<Project, import("mongoose").Model<Project, any, any, any, (Document<unknown, any, Project, any, import("mongoose").DefaultSchemaOptions> & Project & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Project, any, import("mongoose").DefaultSchemaOptions> & Project & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Project>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Project, Document<unknown, {}, Project, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    type?: import("mongoose").SchemaDefinitionProperty<string, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    targetAmount?: import("mongoose").SchemaDefinitionProperty<number, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    raisedAmount?: import("mongoose").SchemaDefinitionProperty<number, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    minInvestment?: import("mongoose").SchemaDefinitionProperty<number, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    returnRate?: import("mongoose").SchemaDefinitionProperty<number, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    duration?: import("mongoose").SchemaDefinitionProperty<string, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    riskLevel?: import("mongoose").SchemaDefinitionProperty<string, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currentValuation?: import("mongoose").SchemaDefinitionProperty<number, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    valuationHistory?: import("mongoose").SchemaDefinitionProperty<{
        valuation: number;
        date: Date;
    }[], Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    createdBy?: import("mongoose").SchemaDefinitionProperty<User, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    investors?: import("mongoose").SchemaDefinitionProperty<ProjectInvestor[], Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    pendingInvitations?: import("mongoose").SchemaDefinitionProperty<PendingInvitation[], Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Project>;
