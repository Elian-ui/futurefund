import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvestmentDocument = HydratedDocument<Investment>;

@Schema({ timestamps: true })
export class Investment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  packageId: string;

  @Prop({ required: true })
  packageName: string;

  @Prop({ required: true, enum: ['daily', 'weekly', 'monthly'] })
  cycle: 'daily' | 'weekly' | 'monthly';

  @Prop({ required: true })
  rate: number;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true, default: 0 })
  durationSpent: number;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 0 })
  accumulatedYield: number;

  @Prop({ required: true, enum: ['active', 'completed'], default: 'active' })
  status: 'active' | 'completed';

  @Prop({ required: true, default: 0 })
  daysSinceLastPayout: number;

  @Prop({ required: true, default: Date.now })
  lastPayoutDate: Date;
}

export const InvestmentSchema = SchemaFactory.createForClass(Investment);
