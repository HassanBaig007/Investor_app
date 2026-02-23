import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: User;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  readBy: User[];
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
