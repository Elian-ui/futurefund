import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlatformSettingsDocument = HydratedDocument<PlatformSettings>;

@Schema({ timestamps: true })
export class PlatformSettings {
  @Prop({ required: true, unique: true, default: 'default' })
  key: string;

  @Prop({ required: true, min: 0, default: 10 })
  minDeposit: number;

  @Prop({ required: true, min: 0, default: 100000 })
  maxDeposit: number;

  @Prop({ required: true, min: 0, default: 1 })
  minWithdrawal: number;

  @Prop({ required: true, min: 0, default: 150000 })
  maxWithdrawal: number;

  @Prop({ required: true, default: true })
  depositsEnabled: boolean;

  @Prop({ required: true, default: true })
  withdrawalsEnabled: boolean;
}

export const PlatformSettingsSchema =
  SchemaFactory.createForClass(PlatformSettings);
