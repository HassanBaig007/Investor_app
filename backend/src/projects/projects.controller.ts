import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Delete,
  Put,
  SetMetadata,
  Query,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectAnalyticsService } from './project-analytics.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateMarketPriceDto } from './dto/update-market-price.dto';
import { UpdateMarketNewsItemDto } from './dto/update-market-news-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

// Helper decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly analyticsService: ProjectAnalyticsService,
  ) {}

  @Get('analytics')
  getAnalytics(@Request() req) {
    return this.analyticsService.getPortfolioAnalytics(req.user.userId);
  }

  @Post()
  create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto, req.user);
  }

  @Get()
  findAll(@Request() req) {
    return this.projectsService.findAll(req.user);
  }

  @Get('metadata/types')
  getProjectTypes() {
    return [
      { id: 'real_estate', label: 'Real Estate', icon: 'business' },
      { id: 'venture_capital', label: 'Venture Capital', icon: 'rocket' },
      { id: 'fixed_income', label: 'Fixed Income', icon: 'trending-up' },
      { id: 'private_equity', label: 'Private Equity', icon: 'briefcase' },
    ];
  }

  @Get('metadata/risks')
  getRiskLevels() {
    return [
      { id: 'low', label: 'Low Risk', color: '#10B981' },
      { id: 'medium', label: 'Medium Risk', color: '#F59E0B' },
      { id: 'high', label: 'High Risk', color: '#EF4444' },
    ];
  }

  @Get('metadata/market-prices')
  getMarketPrices() {
    return this.projectsService.getMarketPrices();
  }

  @Get('metadata/news')
  getNews() {
    return this.projectsService.getNews();
  }

  @Put('metadata/market-prices/:id')
  @Roles('super_admin')
  updateMarketPrice(
    @Param('id') id: string,
    @Body() updateDto: UpdateMarketPriceDto,
  ) {
    return this.projectsService.updateMarketPrice(id, updateDto);
  }

  @Put('metadata/news/:id')
  @Roles('super_admin')
  updateNewsItem(
    @Param('id') id: string,
    @Body() updateDto: UpdateMarketNewsItemDto,
  ) {
    return this.projectsService.updateNewsItem(id, updateDto);
  }

  @Get(':id/export')
  exportProjectDetails(
    @Param('id') id: string,
    @Request() req,
    @Query('format') format?: string,
  ) {
    return this.projectsService.exportProjectDetails(id, req.user, format);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.projectsService.findOne(id, req.user);
  }

  @Post(':id/investors')
  addMember(
    @Request() req,
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.projectsService.addMember(id, userId, role, req.user);
  }

  @Delete(':id/investors/:userId')
  removeMember(
    @Request() req,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.projectsService.removeMember(id, userId, req.user);
  }

  @Put(':id/investors/:userId')
  updateMemberRole(
    @Request() req,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.projectsService.updateMemberRole(id, userId, role, req.user);
  }

  @Get(':id/invite-candidates')
  getInviteCandidates(@Request() req, @Param('id') id: string) {
    return this.projectsService.getInviteCandidates(id, req.user);
  }

  @Post(':id/invites')
  inviteMember(
    @Request() req,
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.projectsService.inviteMember(id, userId, role, req.user);
  }

  @Post(':id/invites/accept')
  acceptInvitation(@Request() req, @Param('id') id: string) {
    return this.projectsService.acceptInvitation(id, req.user);
  }

  @Post(':id/invites/decline')
  declineInvitation(@Request() req, @Param('id') id: string) {
    return this.projectsService.declineInvitation(id, req.user);
  }

  @Put(':id') // Frontend uses PUT for update now
  update(@Request() req, @Param('id') id: string, @Body() updateDto: any) {
    return this.projectsService.update(id, updateDto, req.user);
  }
}
