import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../investor/schemas/user.schema';
import {
  Notification,
  NotificationSchema,
} from '../investor/schemas/notification.schema';
import { AuditLog, AuditLogSchema } from '../admin/schemas/audit-log.schema';
import { MailModule } from '../mail/mail.module';
import { SupportTicket, SupportTicketSchema } from './schemas/support-ticket.schema';
import { AdminSupportController, InvestorSupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [
    AuthModule,
    MailModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: SupportTicket.name, schema: SupportTicketSchema },
    ]),
  ],
  controllers: [InvestorSupportController, AdminSupportController],
  providers: [SupportService],
})
export class SupportModule {}
