import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['deposit', 'withdrawal', 'investment', 'payout', 'maturity_refund', 'referral_bonus'],
  })
  type: 'deposit' | 'withdrawal' | 'investment' | 'payout' | 'maturity_refund' | 'referral_bonus';

  @Prop({
    required: true,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'completed',
    index: true,
  })
  status: 'pending' | 'approved' | 'rejected' | 'completed';

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false })
  method?: string;

  @Prop({ required: false })
  destination?: string;

  @Prop({ required: false })
  reference?: string;

  @Prop({ required: false })
  externalPaymentId?: string;

  @Prop({ required: false })
  externalPaymentStatus?: string;

  @Prop({ required: false })
  externalPaymentProvider?: string;

  @Prop({ required: false })
  externalPaymentReference?: string;

  @Prop({ required: false })
  externalProviderReference?: string;

  @Prop({ required: false })
  externalPaymentFee?: number;

  @Prop({ required: false })
  externalFailureReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: Types.ObjectId;

  @Prop({ required: false })
  reviewedAt?: Date;

  @Prop({ required: false })
  reviewNote?: string;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
