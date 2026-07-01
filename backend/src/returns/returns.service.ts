import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CalculateReturnDto } from './dto/calculate-return.dto';
import { Allocation } from './schemas/allocation.schema';
import { InvestmentPlan } from './schemas/investment-plan.schema';
import {
  ReturnSnapshot,
  ReturnWindow,
} from './schemas/return-snapshot.schema';
import { ReturnTrend } from './schemas/return-trend.schema';

const returnWindows: ReturnWindow[] = ['daily', 'weekly', 'monthly'];

const formatPercent = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

@Injectable()
export class ReturnsService implements OnModuleInit {
  constructor(
    @InjectModel(ReturnSnapshot.name)
    private readonly snapshotModel: Model<ReturnSnapshot>,
    @InjectModel(ReturnTrend.name)
    private readonly trendModel: Model<ReturnTrend>,
    @InjectModel(Allocation.name)
    private readonly allocationModel: Model<Allocation>,
    @InjectModel(InvestmentPlan.name)
    private readonly planModel: Model<InvestmentPlan>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  async getDashboard() {
    const [snapshots, trends, allocations, plans] = await Promise.all([
      this.getSnapshots(),
      this.getTrends(),
      this.getAllocations(),
      this.getPlans(),
    ]);

    const accountValue = allocations.reduce((total, item) => total + item.value, 0);
    const monthlySnapshot = snapshots.find((item) => item.window === 'monthly');
    const monthlyGain = accountValue * ((monthlySnapshot?.percentage ?? 0) / 100);

    return {
      account: {
        value: accountValue,
        displayValue: this.formatCurrency(accountValue),
        monthlyGain,
        displayMonthlyGain: this.formatCurrency(monthlyGain),
      },
      snapshots,
      trends,
      allocations,
      plans,
      disclaimer:
        'Return percentages are sample platform data until connected to verified live investment performance.',
    };
  }

  async getSnapshots() {
    const snapshots = await this.snapshotModel
      .find()
      .sort({ window: 1 })
      .lean()
      .exec();

    return returnWindows
      .map((window) => snapshots.find((item) => item.window === window))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  async getTrends(window?: ReturnWindow) {
    if (window && !returnWindows.includes(window)) {
      throw new BadRequestException('window must be daily, weekly, or monthly');
    }

    return this.trendModel
      .find(window ? { window } : {})
      .sort({ window: 1, sortOrder: 1 })
      .lean()
      .exec();
  }

  async getAllocations() {
    return this.allocationModel.find().sort({ value: -1 }).lean().exec();
  }

  async getPlans() {
    const plans = await this.planModel.find().sort({ monthlyReturn: -1 }).lean().exec();

    return plans.map((plan) => ({
      ...plan,
      dailyDisplay: formatPercent(plan.dailyReturn),
      weeklyDisplay: formatPercent(plan.weeklyReturn),
      monthlyDisplay: formatPercent(plan.monthlyReturn),
    }));
  }

  calculateReturn(dto: CalculateReturnDto) {
    const deposit = Number(dto.deposit);
    const targetRoi = Number(dto.targetRoi);
    const periods = dto.periods === undefined ? 1 : Number(dto.periods);
    const compound = dto.compound ?? true;

    if (!Number.isFinite(deposit) || deposit <= 0) {
      throw new BadRequestException('deposit must be a positive number');
    }

    if (!Number.isFinite(targetRoi)) {
      throw new BadRequestException('targetRoi must be a number');
    }

    if (!returnWindows.includes(dto.window)) {
      throw new BadRequestException('window must be daily, weekly, or monthly');
    }

    if (!Number.isInteger(periods) || periods < 1 || periods > 365) {
      throw new BadRequestException('periods must be an integer from 1 to 365');
    }

    const rate = targetRoi / 100;
    const endingValue = compound
      ? deposit * Math.pow(1 + rate, periods)
      : deposit + deposit * rate * periods;
    const profit = endingValue - deposit;

    return {
      input: { deposit, targetRoi, window: dto.window, periods, compound },
      deposit,
      profit: this.roundMoney(profit),
      endingValue: this.roundMoney(endingValue),
      displayProfit: this.formatCurrency(profit),
      displayEndingValue: this.formatCurrency(endingValue),
      explanation: `${formatPercent(targetRoi)} ${dto.window} return across ${periods} period${
        periods === 1 ? '' : 's'
      } using ${compound ? 'compound' : 'simple'} return math.`,
    };
  }

  private async seedDefaults() {
    const snapshotCount = await this.snapshotModel.countDocuments().exec();

    if (snapshotCount === 0) {
      await this.snapshotModel.insertMany([
        {
          window: 'daily',
          label: 'Daily return',
          percentage: 0.84,
          displayPercentage: '+0.84%',
          periodLabel: 'Last 24 hours',
          description:
            'Useful for watching short-term movement without overreacting to noise.',
        },
        {
          window: 'weekly',
          label: 'Weekly return',
          percentage: 3.92,
          displayPercentage: '+3.92%',
          periodLabel: 'Past 7 days',
          description:
            'A clearer view of momentum across active investment positions.',
        },
        {
          window: 'monthly',
          label: 'Monthly return',
          percentage: 11.48,
          displayPercentage: '+11.48%',
          periodLabel: 'Past 30 days',
          description:
            'Best for judging whether your strategy is compounding as planned.',
        },
      ]);
    }

    const trendCount = await this.trendModel.countDocuments().exec();

    if (trendCount === 0) {
      await this.trendModel.insertMany(
        [
          0.12, 0.22, 0.18, 0.31, 0.27, 0.44, 0.51, 0.39, 0.62, 0.74, 0.68,
          0.84,
        ].map((percentage, index) => ({
          window: 'daily',
          label: `D${index + 1}`,
          percentage,
          sortOrder: index + 1,
        })),
      );
    }

    const allocationCount = await this.allocationModel.countDocuments().exec();

    if (allocationCount === 0) {
      await this.allocationModel.insertMany([
        {
          name: 'Growth funds',
          value: 24100,
          displayValue: '$24,100',
          roi: 12.6,
          displayRoi: '+12.6%',
          weight: 76,
          color: '#1f7a4d',
        },
        {
          name: 'Income notes',
          value: 18420,
          displayValue: '$18,420',
          roi: 8.4,
          displayRoi: '+8.4%',
          weight: 58,
          color: '#0f6d7a',
        },
        {
          name: 'Cash reserve',
          value: 11860,
          displayValue: '$11,860',
          roi: 2.1,
          displayRoi: '+2.1%',
          weight: 34,
          color: '#d39a28',
        },
      ]);
    }

    const planCount = await this.planModel.countDocuments().exec();

    if (planCount === 0) {
      await this.planModel.insertMany([
        {
          name: 'Balanced compounding fund',
          description:
            'A diversified plan designed for steady deposits and measured monthly growth.',
          dailyReturn: 0.18,
          weeklyReturn: 1.24,
          monthlyReturn: 5.1,
          risk: 'Balanced',
          liquidity: 'Monthly withdrawals',
        },
        {
          name: 'High-yield income basket',
          description:
            'Income-focused allocations for investors prioritizing regular return visibility.',
          dailyReturn: 0.12,
          weeklyReturn: 0.96,
          monthlyReturn: 4.35,
          risk: 'Moderate',
          liquidity: '14-day withdrawals',
        },
        {
          name: 'Growth accelerator pool',
          description:
            'Higher-volatility allocation for investors pursuing stronger monthly upside.',
          dailyReturn: 0.31,
          weeklyReturn: 2.42,
          monthlyReturn: 8.78,
          risk: 'Growth',
          liquidity: 'Quarterly withdrawals',
        },
      ]);
    }
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }
}
