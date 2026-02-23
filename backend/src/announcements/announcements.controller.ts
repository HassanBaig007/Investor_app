import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  Delete,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../admin/admin.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles('admin', 'project_admin', 'super_admin')
  create(@Request() req, @Body() createDto: any) {
    return this.announcementsService.create(createDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.announcementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.announcementsService.markAsRead(id, req.user.userId);
  }

  @Delete(':id')
  @Roles('admin', 'project_admin', 'super_admin')
  delete(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
