import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { InvestorModule } from '../investor/investor.module';
import { Investment, InvestmentSchema } from '../investor/schemas/investment.schema';
import { Transaction, TransactionSchema } from '../investor/schemas/transaction.schema';
import { User, UserSchema } from '../investor/schemas/user.schema';
import {
  Notification,
  NotificationSchema,
} from '../investor/schemas/notification.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import {
  InvestmentPackage,
  InvestmentPackageSchema,
} from './schemas/investment-package.schema';
import {
  PlatformSettings,
  PlatformSettingsSchema,
} from './schemas/platform-settings.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { JobLock, JobLockSchema } from '../jobs/schemas/job-lock.schema';
import { MailModule } from '../mail/mail.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    AuthModule,
    InvestorModule,
    MailModule,
    PaymentsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Investment.name, schema: InvestmentSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: InvestmentPackage.name, schema: InvestmentPackageSchema },
      { name: PlatformSettings.name, schema: PlatformSettingsSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: JobLock.name, schema: JobLockSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
