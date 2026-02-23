import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ModificationsService } from './modifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('modifications')
@UseGuards(JwtAuthGuard)
export class ModificationsController {
  constructor(private readonly modificationsService: ModificationsService) {}

  @Post()
  create(@Request() req, @Body() createDto: any) {
    return this.modificationsService.create(createDto, req.user);
  }

  @Post(':id/vote')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  vote(
    @Request() req,
    @Param('id') id: string,
    @Body('vote') vote: 'approved' | 'rejected',
    @Body('reason') reason?: string,
  ) {
    return this.modificationsService.vote(
      id,
      req.user.userId,
      vote,
      reason,
      req.user,
    );
  }

  @Post(':id/approve')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  approve(@Request() req, @Param('id') id: string) {
    return this.modificationsService.vote(
      id,
      req.user.userId,
      'approved',
      undefined,
      req.user,
    );
  }

  @Post(':id/reject')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  reject(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.modificationsService.vote(
      id,
      req.user.userId,
      'rejected',
      reason,
      req.user,
    );
  }

  @Get()
  findAll(@Request() req, @Query('projectId') projectId: string) {
    return this.modificationsService.findAll(projectId, req.user);
  }
}
