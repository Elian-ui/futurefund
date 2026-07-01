import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../admin/schemas/audit-log.schema';
import { MailService } from '../mail/mail.service';
import {
  Notification,
  NotificationDocument,
} from '../investor/schemas/notification.schema';
import { User, UserDocument } from '../investor/schemas/user.schema';
import {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketDocument,
  SupportTicketPriority,
  SupportTicketStatus,
} from './schemas/support-ticket.schema';

interface AuthUser {
  userId: string;
  email?: string;
  roles?: string[];
}

interface CreateTicketInput {
  subject: string;
  category: SupportTicketCategory;
  priority?: SupportTicketPriority;
  message: string;
}

interface UpdateTicketInput {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assignedTo?: string | null;
}

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(SupportTicket.name)
    private readonly ticketModel: Model<SupportTicketDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    private readonly mailService: MailService,
  ) {}

  async createTicket(userId: string, input: CreateTicketInput) {
    this.validateTicketInput(input);
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ticket = await this.ticketModel.create({
      userId: user._id,
      subject: input.subject.trim(),
      category: input.category ?? 'other',
      priority: input.priority ?? 'normal',
      status: 'open',
      lastActivityAt: new Date(),
      messages: [
        {
          authorId: user._id,
          authorRole: 'investor',
          body: input.message.trim(),
          createdAt: new Date(),
        },
      ],
    });
    await this.audit({ userId, roles: ['investor'] }, 'support.ticket.create', 'support_ticket', ticket.id, {
      category: ticket.category,
      priority: ticket.priority,
    });
    return ticket;
  }

  async listMyTickets(userId: string) {
    return this.ticketModel
      .find({ userId })
      .sort({ lastActivityAt: -1 })
      .populate('assignedTo', 'name email')
      .lean()
      .exec();
  }

  async getMyTicket(userId: string, ticketId: string) {
    const ticket = await this.ticketModel
      .findOne({ _id: ticketId, userId })
      .populate('assignedTo', 'name email')
      .populate('messages.authorId', 'name email roles')
      .lean()
      .exec();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async addInvestorReply(userId: string, ticketId: string, body: string) {
    const message = this.cleanMessage(body);
    const ticket = await this.ticketModel.findOne({ _id: ticketId, userId }).exec();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    if (ticket.status === 'closed') {
      throw new BadRequestException('Closed tickets cannot be updated');
    }

    ticket.messages.push({
      authorId: new Types.ObjectId(userId),
      authorRole: 'investor',
      body: message,
      createdAt: new Date(),
    });
    ticket.status = 'open';
    ticket.lastActivityAt = new Date();
    const saved = await ticket.save();
    await this.audit({ userId, roles: ['investor'] }, 'support.ticket.reply', 'support_ticket', ticket.id);
    return saved;
  }

  async listAdminTickets(query: { status?: SupportTicketStatus; priority?: SupportTicketPriority }) {
    const filter: Record<string, string> = {};
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;

    return this.ticketModel
      .find(filter)
      .sort({ lastActivityAt: -1 })
      .limit(200)
      .populate('userId', 'name email balance')
      .populate('assignedTo', 'name email')
      .lean()
      .exec();
  }

  async getAdminTicket(ticketId: string) {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate('userId', 'name email balance totalInvested totalEarned')
      .populate('assignedTo', 'name email')
      .populate('messages.authorId', 'name email roles')
      .lean()
      .exec();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async updateAdminTicket(ticketId: string, input: UpdateTicketInput, authUser?: AuthUser) {
    const update: Partial<SupportTicket> = {};
    if (input.status) update.status = input.status;
    if (input.priority) update.priority = input.priority;
    if (input.assignedTo !== undefined) {
      update.assignedTo = input.assignedTo ? new Types.ObjectId(input.assignedTo) : null;
    }

    const ticket = await this.ticketModel
      .findByIdAndUpdate(ticketId, { $set: update }, { new: true, runValidators: true })
      .populate('userId', 'name email balance')
      .populate('assignedTo', 'name email')
      .exec();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.audit(authUser, 'support.ticket.update', 'support_ticket', ticket.id, input as any);
    return ticket;
  }

  async addStaffReply(authUser: AuthUser, ticketId: string, body: string) {
    const message = this.cleanMessage(body);
    const ticket = await this.ticketModel.findById(ticketId).exec();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isAdmin = authUser.roles?.some((role) => ['admin', 'superadmin'].includes(role));
    const authorRole = isAdmin ? 'admin' : 'support';

    ticket.messages.push({
      authorId: new Types.ObjectId(authUser.userId),
      authorRole,
      body: message,
      createdAt: new Date(),
    });
    ticket.assignedTo = new Types.ObjectId(authUser.userId);
    ticket.status = 'pending';
    ticket.lastActivityAt = new Date();
    const saved = await ticket.save();
    await this.notificationModel.create({
      userId: ticket.userId,
      title: 'Support replied',
      message: `A staff member replied to your ticket: ${ticket.subject}`,
      type: 'info',
      read: false,
    });
    const owner = await this.userModel.findById(ticket.userId).exec();
    if (owner) {
      await this.mailService.sendSupportReplyEmail(owner.email, owner.name, ticket.subject);
    }
    await this.audit(authUser, 'support.ticket.staff_reply', 'support_ticket', ticket.id, {
      authorRole,
    });
    return saved;
  }

  async assignToMe(authUser: AuthUser, ticketId: string) {
    if (!authUser.userId) {
      throw new ForbiddenException('Invalid support user');
    }
    return this.updateAdminTicket(ticketId, { assignedTo: authUser.userId }, authUser);
  }

  async getAdminSummary() {
    const [open, pending, resolved, urgent] = await Promise.all([
      this.ticketModel.countDocuments({ status: 'open' }),
      this.ticketModel.countDocuments({ status: 'pending' }),
      this.ticketModel.countDocuments({ status: 'resolved' }),
      this.ticketModel.countDocuments({ priority: 'urgent', status: { $nin: ['resolved', 'closed'] } }),
    ]);

    return { open, pending, resolved, urgent };
  }

  private validateTicketInput(input: CreateTicketInput) {
    if (!input.subject?.trim()) {
      throw new BadRequestException('Subject is required');
    }
    if (input.subject.trim().length < 4) {
      throw new BadRequestException('Subject is too short');
    }
    this.cleanMessage(input.message);
  }

  private cleanMessage(body: string) {
    const message = body?.trim();
    if (!message) {
      throw new BadRequestException('Message is required');
    }
    if (message.length < 5) {
      throw new BadRequestException('Message is too short');
    }
    return message;
  }

  private async audit(
    authUser: AuthUser | undefined,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.auditLogModel.create({
      actorId: authUser?.userId ? new Types.ObjectId(authUser.userId) : undefined,
      actorEmail: authUser?.email ?? authUser?.userId ?? 'system',
      action,
      entityType,
      entityId,
      metadata,
    });
  }
}
