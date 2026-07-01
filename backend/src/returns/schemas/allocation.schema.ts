import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AllocationDocument = HydratedDocument<Allocation>;

@Schema({ timestamps: true })
export class Allocation {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  displayValue: string;

  @Prop({ required: true })
  roi: number;

  @Prop({ required: true })
  displayRoi: string;

  @Prop({ required: true })
  weight: number;

  @Prop({ required: true })
  color: string;
}

export const AllocationSchema = SchemaFactory.createForClass(Allocation);
