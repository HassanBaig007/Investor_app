import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { InvestmentsService } from './investments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
  };
};

@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Get('portfolio')
  getPortfolio(@Req() req: AuthenticatedRequest) {
    return this.investmentsService.getPortfolio(req.user.userId);
  }

  @Get()
  getInvestments(@Req() req: AuthenticatedRequest) {
    return this.investmentsService.getInvestments(req.user.userId);
  }

  @Get('reports')
  getQuarterlyReports(@Req() req: AuthenticatedRequest) {
    return this.investmentsService.getQuarterlyReports(req.user.userId);
  }

  @Get('reports/:reportId/download')
  downloadQuarterlyReport(
    @Req() req: AuthenticatedRequest,
    @Param('reportId') reportId: string,
    @Query('format') format?: string,
  ) {
    return this.investmentsService.getQuarterlyReportDownload(
      req.user.userId,
      reportId,
      format,
    );
  }

  /**
   * GET /investments/performance-metrics
   * Real computed metrics — replaces frontend hardcoded Sharpe, CAGR, volatility.
   */
  @Get('performance-metrics')
  getPerformanceMetrics(
    @Req() req: AuthenticatedRequest,
    @Query('period') period?: string,
  ) {
    return this.investmentsService.getPerformanceMetrics(
      req.user.userId,
      period,
    );
  }

  @Get(':id')
  getInvestmentById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.investmentsService.getInvestmentById(id, req.user.userId);
  }
}
