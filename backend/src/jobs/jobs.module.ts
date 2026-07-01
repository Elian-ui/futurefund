import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestorModule } from '../investor/investor.module';
import { Investment, InvestmentSchema } from '../investor/schemas/investment.schema';
import { User, UserSchema } from '../investor/schemas/user.schema';
import {
  SupportTicket,
  SupportTicketSchema,
} from '../support/schemas/support-ticket.schema';
import { JobsService } from './jobs.service';
import { JobLock, JobLockSchema } from './schemas/job-lock.schema';

@Module({
  imports: [
    InvestorModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Investment.name, schema: InvestmentSchema },
      { name: SupportTicket.name, schema: SupportTicketSchema },
      { name: JobLock.name, schema: JobLockSchema },
    ]),
  ],
  providers: [JobsService],
})
export class JobsModule {}
