import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SupportTicketDocument = HydratedDocument<SupportTicket>;
export type SupportTicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportTicketCategory =
  | 'account'
  | 'deposit'
  | 'withdrawal'
  | 'investment'
  | 'technical'
  | 'other';

@Schema({ _id: false, timestamps: true })
export class SupportMessage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, enum: ['investor', 'support', 'admin'] })
  authorRole: 'investor' | 'support' | 'admin';

  @Prop({ required: true })
  body: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const SupportMessageSchema =
  SchemaFactory.createForClass(SupportMessage);

@Schema({ timestamps: true })
export class SupportTicket {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  assignedTo?: Types.ObjectId | null;

  @Prop({ required: true })
  subject: string;

  @Prop({
    required: true,
    enum: ['account', 'deposit', 'withdrawal', 'investment', 'technical', 'other'],
    default: 'other',
  })
  category: SupportTicketCategory;

  @Prop({
    required: true,
    enum: ['open', 'pending', 'resolved', 'closed'],
    default: 'open',
    index: true,
  })
  status: SupportTicketStatus;

  @Prop({
    required: true,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true,
  })
  priority: SupportTicketPriority;

  @Prop({ type: [SupportMessageSchema], default: [] })
  messages: SupportMessage[];

  @Prop({ required: true, default: Date.now })
  lastActivityAt: Date;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
