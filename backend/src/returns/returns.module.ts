import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Allocation, AllocationSchema } from './schemas/allocation.schema';
import {
  InvestmentPlan,
  InvestmentPlanSchema,
} from './schemas/investment-plan.schema';
import {
  ReturnSnapshot,
  ReturnSnapshotSchema,
} from './schemas/return-snapshot.schema';
import { ReturnTrend, ReturnTrendSchema } from './schemas/return-trend.schema';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReturnSnapshot.name, schema: ReturnSnapshotSchema },
      { name: ReturnTrend.name, schema: ReturnTrendSchema },
      { name: Allocation.name, schema: AllocationSchema },
      { name: InvestmentPlan.name, schema: InvestmentPlanSchema },
    ]),
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
