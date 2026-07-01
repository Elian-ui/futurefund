import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/rbac/roles.decorator';
import { RolesGuard } from '../auth/rbac/roles.guard';
import { AdminService } from './admin.service';
import { PackageCycle } from './schemas/investment-package.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('support', 'admin', 'superadmin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('me')
  getAdminMe(@Req() req: any) {
    return req.user;
  }

  @Get('overview')
  @Roles('admin', 'superadmin')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('packages')
  @Roles('admin', 'superadmin')
  listPackages() {
    return this.adminService.listPackages();
  }

  @Post('packages')
  @Roles('admin', 'superadmin')
  createPackage(
    @Req() req: any,
    @Body()
    body: {
      id?: string;
      name: string;
      cycle: PackageCycle;
      rate: number;
      duration: number;
      minInvestment: number;
      maxInvestment: number;
      description: string;
      isActive?: boolean;
    },
  ) {
    return this.adminService.createPackage(body, req.user);
  }

  @Patch('packages/:id')
  @Roles('admin', 'superadmin')
  updatePackage(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.adminService.updatePackage(id, body, req.user);
  }

  @Delete('packages/:id')
  @Roles('admin', 'superadmin')
  deletePackage(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deletePackage(id, req.user);
  }

  @Get('settings')
  @Roles('admin', 'superadmin')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @Roles('admin', 'superadmin')
  updateSettings(@Req() req: any, @Body() body: any) {
    return this.adminService.updateSettings(body, req.user);
  }

  @Get('users')
  @Roles('admin', 'superadmin')
  listUsers(@Query('includeDeleted') includeDeleted?: string) {
    return this.adminService.listUsers(includeDeleted !== 'false');
  }

  @Get('users/:id')
  @Roles('admin', 'superadmin')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Post('users')
  @Roles('admin', 'superadmin')
  createUser(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      email: string;
      phoneNumber?: string;
      password: string;
      roles?: string[];
      balance?: number;
      totalInvested?: number;
      totalEarned?: number;
      emailVerified?: boolean;
    },
  ) {
    return this.adminService.createUser(body, req.user);
  }

  @Patch('users/:id')
  @Roles('admin', 'superadmin')
  updateUser(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.adminService.updateUser(id, body, req.user);
  }

  @Delete('users/:id')
  @Roles('admin', 'superadmin')
  softDeleteUser(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.adminService.softDeleteUser(id, req.user, body?.reason);
  }

  @Post('users/:id/restore')
  @Roles('admin', 'superadmin')
  restoreUser(@Req() req: any, @Param('id') id: string) {
    return this.adminService.restoreUser(id, req.user);
  }

  @Roles('superadmin')
  @Patch('users/:id/roles')
  updateUserRoles(@Req() req: any, @Param('id') id: string, @Body() body: { roles: string[] }) {
    return this.adminService.updateUserRoles(id, body.roles, req.user);
  }

  @Get('transactions')
  @Roles('admin', 'superadmin')
  listTransactions() {
    return this.adminService.listTransactions();
  }

  @Get('audit-logs')
  @Roles('admin', 'superadmin')
  listAuditLogs() {
    return this.adminService.listAuditLogs();
  }

  @Post('transactions/:id/approve')
  @Roles('admin', 'superadmin')
  approveTransaction(@Req() req: any, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.adminService.approveTransaction(id, req.user, body.note);
  }

  @Post('transactions/:id/reject')
  @Roles('admin', 'superadmin')
  rejectTransaction(@Req() req: any, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.adminService.rejectTransaction(id, req.user, body.note);
  }

  @Get('investments')
  @Roles('admin', 'superadmin')
  listInvestments() {
    return this.adminService.listInvestments();
  }

  @Get('jobs/payouts/status')
  @Roles('admin', 'superadmin')
  getPayoutJobStatus() {
    return this.adminService.getPayoutJobStatus();
  }

  @Post('jobs/payouts/run')
  @Roles('admin', 'superadmin')
  runPayoutCatchup(@Req() req: any) {
    return this.adminService.runPayoutCatchup(req.user);
  }

  @Get('withdrawals')
  @Roles('admin', 'superadmin')
  listWithdrawals() {
    return this.adminService.listWithdrawals();
  }

  @Get('deposits')
  @Roles('admin', 'superadmin')
  listDeposits() {
    return this.adminService.listDeposits();
  }
}
