import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { Investment, InvestmentDocument } from '../investor/schemas/investment.schema';
import { InvestorService, PayoutRunResult } from '../investor/investor.service';
import {
  Notification,
  NotificationDocument,
} from '../investor/schemas/notification.schema';
import { Transaction, TransactionDocument } from '../investor/schemas/transaction.schema';
import { User, UserDocument } from '../investor/schemas/user.schema';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { MailService } from '../mail/mail.service';
import {
  InvestmentPackage,
  InvestmentPackageDocument,
  PackageCycle,
} from './schemas/investment-package.schema';
import {
  PlatformSettings,
  PlatformSettingsDocument,
} from './schemas/platform-settings.schema';
import { JobLock, JobLockDocument } from '../jobs/schemas/job-lock.schema';

interface UpsertPackageInput {
  id?: string;
  name: string;
  cycle: PackageCycle;
  rate: number;
  duration: number;
  minInvestment: number;
  maxInvestment: number;
  description: string;
  isActive?: boolean;
}

interface AdminActor {
  userId?: string;
  email?: string;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Investment.name)
    private readonly investmentModel: Model<InvestmentDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(InvestmentPackage.name)
    private readonly packageModel: Model<InvestmentPackageDocument>,
    @InjectModel(PlatformSettings.name)
    private readonly settingsModel: Model<PlatformSettingsDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(JobLock.name)
    private readonly jobLockModel: Model<JobLockDocument>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly investorService: InvestorService,
  ) {}

  async getOverview() {
    await this.ensureSettings();
    await this.ensurePackages();
    const [users, activeInvestments, transactions, packages, settings] =
      await Promise.all([
        this.userModel.find().lean().exec(),
        this.investmentModel.find({ status: 'active' }).lean().exec(),
        this.transactionModel
          .find()
          .sort({ timestamp: -1 })
          .limit(10)
          .populate('userId', 'name email')
          .lean()
          .exec(),
        this.packageModel.find().sort({ minInvestment: 1 }).lean().exec(),
        this.settingsModel.findOne({ key: 'default' }).lean().exec(),
      ]);

    const totalWalletBalance = users.reduce((sum, user) => sum + user.balance, 0);
    const activeCapital = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalEarned = users.reduce((sum, user) => sum + user.totalEarned, 0);

    return {
      metrics: {
        investors: users.filter((user) => user.roles?.includes('investor')).length,
        activePlans: activeInvestments.length,
        totalWalletBalance,
        activeCapital,
        totalEarned,
      },
      packages,
      settings,
      recentUsers: users
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 8)
        .map(({ passwordHash, ...user }) => user),
      recentTransactions: transactions,
    };
  }

  async listPackages() {
    await this.ensurePackages();
    return this.packageModel.find().sort({ minInvestment: 1 }).lean().exec();
  }

  async createPackage(input: UpsertPackageInput, actor?: AdminActor) {
    this.validatePackage(input);
    const id = input.id ?? this.slugify(input.name);
    const existing = await this.packageModel.findOne({ id }).exec();
    if (existing) {
      throw new BadRequestException('A package with this id already exists');
    }

    const created = await this.packageModel.create({ ...input, id, isActive: input.isActive ?? true });
    await this.audit(actor, 'package.create', 'package', id, { name: input.name });
    return created;
  }

  async updatePackage(id: string, input: Partial<UpsertPackageInput>, actor?: AdminActor) {
    if (input.minInvestment !== undefined && input.maxInvestment !== undefined) {
      if (input.minInvestment > input.maxInvestment) {
        throw new BadRequestException('minInvestment cannot exceed maxInvestment');
      }
    }

    const updated = await this.packageModel
      .findOneAndUpdate({ id }, { $set: input }, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Package not found');
    }

    await this.audit(actor, 'package.update', 'package', id, { changes: input });
    return updated;
  }

  async deletePackage(id: string, actor?: AdminActor) {
    const deleted = await this.packageModel.findOneAndDelete({ id }).exec();
    if (!deleted) {
      throw new NotFoundException('Package not found');
    }
    await this.audit(actor, 'package.delete', 'package', id, { name: deleted.name });
    return { success: true, id };
  }

  async getSettings() {
    return this.ensureSettings();
  }

  async updateSettings(input: Partial<PlatformSettings>, actor?: AdminActor) {
    const next = await this.settingsModel
      .findOneAndUpdate(
        { key: 'default' },
        { $set: { ...input, key: 'default' } },
        { new: true, upsert: true, runValidators: true },
      )
      .exec();

    if (next.minDeposit > next.maxDeposit) {
      throw new BadRequestException('minDeposit cannot exceed maxDeposit');
    }
    if (next.minWithdrawal > next.maxWithdrawal) {
      throw new BadRequestException('minWithdrawal cannot exceed maxWithdrawal');
    }

    await this.audit(actor, 'settings.update', 'platform_settings', 'default', { changes: input });
    return next;
  }

  async listUsers() {
    return this.userModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async updateUserRoles(userId: string, roles: string[], actor?: AdminActor) {
    const allowedRoles = ['investor', 'support', 'admin', 'superadmin'];
    const nextRoles = roles.filter((role) => allowedRoles.includes(role));
    if (nextRoles.length === 0) {
      throw new BadRequestException('At least one valid role is required');
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: { roles: nextRoles } }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.audit(actor, 'user.roles.update', 'user', userId, { roles: nextRoles });
    return user;
  }

  async listTransactions() {
    return this.transactionModel
      .find()
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('userId', 'name email')
      .lean()
      .exec();
  }

  async listAuditLogs() {
    return this.auditLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();
  }

  async listInvestments() {
    return this.investmentModel
      .find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name email')
      .lean()
      .exec();
  }

  async getPayoutJobStatus() {
    const lock = await this.jobLockModel.findOne({ name: 'investment-payouts' }).lean().exec();
    const activeInvestments = await this.investmentModel.countDocuments({ status: 'active' }).exec();
    const now = new Date();

    return {
      enabled: process.env.JOBS_ENABLED !== 'false',
      activeInvestments,
      locked: lock ? new Date(lock.lockedUntil).getTime() > now.getTime() : false,
      lockedUntil: lock?.lockedUntil,
      lastRunAt: lock?.lastRunAt,
      lastFinishedAt: lock?.lastFinishedAt,
      owner: lock?.owner,
      serverTime: now,
    };
  }

  async runPayoutCatchup(actor?: AdminActor) {
    const lock = await this.acquirePayoutLock(`manual-${actor?.userId ?? 'admin'}`);
    if (!lock) {
      return {
        success: false,
        message: 'Payout job is already running or locked. Try again after the lock expires.',
        status: await this.getPayoutJobStatus(),
      };
    }

    const total: PayoutRunResult & { usersChecked: number } = {
      usersChecked: 0,
      payoutsProcessed: 0,
      maturedInvestments: 0,
      amountPaid: 0,
      principalReturned: 0,
    };

    try {
      const userIds = await this.investmentModel.distinct('userId', { status: 'active' }).exec();
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

      await this.audit(actor, 'job.payouts.run', 'job', 'investment-payouts', { ...total });
      return { success: true, ...total };
    } finally {
      await this.jobLockModel
        .updateOne(
          { name: 'investment-payouts', owner: lock.owner },
          { $set: { lockedUntil: new Date(), lastFinishedAt: new Date() } },
        )
        .exec();
    }
  }

  async approveTransaction(transactionId: string, actor: AdminActor, note?: string) {
    const tx = await this.transactionModel.findById(transactionId).exec();
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    if (!['deposit', 'withdrawal'].includes(tx.type)) {
      throw new BadRequestException('Only deposits and withdrawals can be reviewed');
    }
    if (tx.status !== 'pending') {
      throw new BadRequestException('Transaction has already been reviewed');
    }

    const user = await this.userModel.findById(tx.userId).exec();
    if (!user) {
      throw new NotFoundException('Transaction owner not found');
    }

    if (tx.type === 'deposit') {
      user.balance += tx.amount;
      await this.creditReferralBonus(user, tx.amount, actor);
      await user.save();
    }

    tx.status = 'approved';
    tx.reviewedBy = actor.userId ? new Types.ObjectId(actor.userId) : undefined;
    tx.reviewedAt = new Date();
    tx.reviewNote = note;
    tx.description =
      tx.type === 'deposit'
        ? `Deposit approved via ${tx.method ?? 'unknown method'}`
        : `Withdrawal approved to ${tx.destination ?? 'destination'} (${tx.method ?? 'unknown method'})`;
    await tx.save();

    const title = tx.type === 'deposit' ? 'Deposit approved' : 'Withdrawal approved';
    const message = `Your $${tx.amount.toFixed(2)} ${tx.type} request has been approved.`;
    await this.notify(tx.userId, title, message, 'success');
    await this.mailService.sendWalletReviewEmail(user.email, user.name, title, message);
    await this.audit(actor, `${tx.type}.approve`, 'transaction', tx.id, {
      amount: tx.amount,
      userId: tx.userId.toString(),
      note,
    });

    return tx.populate('userId', 'name email');
  }

  async rejectTransaction(transactionId: string, actor: AdminActor, note?: string) {
    const tx = await this.transactionModel.findById(transactionId).exec();
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    if (!['deposit', 'withdrawal'].includes(tx.type)) {
      throw new BadRequestException('Only deposits and withdrawals can be reviewed');
    }
    if (tx.status !== 'pending') {
      throw new BadRequestException('Transaction has already been reviewed');
    }

    const user = await this.userModel.findById(tx.userId).exec();
    if (!user) {
      throw new NotFoundException('Transaction owner not found');
    }

    if (tx.type === 'withdrawal') {
      user.balance += tx.amount;
      await user.save();
    }

    tx.status = 'rejected';
    tx.reviewedBy = actor.userId ? new Types.ObjectId(actor.userId) : undefined;
    tx.reviewedAt = new Date();
    tx.reviewNote = note;
    tx.description = `${tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} rejected`;
    await tx.save();

    const title = tx.type === 'deposit' ? 'Deposit rejected' : 'Withdrawal rejected';
    const message = `Your $${tx.amount.toFixed(2)} ${tx.type} request was rejected.${note ? ` ${note}` : ''}`;
    await this.notify(tx.userId, title, message, 'warning');
    await this.mailService.sendWalletReviewEmail(user.email, user.name, title, message);
    await this.audit(actor, `${tx.type}.reject`, 'transaction', tx.id, {
      amount: tx.amount,
      userId: tx.userId.toString(),
      note,
    });

    return tx.populate('userId', 'name email');
  }

  async listWithdrawals() {
    return this.transactionModel
      .find({ type: 'withdrawal' })
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('userId', 'name email')
      .lean()
      .exec();
  }

  async listDeposits() {
    return this.transactionModel
      .find({ type: 'deposit' })
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('userId', 'name email')
      .lean()
      .exec();
  }

  private validatePackage(input: UpsertPackageInput) {
    if (!input.name?.trim()) {
      throw new BadRequestException('Package name is required');
    }
    if (!['daily', 'weekly', 'monthly'].includes(input.cycle)) {
      throw new BadRequestException('Package cycle must be daily, weekly, or monthly');
    }
    if (input.rate < 0 || input.duration < 1) {
      throw new BadRequestException('Rate and duration must be positive');
    }
    if (input.minInvestment > input.maxInvestment) {
      throw new BadRequestException('minInvestment cannot exceed maxInvestment');
    }
  }

  private async acquirePayoutLock(owner: string) {
    const now = new Date();
    await this.ensureJobLock('investment-payouts');
    return this.jobLockModel
      .findOneAndUpdate(
        { name: 'investment-payouts', lockedUntil: { $lte: now } },
        {
          $set: {
            lockedUntil: new Date(now.getTime() + this.getEnvNumber('PAYOUT_JOB_LOCK_MS', 5 * 60 * 1000)),
            owner,
            lastRunAt: now,
          },
        },
        { new: true },
      )
      .exec();
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

  private getEnvNumber(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) ? value : fallback;
  }

  private async creditReferralBonus(
    user: UserDocument,
    qualifyingDepositAmount: number,
    actor?: AdminActor,
  ) {
    if (!user.referredBy || user.referralRewardPaid) return;

    const previousApprovedDeposits = await this.transactionModel
      .countDocuments({ userId: user._id, type: 'deposit', status: 'approved' })
      .exec();
    if (previousApprovedDeposits > 0) return;

    const bonusAmount = this.referralBonusAmount();
    if (bonusAmount <= 0) return;

    const referrer = await this.userModel.findById(user.referredBy).exec();
    if (!referrer) return;

    referrer.balance += bonusAmount;
    referrer.referralEarnings = (referrer.referralEarnings ?? 0) + bonusAmount;
    await referrer.save();

    user.referralRewardPaid = true;

    await this.transactionModel.create({
      userId: referrer._id,
      type: 'referral_bonus',
      status: 'completed',
      amount: bonusAmount,
      description: `Referral bonus for ${user.name}'s first approved deposit`,
      reference: user._id.toString(),
      timestamp: new Date(),
    });

    await this.notify(
      referrer._id,
      'Referral bonus credited',
      `$${bonusAmount.toFixed(2)} was credited after ${user.name}'s first deposit was approved.`,
      'success',
    );

    await this.audit(actor, 'referral.bonus.credit', 'user', referrer.id, {
      referredUserId: user.id,
      qualifyingDepositAmount,
      bonusAmount,
    });
  }

  private referralBonusAmount() {
    return Number(this.configService.get<string>('REFERRAL_BONUS_USD') ?? 10);
  }

  private async ensureSettings() {
    await this.settingsModel.updateOne(
      { key: 'default' },
      {
        $setOnInsert: {
          key: 'default',
          minDeposit: 10,
          maxDeposit: 100000,
          minWithdrawal: 1,
          maxWithdrawal: 150000,
          depositsEnabled: true,
          withdrawalsEnabled: true,
        },
      },
      { upsert: true },
    );

    return this.settingsModel.findOne({ key: 'default' }).lean().exec();
  }

  private async ensurePackages() {
    const count = await this.packageModel.countDocuments().exec();
    if (count > 0) return;

    await this.packageModel.insertMany([
      {
        id: 'daily-starter',
        name: 'Starter Daily',
        cycle: 'daily',
        rate: 1.5,
        duration: 30,
        minInvestment: 100,
        maxInvestment: 2500,
        description: 'Ideal for quick gains and testing the waters. Paid out every 24 hours.',
        isActive: true,
      },
      {
        id: 'weekly-growth',
        name: 'Pro Weekly Growth',
        cycle: 'weekly',
        rate: 12,
        duration: 12,
        minInvestment: 1000,
        maxInvestment: 25000,
        description: 'Our most balanced package for steady compounding. Paid out weekly.',
        isActive: true,
      },
      {
        id: 'monthly-elite',
        name: 'Elite Monthly Wealth',
        cycle: 'monthly',
        rate: 65,
        duration: 6,
        minInvestment: 5000,
        maxInvestment: 150000,
        description: 'Premium investment package for high-net-worth growth. Paid out monthly.',
        isActive: true,
      },
    ]);
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async notify(
    userId: Types.ObjectId,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
  ) {
    await this.notificationModel.create({ userId, title, message, type, read: false });
  }

  private async audit(
    actor: AdminActor | undefined,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.auditLogModel.create({
      actorId: actor?.userId ? new Types.ObjectId(actor.userId) : undefined,
      actorEmail: actor?.email ?? 'system',
      action,
      entityType,
      entityId,
      metadata,
    });
  }
}
