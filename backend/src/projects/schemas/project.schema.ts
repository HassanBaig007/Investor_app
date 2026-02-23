import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ProjectDocument = Project & Document;

export enum ProjectStatus {
  PENDING = 'pending',
  FUNDING = 'funding',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Schema()
export class ProjectInvestor {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  user: User;

  @Prop({ default: 'active' }) // active, passive
  role: string;

  @Prop({ default: 0 })
  investedAmount: number;

  @Prop({ type: Object })
  privacySettings: { isAnonymous: boolean; displayName: string };
}

export const ProjectInvestorSchema =
  SchemaFactory.createForClass(ProjectInvestor);

@Schema()
export class PendingInvitation {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true,
  })
  userId: string; // Storing as string or User ref. The frontend expects `userId`. Let's use `MongooseSchema.Types.ObjectId` but name it `userId`.

  @Prop({ required: true, default: 'passive' })
  role: string;

  @Prop({ default: Date.now })
  invitedAt: Date;
}

export const PendingInvitationSchema =
  SchemaFactory.createForClass(PendingInvitation);

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  @Prop({ index: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  targetAmount: number;

  @Prop({ default: 0 })
  raisedAmount: number;

  @Prop()
  minInvestment: number;

  @Prop()
  returnRate: number; // Percentage

  @Prop()
  duration: string;

  @Prop({ required: true })
  riskLevel: string;

  @Prop({ default: 0 })
  currentValuation: number;

  @Prop({ type: [{ valuation: Number, date: Date }] })
  valuationHistory: { valuation: number; date: Date }[];

  @Prop({ required: true, enum: ProjectStatus, default: ProjectStatus.PENDING })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  createdBy: User;

  @Prop({ type: [ProjectInvestorSchema] })
  investors: ProjectInvestor[];

  @Prop({ type: [PendingInvitationSchema], default: [] })
  pendingInvitations: PendingInvitation[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
