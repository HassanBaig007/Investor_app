import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  GUEST = 'guest',
  INVESTOR = 'investor',
  ADMIN = 'admin',
  PROJECT_ADMIN = 'project_admin',
  SUPER_ADMIN = 'super_admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  username: string;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  phone: string;

  @Prop({ required: true }) // Hashed password
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.GUEST })
  role: string;

  @Prop({ default: false })
  kycVerified: boolean;

  @Prop({ type: Object })
  kycData: Record<string, any>;

  @Prop({ type: Object }) // JSONB for bank details
  bankDetails: Record<string, any>;

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  @Prop({ type: String, default: null })
  refreshTokenHash: string;

  @Prop({ type: String, default: null })
  googleSub: string;

  @Prop({ type: String, default: null })
  appleSub: string;

  @Prop({ type: String, default: 'password' })
  authProvider: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
