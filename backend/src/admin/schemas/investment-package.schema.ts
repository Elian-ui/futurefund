import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PackageCycle = 'daily' | 'weekly' | 'monthly';
export type InvestmentPackageDocument = HydratedDocument<InvestmentPackage>;

@Schema({ timestamps: true })
export class InvestmentPackage {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['daily', 'weekly', 'monthly'] })
  cycle: PackageCycle;

  @Prop({ required: true, min: 0 })
  rate: number;

  @Prop({ required: true, min: 1 })
  duration: number;

  @Prop({ required: true, min: 0 })
  minInvestment: number;

  @Prop({ required: true, min: 0 })
  maxInvestment: number;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const InvestmentPackageSchema =
  SchemaFactory.createForClass(InvestmentPackage);
