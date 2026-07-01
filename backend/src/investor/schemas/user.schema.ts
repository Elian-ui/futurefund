import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: false, index: true })
  phoneNumber?: string;

  @Prop({ required: false, select: false })
  passwordHash: string;

  @Prop({
    required: true,
    type: [String],
    enum: ['investor', 'support', 'admin', 'superadmin'],
    default: ['investor'],
  })
  roles: ('investor' | 'support' | 'admin' | 'superadmin')[];

  @Prop({ required: true, default: 0 })
  balance: number;

  @Prop({ required: true, default: 0 })
  totalInvested: number;

  @Prop({ required: true, default: 0 })
  totalEarned: number;

  @Prop({ required: false, unique: true, sparse: true, index: true })
  referralCode: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  referredBy?: Types.ObjectId | null;

  @Prop({ required: true, default: 0 })
  referralCount: number;

  @Prop({ required: true, default: 0 })
  referralEarnings: number;

  @Prop({ required: true, default: false })
  referralRewardPaid: boolean;

  @Prop({ required: true, default: false })
  emailVerified: boolean;

  @Prop({ required: false, select: false })
  emailVerificationTokenHash?: string;

  @Prop({ required: false })
  emailVerificationExpiresAt?: Date;

  @Prop({ required: false, select: false })
  passwordResetTokenHash?: string;

  @Prop({ required: false })
  passwordResetExpiresAt?: Date;

  @Prop({ required: true, default: 0 })
  failedLoginAttempts: number;

  @Prop({ required: false })
  lockedUntil?: Date;

  @Prop({ required: false, index: true })
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  deletedBy?: Types.ObjectId;

  @Prop({ required: false })
  deletionReason?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
