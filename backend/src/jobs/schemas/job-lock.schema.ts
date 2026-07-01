import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type JobLockDocument = HydratedDocument<JobLock>;

@Schema({ timestamps: true })
export class JobLock {
  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop({ required: true, default: () => new Date(0), index: true })
  lockedUntil: Date;

  @Prop({ required: false })
  owner?: string;

  @Prop({ required: false })
  lastRunAt?: Date;

  @Prop({ required: false })
  lastFinishedAt?: Date;
}

export const JobLockSchema = SchemaFactory.createForClass(JobLock);
