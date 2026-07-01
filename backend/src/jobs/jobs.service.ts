import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { InvestorService, PayoutRunResult } from '../investor/investor.service';
import { Investment, InvestmentDocument } from '../investor/schemas/investment.schema';
import { User, UserDocument } from '../investor/schemas/user.schema';
import {
  SupportTicket,
  SupportTicketDocument,
} from '../support/schemas/support-ticket.schema';
import { JobLock, JobLockDocument } from './schemas/job-lock.schema';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly instanceId = `${process.pid}-${randomUUID()}`;
  private readonly timers: NodeJS.Timeout[] = [];
  private payoutJobRunning = false;
  private supportJobRunning = false;

  constructor(
    private readonly investorService: InvestorService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Investment.name)
    private readonly investmentModel: Model<InvestmentDocument>,
    @InjectModel(SupportTicket.name)
    private readonly ticketModel: Model<SupportTicketDocument>,
    @InjectModel(JobLock.name)
    private readonly jobLockModel: Model<JobLockDocument>,
  ) {}

  onModuleInit() {
    if (process.env.JOBS_ENABLED === 'false') {
      this.logger.log('Background jobs are disabled by JOBS_ENABLED=false');
      return;
    }

    this.registerJob(
      'investment payouts',
      this.getEnvNumber('PAYOUT_JOB_INTERVAL_MS', 60_000),
      () => this.processInvestmentPayouts(),
    );
    this.registerJob(
      'support backlog',
      this.getEnvNumber('SUPPORT_JOB_INTERVAL_MS', 300_000),
      () => this.logSupportBacklog(),
    );

    void this.processInvestmentPayouts();
    void this.logSupportBacklog();
  }

  onModuleDestroy() {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
  }

  private registerJob(name: string, intervalMs: number, run: () => Promise<void>) {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      this.logger.log(`${name} job disabled`);
      return;
    }

    const timer = setInterval(() => {
      void run();
    }, intervalMs);
    timer.unref?.();
    this.timers.push(timer);
    this.logger.log(`${name} job scheduled every ${intervalMs}ms`);
  }

  private async processInvestmentPayouts() {
    if (this.payoutJobRunning) return;
    this.payoutJobRunning = true;

    try {
      await this.withJobLock(
        'investment-payouts',
        this.getEnvNumber('PAYOUT_JOB_LOCK_MS', 5 * 60 * 1000),
        async () => {
          const userIds = await this.investmentModel
            .distinct('userId', { status: 'active' })
            .exec();
          const total: PayoutRunResult & { usersChecked: number } = {
            usersChecked: 0,
            payoutsProcessed: 0,
            maturedInvestments: 0,
            amountPaid: 0,
            principalReturned: 0,
          };

          for (const userId of userIds) {
            const user = await this.userModel.findById(userId).exec();
            if (!user) continue;

            total.usersChecked += 1;
            const result = await this.investorService.processAccruedPayouts(user);
            total.payoutsProcessed += result.payoutsProcessed;
            total.maturedInvestments += result.maturedInvestments;
            total.amountPaid += result.amountPaid;
            total.principalReturned += result.principalReturned;
          }

          if (total.payoutsProcessed > 0 || total.maturedInvestments > 0) {
            this.logger.log(
              `Processed ${total.payoutsProcessed} payout cycle(s) for ${total.usersChecked} user(s). ` +
                `Paid ${total.amountPaid.toFixed(2)}, returned ${total.principalReturned.toFixed(2)} principal, ` +
                `matured ${total.maturedInvestments} investment(s).`,
            );
          }
        },
      );
    } catch (error) {
      this.logger.error('Investment payout job failed', error instanceof Error ? error.stack : error);
    } finally {
      this.payoutJobRunning = false;
    }
  }

  private async logSupportBacklog() {
    if (this.supportJobRunning) return;
    this.supportJobRunning = true;

    try {
      await this.withJobLock(
        'support-backlog',
        this.getEnvNumber('SUPPORT_JOB_LOCK_MS', 10 * 60 * 1000),
        async () => {
          const staleSince = new Date(
            Date.now() - this.getEnvNumber('SUPPORT_STALE_AFTER_MS', 24 * 60 * 60 * 1000),
          );
          const [open, urgent, stalePending] = await Promise.all([
            this.ticketModel.countDocuments({ status: 'open' }).exec(),
            this.ticketModel
              .countDocuments({ priority: 'urgent', status: { $nin: ['resolved', 'closed'] } })
              .exec(),
            this.ticketModel
              .countDocuments({ status: 'pending', lastActivityAt: { $lte: staleSince } })
              .exec(),
          ]);

          if (open > 0 || urgent > 0 || stalePending > 0) {
            this.logger.log(
              `Support backlog: ${open} open, ${urgent} urgent, ${stalePending} stale pending ticket(s).`,
            );
          }
        },
      );
    } catch (error) {
      this.logger.error('Support backlog job failed', error instanceof Error ? error.stack : error);
    } finally {
      this.supportJobRunning = false;
    }
  }

  private getEnvNumber(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) ? value : fallback;
  }

  private async withJobLock(name: string, leaseMs: number, run: () => Promise<void>) {
    const now = new Date();
    await this.ensureJobLock(name);

    const lock = await this.jobLockModel
      .findOneAndUpdate(
        { name, lockedUntil: { $lte: now } },
        {
          $set: {
            lockedUntil: new Date(now.getTime() + leaseMs),
            owner: this.instanceId,
            lastRunAt: now,
          },
        },
        { new: true },
      )
      .exec();

    if (!lock) return;

    try {
      await run();
    } finally {
      await this.jobLockModel
        .updateOne(
          { name, owner: this.instanceId },
          { $set: { lockedUntil: new Date(), lastFinishedAt: new Date() } },
        )
        .exec();
    }
  }

  private async ensureJobLock(name: string) {
    try {
      await this.jobLockModel
        .updateOne(
          { name },
          { $setOnInsert: { name, lockedUntil: new Date(0) } },
          { upsert: true },
        )
        .exec();
    } catch (error) {
      const duplicateKeyCode = 11000;
      if (!(typeof error === 'object' && error && 'code' in error && error.code === duplicateKeyCode)) {
        throw error;
      }
    }
  }
}
