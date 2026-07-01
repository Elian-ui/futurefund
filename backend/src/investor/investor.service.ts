import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Investment, InvestmentDocument } from './schemas/investment.schema';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import {
  InvestmentPackage,
  InvestmentPackageDocument,
} from '../admin/schemas/investment-package.schema';
import {
  DEFAULT_PAYMENT_METHODS,
  PaymentMethod,
  PlatformSettings,
  PlatformSettingsDocument,
} from '../admin/schemas/platform-settings.schema';

export const INVESTMENT_PACKAGES = [
  {
    id: 'daily-starter',
    name: 'Starter Daily',
    cycle: 'daily',
    rate: 1.5,
    duration: 30,
    minInvestment: 100,
    maxInvestment: 2500,
  },
  {
    id: 'weekly-growth',
    name: 'Pro Weekly Growth',
    cycle: 'weekly',
    rate: 12.0,
    duration: 12,
    minInvestment: 1000,
    maxInvestment: 25000,
  },
  {
    id: 'monthly-elite',
    name: 'Elite Monthly Wealth',
    cycle: 'monthly',
    rate: 65.0,
    duration: 6,
    minInvestment: 5000,
    maxInvestment: 150000,
  },
];

export interface PayoutRunResult {
  payoutsProcessed: number;
  maturedInvestments: number;
  amountPaid: number;
  principalReturned: number;
}

