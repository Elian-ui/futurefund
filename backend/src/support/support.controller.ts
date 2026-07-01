import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/rbac/roles.decorator';
import { RolesGuard } from '../auth/rbac/roles.guard';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from './schemas/support-ticket.schema';
import { SupportService } from './support.service';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class InvestorSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  listMine(@Req() req: any) {
    return this.supportService.listMyTickets(req.user.userId);
  }

  @Post('tickets')
  create(
    @Req() req: any,
    @Body()
    body: {
      subject: string;
      category: SupportTicketCategory;
      priority?: SupportTicketPriority;
      message: string;
    },
  ) {
    return this.supportService.createTicket(req.user.userId, body);
  }

  @Get('tickets/:id')
  getMine(@Req() req: any, @Param('id') id: string) {
    return this.supportService.getMyTicket(req.user.userId, id);
  }

  @Post('tickets/:id/messages')
  reply(@Req() req: any, @Param('id') id: string, @Body() body: { message: string }) {
    return this.supportService.addInvestorReply(req.user.userId, id, body.message);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('support', 'admin', 'superadmin')
@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('summary')
  summary() {
    return this.supportService.getAdminSummary();
  }

  @Get('tickets')
  list(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.supportService.listAdminTickets({
      status: status as SupportTicketStatus | undefined,
      priority: priority as SupportTicketPriority | undefined,
    });
  }

  @Get('tickets/:id')
  get(@Param('id') id: string) {
    return this.supportService.getAdminTicket(id);
  }

  @Patch('tickets/:id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      status?: SupportTicketStatus;
      priority?: SupportTicketPriority;
      assignedTo?: string | null;
    },
  ) {
    return this.supportService.updateAdminTicket(id, body, req.user);
  }

  @Post('tickets/:id/assign-me')
  assignMe(@Req() req: any, @Param('id') id: string) {
    return this.supportService.assignToMe(req.user, id);
  }

  @Post('tickets/:id/messages')
  reply(@Req() req: any, @Param('id') id: string, @Body() body: { message: string }) {
    return this.supportService.addStaffReply(req.user, id, body.message);
  }
}
