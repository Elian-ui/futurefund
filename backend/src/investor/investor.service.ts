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
import { PesajetService } from '../payments/pesajet.service';

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

export interface MobileMoneyPollResult {
  checked: number;
  approved: number;
  rejected: number;
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
    private readonly pesajetService: PesajetService,
  ) {}

  async onModuleInit() {
    await this.seedAdminControlledDefaults();
  }

  private async getUserById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.deletedAt) {
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
    if (user.deletedAt) return summary;

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

  async deposit(
    userId: string,
    amount: number,
    method: string,
    reference?: string,
    phoneNumber?: string,
  ): Promise<Transaction> {
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
    const paymentReference = reference?.trim() || this.createPaymentReference('DEP', user._id.toString());
    let externalPaymentId: string | undefined;
    let externalPaymentStatus: string | undefined;
    let externalPaymentProvider: string | undefined;
    let externalPaymentReference: string | undefined;
    let externalProviderReference: string | undefined;
    let externalPaymentFee: number | undefined;
    let externalFailureReason: string | undefined;

    if (this.isMobileMoney(paymentMethod)) {
      this.assertMobileMoneyAvailableForUser(user, paymentMethod);
      const normalizedPhone = this.normalizeUgandanPhoneNumber(phoneNumber);
      if (normalizedPhone !== user.phoneNumber) {
        throw new BadRequestException('Mobile money deposits must use your registered phone number');
      }
      const response = await this.pesajetService.createPayment({
        type: 'COLLECTION',
        amount: this.toUgxAmount(amount),
        currency: 'UGX',
        phoneNumber: normalizedPhone,
        provider: this.mobileMoneyProvider(paymentMethod),
      });

      externalPaymentId = this.paymentResponseValue(response, ['id', 'transactionId', 'paymentId']);
      if (!externalPaymentId) {
        throw new BadRequestException('PesaJet did not return a transaction id');
      }
      externalPaymentStatus = this.paymentResponseValue(response, ['status', 'state']);
      externalPaymentProvider = paymentMethod.provider;
      externalPaymentReference = paymentReference;
      externalProviderReference = this.paymentResponseValue(response, ['providerReference']);
      externalPaymentFee = this.paymentResponseNumber(response, ['fee']);
      externalFailureReason = this.paymentResponseValue(response, ['failureReason']);
    }

    const tx = new this.transactionModel({
      userId: user._id,
      type: 'deposit',
      status: 'pending',
      amount,
      method: paymentMethod.method,
      reference: paymentReference,
      externalPaymentId,
      externalPaymentStatus,
      externalPaymentProvider,
      externalPaymentReference,
      externalProviderReference,
      externalPaymentFee,
      externalFailureReason,
      description: `Deposit request via ${paymentMethod.method}`,
      timestamp: new Date(),
    });
    await tx.save();
    await this.createNotification(
      user._id,
      'Deposit submitted',
      this.isMobileMoney(paymentMethod)
        ? `Your $${amount.toFixed(2)} mobile money deposit is being confirmed automatically.`
        : `Your $${amount.toFixed(2)} deposit request is pending admin review.`,
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
    if (this.isMobileMoney(paymentMethod)) {
      address = this.normalizeUgandanPhoneNumber(address);
    }
    if (amount < settings.minWithdrawal) {
      throw new BadRequestException(`Minimum withdrawal is $${settings.minWithdrawal}`);
    }
    if (amount > settings.maxWithdrawal) {
      throw new BadRequestException(`Maximum withdrawal is $${settings.maxWithdrawal}`);
    }
    const user = await this.getProfile(userId);
    if (this.isMobileMoney(paymentMethod)) {
      this.assertMobileMoneyAvailableForUser(user, paymentMethod);
      if (address !== user.phoneNumber) {
        throw new BadRequestException('Mobile money withdrawals must use your registered phone number');
      }
    }
    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    let externalPaymentId: string | undefined;
    let externalPaymentStatus: string | undefined;
    let externalPaymentProvider: string | undefined;
    let externalProviderReference: string | undefined;
    let externalPaymentFee: number | undefined;
    let externalFailureReason: string | undefined;
    const externalPaymentReference = this.createPaymentReference('WDR', user._id.toString());

    if (this.isMobileMoney(paymentMethod)) {
      const response = await this.pesajetService.createPayment({
        type: 'DISBURSEMENT',
        amount: this.toUgxAmount(amount),
        currency: 'UGX',
        phoneNumber: address,
        provider: this.mobileMoneyProvider(paymentMethod),
        reference: externalPaymentReference,
        description: `FutureFund wallet withdrawal for ${user.email}`,
      });
      externalPaymentId = this.paymentResponseValue(response, ['id', 'transactionId', 'paymentId']);
      if (!externalPaymentId) {
        throw new BadRequestException('PesaJet did not return a transaction id');
      }
      externalPaymentStatus = this.paymentResponseValue(response, ['status', 'state']);
      externalPaymentProvider = paymentMethod.provider;
      externalProviderReference = this.paymentResponseValue(response, ['providerReference']);
      externalPaymentFee = this.paymentResponseNumber(response, ['fee']);
      externalFailureReason = this.paymentResponseValue(response, ['failureReason']);
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
      externalPaymentId,
      externalPaymentStatus,
      externalPaymentProvider,
      externalPaymentReference,
      externalProviderReference,
      externalPaymentFee,
      externalFailureReason,
      description: `Withdrawal request to ${address} (${paymentMethod.method})`,
      timestamp: new Date(),
    });
    await tx.save();
    await this.createNotification(
      user._id,
      'Withdrawal submitted',
      this.isMobileMoney(paymentMethod)
        ? `Your $${amount.toFixed(2)} mobile money withdrawal is being processed automatically.`
        : `Your $${amount.toFixed(2)} withdrawal request is pending admin review.`,
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

  async processMobileMoneyTransactions(limit = 50): Promise<MobileMoneyPollResult> {
    const summary: MobileMoneyPollResult = { checked: 0, approved: 0, rejected: 0 };
    const transactions = await this.transactionModel
      .find({
        type: { $in: ['deposit', 'withdrawal'] },
        status: 'pending',
        externalPaymentId: { $exists: true, $ne: '' },
        externalPaymentProvider: { $exists: true, $ne: '' },
      })
      .sort({ timestamp: 1 })
      .limit(limit)
      .exec();

    for (const tx of transactions) {
      summary.checked += 1;
      let response: Record<string, unknown>;
      try {
        response = await this.pesajetService.getPayment(tx.externalPaymentId as string);
      } catch {
        continue;
      }

      const providerStatus = this.paymentResponseValue(response, ['status', 'state']);
      if (providerStatus) {
        tx.externalPaymentStatus = providerStatus;
      }
      tx.externalProviderReference =
        this.paymentResponseValue(response, ['providerReference']) ?? tx.externalProviderReference;
      tx.externalPaymentFee =
        this.paymentResponseNumber(response, ['fee']) ?? tx.externalPaymentFee;
      tx.externalFailureReason =
        this.paymentResponseValue(response, ['failureReason']) ?? tx.externalFailureReason;

      const normalizedStatus = providerStatus?.toLowerCase();
      if (this.isProviderSuccess(normalizedStatus)) {
        const user = await this.userModel.findById(tx.userId).exec();
        if (!user || user.deletedAt) continue;

        if (tx.type === 'deposit') {
          user.balance += tx.amount;
          await this.creditReferralBonus(user, tx.amount);
          await user.save();
          tx.description = `Deposit approved via ${tx.method ?? 'mobile money'}`;
        } else {
          tx.description = `Withdrawal approved to ${tx.destination ?? 'registered number'} (${tx.method ?? 'mobile money'})`;
        }

        tx.status = 'approved';
        tx.reviewedAt = new Date();
        tx.reviewNote = 'Automatically confirmed by PesaJet status polling';
        await tx.save();
        await this.createNotification(
          tx.userId,
          tx.type === 'deposit' ? 'Deposit approved' : 'Withdrawal approved',
          `Your $${tx.amount.toFixed(2)} ${tx.type} was confirmed automatically.`,
          'success',
        );
        summary.approved += 1;
      } else if (this.isProviderFailure(normalizedStatus)) {
        const user = await this.userModel.findById(tx.userId).exec();
        if (tx.type === 'withdrawal' && user && !user.deletedAt) {
          user.balance += tx.amount;
          await user.save();
        }

        tx.status = 'rejected';
        tx.reviewedAt = new Date();
        tx.reviewNote = tx.externalFailureReason
          ? `Automatically rejected by PesaJet: ${tx.externalFailureReason}`
          : `Automatically rejected by PesaJet status: ${providerStatus ?? 'unknown'}`;
        tx.description = `${tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} rejected`;
        await tx.save();
        await this.createNotification(
          tx.userId,
          tx.type === 'deposit' ? 'Deposit rejected' : 'Withdrawal rejected',
          tx.externalFailureReason
            ? `Your $${tx.amount.toFixed(2)} ${tx.type} could not be confirmed: ${tx.externalFailureReason}`
            : `Your $${tx.amount.toFixed(2)} ${tx.type} could not be confirmed by mobile money.`,
          'warning',
        );
        summary.rejected += 1;
      } else {
        await tx.save();
      }
    }

    return summary;
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
    const {
      minDeposit,
      maxDeposit,
      minWithdrawal,
      maxWithdrawal,
      depositsEnabled,
      withdrawalsEnabled,
      referralBonusPercent,
    } = settings;
    return {
      minDeposit,
      maxDeposit,
      minWithdrawal,
      maxWithdrawal,
      depositsEnabled,
      withdrawalsEnabled,
      paymentMethods: this.publicPaymentMethods(settings.paymentMethods),
      referralBonusPercent,
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
          referralBonusPercent: this.defaultReferralBonusPercent(),
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

    await this.settingsModel
      .updateOne(
        { key: 'default', referralBonusPercent: { $exists: false } },
        { $set: { referralBonusPercent: this.defaultReferralBonusPercent() } },
      )
      .exec();

    for (const paymentMethod of DEFAULT_PAYMENT_METHODS) {
      await this.settingsModel
        .updateOne(
          { key: 'default', paymentMethods: { $not: { $elemMatch: { id: paymentMethod.id } } } },
          { $push: { paymentMethods: paymentMethod } },
        )
        .exec();
    }
  }

  private defaultReferralBonusPercent() {
    return Number(this.configService.get<string>('REFERRAL_BONUS_PERCENT') ?? 10);
  }

  private calculateReferralBonusAmount(depositAmount: number, referralBonusPercent: number) {
    const amount = Number(depositAmount);
    const percent = Number(referralBonusPercent);
    if (!Number.isFinite(amount) || !Number.isFinite(percent) || amount <= 0 || percent <= 0) {
      return 0;
    }
    return Math.round(amount * percent) / 100;
  }

  private publicPaymentMethods(methods: PaymentMethod[] = DEFAULT_PAYMENT_METHODS) {
    return methods
      .filter((method) => method.enabled)
      .sort((first, second) => this.paymentMethodPriority(first) - this.paymentMethodPriority(second))
      .map(({
        id,
        label,
        method,
        network,
        address,
        channel,
        provider,
        currency,
        requiresPhoneNumber,
        depositEnabled,
        withdrawalEnabled,
      }) => ({
        id,
        label,
        method,
        network,
        address,
        channel,
        provider,
        currency,
        requiresPhoneNumber,
        depositEnabled,
        withdrawalEnabled,
      }));
  }

  private paymentMethodPriority(method: PaymentMethod) {
    if (method.channel === 'mobile_money') return 0;
    return 10;
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

  private isMobileMoney(method: PaymentMethod) {
    return method.channel === 'mobile_money';
  }

  private assertMobileMoneyAvailableForUser(user: UserDocument, method: PaymentMethod) {
    if (!/^\+256\d{9}$/.test(user.phoneNumber ?? '')) {
      throw new BadRequestException('Mobile money is currently available only for +256 Uganda numbers');
    }
    const provider = this.mobileMoneyProviderForPhone(user.phoneNumber);
    if (!provider || provider !== method.provider) {
      throw new BadRequestException(`Your registered number is not eligible for ${method.label}`);
    }
  }

  private mobileMoneyProviderForPhone(phoneNumber?: string) {
    const prefix = phoneNumber?.slice(4, 6);
    if (prefix && ['76', '77', '78', '39'].includes(prefix)) return 'mtn';
    if (prefix && ['70', '75', '74', '20'].includes(prefix)) return 'airtel';
    return undefined;
  }

  private mobileMoneyProvider(method: PaymentMethod) {
    if (!method.provider) {
      throw new BadRequestException('Mobile money provider is not configured');
    }
    return method.provider;
  }

  private normalizeUgandanPhoneNumber(phoneNumber?: string) {
    const cleaned = phoneNumber?.trim().replace(/\s+/g, '') ?? '';
    const normalized = cleaned.startsWith('0')
      ? `+256${cleaned.slice(1)}`
      : cleaned.startsWith('256')
        ? `+${cleaned}`
        : cleaned;

    if (!/^\+256\d{9}$/.test(normalized)) {
      throw new BadRequestException('Enter a valid Ugandan phone number, for example +256777652457');
    }

    return normalized;
  }

  private createPaymentReference(prefix: 'DEP' | 'WDR', userId: string) {
    return `FF-${prefix}-${Date.now()}-${userId.slice(-6)}`.toUpperCase();
  }

  private toUgxAmount(amountUsd: number) {
    const rate = Number(this.configService.get<string>('UGX_PER_USD') ?? 3720);
    const ugx = Math.round(amountUsd * (Number.isFinite(rate) && rate > 0 ? rate : 3720));
    return Math.max(1, ugx);
  }

  private paymentResponseValue(response: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = response[key] ?? (response.data as Record<string, unknown> | undefined)?.[key];
      if (value !== undefined && value !== null) return String(value);
    }
    return undefined;
  }

  private paymentResponseNumber(response: Record<string, unknown>, keys: string[]) {
    const value = this.paymentResponseValue(response, keys);
    if (value === undefined) return undefined;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }

  private isProviderSuccess(status?: string) {
    return Boolean(
      status &&
        ['success', 'successful', 'completed', 'complete', 'approved', 'paid', 'processed'].includes(status),
    );
  }

  private isProviderFailure(status?: string) {
    return Boolean(
      status &&
        ['failed', 'failure', 'rejected', 'cancelled', 'canceled', 'expired', 'declined'].includes(status),
    );
  }

  private async creditReferralBonus(user: UserDocument, qualifyingDepositAmount: number) {
    if (!user.referredBy || user.referralRewardPaid) return;

    const previousApprovedDeposits = await this.transactionModel
      .countDocuments({ userId: user._id, type: 'deposit', status: 'approved' })
      .exec();
    if (previousApprovedDeposits > 0) return;

    const settings = await this.getPlatformSettings();
    const bonusAmount = this.calculateReferralBonusAmount(
      qualifyingDepositAmount,
      settings.referralBonusPercent,
    );
    if (bonusAmount <= 0) return;

    const referrer = await this.userModel.findById(user.referredBy).exec();
    if (!referrer || referrer.deletedAt) return;

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

    await this.createNotification(
      referrer._id,
      'Referral bonus credited',
      `$${bonusAmount.toFixed(2)} was credited after ${user.name}'s first deposit was approved.`,
      'success',
    );
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
