import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(@Request() req) {
    return this.notificationService.findAll(req.user.userId);
  }

  @Post('read-all')
  markAllAsRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.notificationService.remove(id, req.user.userId);
  }
}