@Injectable()
export class InvestorService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Investment.name) private readonly investmentModel: Model<InvestmentDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(InvestmentPackage.name)
    private readonly packageModel: Model<InvestmentPackageDocument>,
    @InjectModel(PlatformSettings.name)
    private readonly settingsModel: Model<PlatformSettingsDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedAdminControlledDefaults();
  }

  private async getUserById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async processAccruedPayouts(user: UserDocument): Promise<PayoutRunResult> {
    const summary: PayoutRunResult = {
      payoutsProcessed: 0,
      maturedInvestments: 0,
      amountPaid: 0,
      principalReturned: 0,
    };
    const investments = await this.investmentModel
      .find({ userId: user._id, status: 'active' })
      .exec();
    if (investments.length === 0) return summary;

    const now = new Date();
    let balanceUpdated = false;

    for (const inv of investments) {
      const lastPayout = new Date(inv.lastPayoutDate || (inv as any).createdAt);
      const diffMs = now.getTime() - lastPayout.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let cycles = 0;
      let cycleMs = 0;

      if (inv.cycle === 'daily') {
        cycles = diffDays;
        cycleMs = 1000 * 60 * 60 * 24;
      } else if (inv.cycle === 'weekly') {
        cycles = Math.floor(diffDays / 7);
        cycleMs = 1000 * 60 * 60 * 24 * 7;
      } else if (inv.cycle === 'monthly') {
        cycles = Math.floor(diffDays / 30);
        cycleMs = 1000 * 60 * 60 * 24 * 30;
      }

      if (cycles > 0) {
        const remainingCycles = inv.duration - inv.durationSpent;
        const cyclesToPay = Math.min(cycles, remainingCycles);

        if (cyclesToPay > 0) {
          const payoutAmount = inv.amount * (inv.rate / 100) * cyclesToPay;

          user.balance += payoutAmount;
          user.totalEarned += payoutAmount;
          balanceUpdated = true;
          summary.payoutsProcessed += cyclesToPay;
          summary.amountPaid += payoutAmount;

          inv.durationSpent += cyclesToPay;
          inv.accumulatedYield += payoutAmount;
          inv.lastPayoutDate = new Date(lastPayout.getTime() + cyclesToPay * cycleMs);

          const tx = new this.transactionModel({
            userId: user._id,
            type: 'payout',
            status: 'completed',
            amount: payoutAmount,
            description: `ROI Yield payout for ${inv.packageName}`,
            timestamp: new Date(),
          });
          await tx.save();
          await this.createNotification(
            user._id,
            'ROI payout credited',
            `$${payoutAmount.toFixed(2)} has been credited from ${inv.packageName}.`,
            'success',
          );

          if (inv.durationSpent >= inv.duration) {
            inv.status = 'completed';
            user.balance += inv.amount;
            user.totalInvested = Math.max(0, user.totalInvested - inv.amount);
            summary.maturedInvestments += 1;
            summary.principalReturned += inv.amount;

            const refundTx = new this.transactionModel({
              userId: user._id,
              type: 'maturity_refund',
              status: 'completed',
              amount: inv.amount,
              description: `Principal returned for matured ${inv.packageName}`,
              timestamp: new Date(),
            });
            await refundTx.save();
            await this.createNotification(
              user._id,
              'Investment matured',
              `${inv.packageName} matured and principal was returned to your wallet.`,
              'success',
            );
          }

          await inv.save();
        }
      }
    }

    if (balanceUpdated) {
      await user.save();
    }

    return summary;
  }

  async getProfile(userId: string): Promise<UserDocument> {
    const user = await this.getUserById(userId);
    await this.processAccruedPayouts(user);
    return user;
  }

  async deposit(userId: string, amount: number, method: string, reference?: string): Promise<Transaction> {
    const settings = await this.getPlatformSettings();
    if (!settings.depositsEnabled) {
      throw new BadRequestException('Deposits are currently disabled');
    }
    const paymentMethod = this.resolvePaymentMethod(settings.paymentMethods, method, 'deposit');
    if (amount < settings.minDeposit) {
      throw new BadRequestException(`Minimum deposit is $${settings.minDeposit}`);
    }
    if (amount > settings.maxDeposit) {
      throw new BadRequestException(`Maximum deposit is $${settings.maxDeposit}`);
    }
    const user = await this.getUserById(userId);
    await this.processAccruedPayouts(user);

    const tx = new this.transactionModel({
      userId: user._id,
      type: 'deposit',
      status: 'pending',
      amount,
      method: paymentMethod.method,
      reference,
      description: `Deposit request via ${paymentMethod.method}`,
      timestamp: new Date(),
    });
    await tx.save();
    await this.createNotification(
      user._id,
      'Deposit submitted',
      `Your $${amount.toFixed(2)} deposit request is pending admin review.`,
      'info',
    );

    return tx;
  }

  async withdraw(
    userId: string,
    amount: number,
    address: string,
    method: string,
  ): Promise<Transaction> {
    const settings = await this.getPlatformSettings();
    if (!settings.withdrawalsEnabled) {
      throw new BadRequestException('Withdrawals are currently disabled');
    }
    const paymentMethod = this.resolvePaymentMethod(settings.paymentMethods, method, 'withdrawal');
    if (amount < settings.minWithdrawal) {
      throw new BadRequestException(`Minimum withdrawal is $${settings.minWithdrawal}`);
    }
    if (amount > settings.maxWithdrawal) {
      throw new BadRequestException(`Maximum withdrawal is $${settings.maxWithdrawal}`);
    }
    const user = await this.getProfile(userId);
    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    user.balance -= amount;
    await user.save();

    const tx = new this.transactionModel({
      userId: user._id,
      type: 'withdrawal',
      status: 'pending',
      amount,
      method: paymentMethod.method,
      destination: address,
      description: `Withdrawal request to ${address} (${paymentMethod.method})`,
      timestamp: new Date(),
    });
    await tx.save();
    await this.createNotification(
      user._id,
      'Withdrawal submitted',
      `Your $${amount.toFixed(2)} withdrawal request is pending admin review.`,
      'info',
    );

    return tx;
  }

  async getInvestments(userId: string): Promise<Investment[]> {
    const user = await this.getUserById(userId);
    await this.processAccruedPayouts(user);
    return this.investmentModel
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .exec();
  }

  async buyPackage(userId: string, packageId: string, amount: number): Promise<Investment> {
    const user = await this.getProfile(userId);
    const pkg = await this.packageModel.findOne({ id: packageId, isActive: true }).exec();
    if (!pkg) {
      throw new BadRequestException('Package not found');
    }
    if (amount < pkg.minInvestment) {
      throw new BadRequestException(`Minimum investment is $${pkg.minInvestment}`);
    }
    if (amount > pkg.maxInvestment) {
      throw new BadRequestException(`Maximum investment is $${pkg.maxInvestment}`);
    }
    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    user.balance -= amount;
    user.totalInvested += amount;
    await user.save();

    const investment = new this.investmentModel({
      userId: user._id,
      packageId: pkg.id,
      packageName: pkg.name,
      cycle: pkg.cycle,
      rate: pkg.rate,
      duration: pkg.duration,
      durationSpent: 0,
      amount,
      accumulatedYield: 0,
      status: 'active',
      daysSinceLastPayout: 0,
    });
    await investment.save();

    const tx = new this.transactionModel({
      userId: user._id,
      type: 'investment',
      status: 'completed',
      amount,
      description: `Invested in ${pkg.name}`,
      timestamp: new Date(),
    });
    await tx.save();
    await this.createNotification(
      user._id,
      'Package purchased',
      `Your ${pkg.name} package is active with $${amount.toFixed(2)} capital.`,
      'success',
    );

    return investment;
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    const user = await this.getUserById(userId);
    await this.processAccruedPayouts(user);
    return this.transactionModel
      .find({ userId: user._id })
      .sort({ timestamp: -1 })
      .exec();
  }

  async getNotifications(userId: string) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
  }

  async markNotificationsRead(userId: string) {
    await this.notificationModel
      .updateMany({ userId: new Types.ObjectId(userId), read: false }, { $set: { read: true } })
      .exec();
    return { success: true };
  }

  async getPublicPackages() {
    await this.seedAdminControlledDefaults();
    return this.packageModel.find({ isActive: true }).sort({ minInvestment: 1 }).lean().exec();
  }

  async getPublicSettings() {
    const settings = await this.getPlatformSettings();
    const { minDeposit, maxDeposit, minWithdrawal, maxWithdrawal, depositsEnabled, withdrawalsEnabled } =
      settings;
    return {
      minDeposit,
      maxDeposit,
      minWithdrawal,
      maxWithdrawal,
      depositsEnabled,
      withdrawalsEnabled,
      paymentMethods: this.publicPaymentMethods(settings.paymentMethods),
      referralBonusUsd: this.referralBonusAmount(),
    };
  }

  private async getPlatformSettings() {
    await this.seedAdminControlledDefaults();
    const settings = await this.settingsModel.findOne({ key: 'default' }).exec();
    if (!settings) {
      throw new BadRequestException('Platform settings are not configured');
    }
    return settings;
  }

  private async seedAdminControlledDefaults() {
    const packageCount = await this.packageModel.countDocuments().exec();
    if (packageCount === 0) {
      await this.packageModel.insertMany(
        INVESTMENT_PACKAGES.map((pkg) => ({
          ...pkg,
          description:
            pkg.id === 'daily-starter'
              ? 'Ideal for quick gains and testing the waters. Paid out every 24 hours.'
              : pkg.id === 'weekly-growth'
                ? 'Our most balanced package for steady compounding. Paid out weekly.'
                : 'Premium investment package for high-net-worth growth. Paid out monthly.',
          isActive: true,
        })),
      );
    }

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
          paymentMethods: DEFAULT_PAYMENT_METHODS,
        },
      },
      { upsert: true },
    );

    await this.settingsModel
      .updateOne(
        { key: 'default', $or: [{ paymentMethods: { $exists: false } }, { paymentMethods: { $size: 0 } }] },
        { $set: { paymentMethods: DEFAULT_PAYMENT_METHODS } },
      )
      .exec();
  }

  private referralBonusAmount() {
    return Number(this.configService.get<string>('REFERRAL_BONUS_USD') ?? 10);
  }

  private publicPaymentMethods(methods: PaymentMethod[] = DEFAULT_PAYMENT_METHODS) {
    return methods
      .filter((method) => method.enabled)
      .map(({ id, label, method, network, address, depositEnabled, withdrawalEnabled }) => ({
        id,
        label,
        method,
        network,
        address,
        depositEnabled,
        withdrawalEnabled,
      }));
  }

  private resolvePaymentMethod(
    methods: PaymentMethod[] = DEFAULT_PAYMENT_METHODS,
    value: string,
    direction: 'deposit' | 'withdrawal',
  ) {
    const normalizedValue = value?.trim().toUpperCase();
    const method = methods.find((item) => {
      return (
        item.id.toUpperCase() === normalizedValue ||
        item.method.toUpperCase() === normalizedValue ||
        item.label.toUpperCase() === normalizedValue
      );
    });

    if (!method || !method.enabled) {
      throw new BadRequestException('Unsupported payment method');
    }
    if (direction === 'deposit' && !method.depositEnabled) {
      throw new BadRequestException('This payment method is not available for deposits');
    }
    if (direction === 'withdrawal' && !method.withdrawalEnabled) {
      throw new BadRequestException('This payment method is not available for withdrawals');
    }

    return method;
  }

  private async createNotification(
    userId: Types.ObjectId,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
  ) {
    await this.notificationModel.create({ userId, title, message, type, read: false });
  }
}
