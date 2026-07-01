import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CalculateReturnDto } from './dto/calculate-return.dto';
import type { ReturnWindow } from './schemas/return-snapshot.schema';
import { ReturnsService } from './returns.service';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.returnsService.getDashboard();
  }

  @Get('snapshots')
  getSnapshots() {
    return this.returnsService.getSnapshots();
  }

  @Get('trends')
  getTrends(@Query('window') window?: ReturnWindow) {
    return this.returnsService.getTrends(window);
  }

  @Get('allocations')
  getAllocations() {
    return this.returnsService.getAllocations();
  }

  @Get('plans')
  getPlans() {
    return this.returnsService.getPlans();
  }

  @Post('calculate')
  calculateReturn(@Body() dto: CalculateReturnDto) {
    return this.returnsService.calculateReturn(dto);
  }
}
