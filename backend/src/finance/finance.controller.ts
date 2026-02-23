import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSpendingDto } from './dto/create-spending.dto';

type AuthRequest = {
  user: {
    userId: string;
    role?: string;
  };
};

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ========== SPENDING ENDPOINTS ==========

  @Post('spendings')
  addSpending(
    @Request() req: AuthRequest,
    @Body() createSpendingDto: CreateSpendingDto,
  ) {
    return this.financeService.addSpending(createSpendingDto, req.user);
  }

  @Post('spendings/:id/vote')
  voteSpending(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body('vote') vote: 'approved' | 'rejected',
  ) {
    return this.financeService.voteSpending(
      id,
      req.user.userId,
      vote,
      req.user,
    );
  }

  @Get('spendings/search')
  searchSpendings(
    @Request() req: AuthRequest,
    @Query('projectId') projectId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.searchSpendings(projectId, req.user, {
      search,
      status,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get('spendings')
  findAll(
    @Request() req: AuthRequest,
    @Query('projectId') projectId: string,
    @Query('ownerUserId') ownerUserId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.financeService.findAll(projectId, req.user, {
      ownerUserId,
      status,
      fromDate,
      toDate,
    });
  }

  // ========== LEDGER ENDPOINTS ==========

  @Post('ledgers')
  createLedger(@Request() req: AuthRequest, @Body() createLedgerDto: any) {
    return this.financeService.createLedger(createLedgerDto, req.user);
  }

  @Get('ledgers')
  findAllLedgers(
    @Request() req: AuthRequest,
    @Query('projectId') projectId: string,
  ) {
    return this.financeService.findAllLedgers(projectId, req.user);
  }

  @Get('ledgers/:id')
  findOneLedger(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.financeService.findOneLedger(id, req.user);
  }

  @Put('ledgers/:id')
  updateLedger(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    return this.financeService.updateLedger(id, updateDto, req.user);
  }

  @Delete('ledgers/:id')
  deleteLedger(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.financeService.deleteLedger(id, req.user);
  }

  // ========== CONSOLIDATED ENDPOINTS (eliminates N+1 frontend pattern) ==========

  /**
   * GET /finance/my-expenses — all user expenses across projects in one call.
   */
  @Get('my-expenses')
  getMyExpenses(
    @Request() req: AuthRequest,
    @Query()
    query?: {
      fromDate?: string;
      toDate?: string;
      category?: string;
      projectId?: string;
      ledgerId?: string;
      subLedger?: string;
      page?: string;
      limit?: string;
    },
  ) {
    return this.financeService.getMyExpenses(req.user, {
      fromDate: query?.fromDate,
      toDate: query?.toDate,
      category: query?.category,
      projectId: query?.projectId,
      ledgerId: query?.ledgerId,
      subLedger: query?.subLedger,
      page: query?.page ? Number.parseInt(query.page, 10) : undefined,
      limit: query?.limit ? Number.parseInt(query.limit, 10) : undefined,
    });
  }

  /**
   * GET /finance/expense-analytics — server-computed analytics (totals, breakdowns, trends).
   */
  @Get('expense-analytics')
  getExpenseAnalytics(
    @Request() req: AuthRequest,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.financeService.getExpenseAnalytics(req.user, {
      fromDate,
      toDate,
    });
  }

  /**
   * GET /finance/my-pending-approvals — pending spending approvals requiring my vote.
   */
  @Get('my-pending-approvals')
  getMyPendingApprovals(@Request() req: AuthRequest) {
    return this.financeService.getMyPendingApprovals(req.user);
  }

  /**
   * GET /finance/spending-summary — pre-computed totals for a project.
   */
  @Get('spending-summary')
  getSpendingSummary(
    @Request() req: AuthRequest,
    @Query('projectId') projectId: string,
  ) {
    return this.financeService.getSpendingSummary(projectId, req.user);
  }

  /**
   * GET /finance/spending-summary/bulk?projectIds=id1,id2
   */
  @Get('spending-summary/bulk')
  getBulkSpendingSummary(
    @Request() req: AuthRequest,
    @Query('projectIds') projectIdsParam?: string,
  ) {
    const projectIds = String(projectIdsParam || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.financeService.getBulkSpendingSummary(projectIds, req.user);
  }

  /**
   * GET /finance/export — server-generated reports (CSV, HTML, JSON).
   */
  @Get('export')
  exportExpenses(
    @Request() req: AuthRequest,
    @Query()
    query?: {
      format?: string;
      fromDate?: string;
      toDate?: string;
      projectId?: string;
      ledgerId?: string;
      subLedger?: string;
    },
  ) {
    return this.financeService.exportExpenses(req.user, query?.format, {
      fromDate: query?.fromDate,
      toDate: query?.toDate,
      projectId: query?.projectId,
      ledgerId: query?.ledgerId,
      subLedger: query?.subLedger,
    });
  }
}
