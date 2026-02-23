import { Controller, Get, UseGuards, SetMetadata } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

// Helper decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @Roles('admin', 'project_admin', 'super_admin')
  getStats() {
    return this.adminService.getStats();
  }
}
