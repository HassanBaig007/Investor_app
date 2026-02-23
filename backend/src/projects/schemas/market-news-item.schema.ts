import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketNewsItemDocument = MarketNewsItem & Document;

@Schema({ timestamps: true })
export class MarketNewsItem {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  time: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ trim: true, default: '' })
  trend: string;

  @Prop({ required: true, default: 0 })
  displayOrder: number;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const MarketNewsItemSchema =
  SchemaFactory.createForClass(MarketNewsItem);
