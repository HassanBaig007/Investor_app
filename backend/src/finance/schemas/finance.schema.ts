import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Project } from '../../projects/schemas/project.schema';

export type SpendingDocument = Spending & Document;

@Schema()
export class Approval {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: User;

  /** Denormalized user name — stored at vote-time for reliable display */
  @Prop({ type: String, default: null })
  userName: string;

  @Prop({ required: true, enum: ['approved', 'rejected'] })
  status: string;

  @Prop({ default: Date.now })
  date: Date;
}

export const ApprovalSchema = SchemaFactory.createForClass(Approval);

@Schema({ timestamps: true })
export class Spending {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['Service', 'Product'] })
  category: string;

  @Prop({ type: Object })
  paidTo: { person?: string; place?: string };

  @Prop()
  materialType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  addedBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  fundedBy: User; // Can be Project (if wallet implemented) or User

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  project: Project;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Ledger' })
  ledger: any; // We'll define LedgerSchema separately or use ID

  @Prop()
  subLedger: string;

  @Prop()
  date: string; // User-specified date (YYYY-MM-DD)

  @Prop({
    required: true,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected'],
  })
  status: string;

  @Prop({ type: Map, of: ApprovalSchema })
  approvals: Map<string, Approval>; // userId -> Approval object
}

export const SpendingSchema = SchemaFactory.createForClass(Spending);

@Schema()
export class Ledger {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Project' })
  project: Project;

  @Prop([String])
  subLedgers: string[];
}
export type LedgerDocument = Ledger & Document;
export const LedgerSchema = SchemaFactory.createForClass(Ledger);
