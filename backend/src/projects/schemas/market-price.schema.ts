import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketPriceDocument = MarketPrice & Document;

@Schema({ timestamps: true })
export class MarketPrice {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  price: string;

  @Prop({ required: true, trim: true })
  trend: string;

  @Prop({ required: true, trim: true })
  icon: string;

  @Prop({ required: true, trim: true })
  color: string;

  @Prop({ required: true, default: true })
  positive: boolean;

  @Prop({ required: true, default: 0 })
  displayOrder: number;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const MarketPriceSchema = SchemaFactory.createForClass(MarketPrice);
