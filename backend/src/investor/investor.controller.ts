import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvestorService } from './investor.service';

@UseGuards(JwtAuthGuard)
@Controller('investor')
export class InvestorController {
  constructor(private readonly investorService: InvestorService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.investorService.getProfile(req.user.userId);
  }

  @Post('deposit')
  deposit(
    @Req() req: any,
    @Body() body: { amount: number; method: string; reference?: string },
  ) {
    return this.investorService.deposit(req.user.userId, body.amount, body.method, body.reference);
  }

  @Post('withdraw')
  withdraw(
    @Req() req: any,
    @Body() body: { amount: number; address: string; method: string },
  ) {
    return this.investorService.withdraw(
      req.user.userId,
      body.amount,
      body.address,
      body.method,
    );
  }

  @Get('investments')
  getInvestments(@Req() req: any) {
    return this.investorService.getInvestments(req.user.userId);
  }

  @Post('investments/buy')
  buyPackage(
    @Req() req: any,
    @Body() body: { packageId: string; amount: number },
  ) {
    return this.investorService.buyPackage(req.user.userId, body.packageId, body.amount);
  }

  @Get('transactions')
  getTransactions(@Req() req: any) {
    return this.investorService.getTransactions(req.user.userId);
  }

  @Get('notifications')
  getNotifications(@Req() req: any) {
    return this.investorService.getNotifications(req.user.userId);
  }

  @Post('notifications/read')
  markNotificationsRead(@Req() req: any) {
    return this.investorService.markNotificationsRead(req.user.userId);
  }
}

@Controller('platform')
export class PlatformController {
  constructor(private readonly investorService: InvestorService) {}

  @Get('packages')
  getPackages() {
    return this.investorService.getPublicPackages();
  }

  @Get('settings')
  getSettings() {
    return this.investorService.getPublicSettings();
  }
}
