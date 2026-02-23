import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Project } from '../../projects/schemas/project.schema';

export type ModificationRequestDocument = ModificationRequest & Document;

@Schema()
export class Vote {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ required: true, enum: ['approved', 'rejected'] })
  status: string;

  @Prop({ default: Date.now })
  date: Date;
}

export const VoteSchema = SchemaFactory.createForClass(Vote);

@Schema({ timestamps: true })
export class ModificationRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  project: Project;

  @Prop({ required: true, enum: ['timeline', 'budget', 'scope', 'other'] })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object }) // Flexible for different mod types
  details: any;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  requestedBy: User;

  @Prop({
    required: true,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected'],
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  rejectedBy: User;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: Map, of: VoteSchema })
  votes: Map<string, Vote>;
}

export const ModificationRequestSchema =
  SchemaFactory.createForClass(ModificationRequest);
