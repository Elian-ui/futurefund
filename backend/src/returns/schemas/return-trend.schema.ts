import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ReturnWindow } from './return-snapshot.schema';

export type ReturnTrendDocument = HydratedDocument<ReturnTrend>;

@Schema({ timestamps: true })
export class ReturnTrend {
  @Prop({ required: true, enum: ['daily', 'weekly', 'monthly'] })
  window: ReturnWindow;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  percentage: number;

  @Prop({ required: true })
  sortOrder: number;
}

export const ReturnTrendSchema = SchemaFactory.createForClass(ReturnTrend);
ReturnTrendSchema.index({ window: 1, sortOrder: 1 }, { unique: true });
