import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlatformSettingsDocument = HydratedDocument<PlatformSettings>;

export interface PaymentMethod {
  id: string;
  label: string;
  method: string;
  network?: string;
  address: string;
  enabled: boolean;
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'USDT_TRC20',
    label: 'USDT',
    method: 'USDT TRC20',
    network: 'TRC20',
    address: 'TXu91K8hQ9cM1Xy9b5Zp2F1R8GvW3eFq9A',
    enabled: true,
    depositEnabled: true,
    withdrawalEnabled: true,
  },
];

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

  @Prop({
    required: true,
    type: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        method: { type: String, required: true },
        network: { type: String, required: false },
        address: { type: String, required: true },
        enabled: { type: Boolean, required: true, default: true },
        depositEnabled: { type: Boolean, required: true, default: true },
        withdrawalEnabled: { type: Boolean, required: true, default: true },
      },
    ],
    default: () => DEFAULT_PAYMENT_METHODS,
  })
  paymentMethods: PaymentMethod[];
}

export const PlatformSettingsSchema =
  SchemaFactory.createForClass(PlatformSettings);
