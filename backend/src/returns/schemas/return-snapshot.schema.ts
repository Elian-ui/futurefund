import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReturnWindow = 'daily' | 'weekly' | 'monthly';
export type ReturnSnapshotDocument = HydratedDocument<ReturnSnapshot>;

@Schema({ timestamps: true })
export class ReturnSnapshot {
  @Prop({ required: true, enum: ['daily', 'weekly', 'monthly'], unique: true })
  window: ReturnWindow;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  percentage: number;

  @Prop({ required: true })
  displayPercentage: string;

  @Prop({ required: true })
  periodLabel: string;

  @Prop({ required: true })
  description: string;
}

export const ReturnSnapshotSchema =
  SchemaFactory.createForClass(ReturnSnapshot);
