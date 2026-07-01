import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestorController, PlatformController } from './investor.controller';
import { InvestorService } from './investor.service';
import { User, UserSchema } from './schemas/user.schema';
import { Investment, InvestmentSchema } from './schemas/investment.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { AuthModule } from '../auth/auth.module';
import {
  InvestmentPackage,
  InvestmentPackageSchema,
} from '../admin/schemas/investment-package.schema';
import {
  PlatformSettings,
  PlatformSettingsSchema,
} from '../admin/schemas/platform-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Investment.name, schema: InvestmentSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: InvestmentPackage.name, schema: InvestmentPackageSchema },
      { name: PlatformSettings.name, schema: PlatformSettingsSchema },
    ]),
    AuthModule,
  ],
  controllers: [InvestorController, PlatformController],
  providers: [InvestorService],
  exports: [InvestorService],
})
export class InvestorModule {}
