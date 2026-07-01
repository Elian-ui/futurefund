import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RiskProfile = 'Conservative' | 'Balanced' | 'Moderate' | 'Growth';
export type InvestmentPlanDocument = HydratedDocument<InvestmentPlan>;

@Schema({ timestamps: true })
export class InvestmentPlan {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  dailyReturn: number;

  @Prop({ required: true })
  weeklyReturn: number;

  @Prop({ required: true })
  monthlyReturn: number;

  @Prop({ required: true, enum: ['Conservative', 'Balanced', 'Moderate', 'Growth'] })
  risk: RiskProfile;

  @Prop({ required: true })
  liquidity: string;
}

export const InvestmentPlanSchema =
  SchemaFactory.createForClass(InvestmentPlan);
