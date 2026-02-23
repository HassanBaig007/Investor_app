import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { getAllPermissionsForRole } from './guards/permissions.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Stricter rate limit on login: 5 attempts per 60 seconds
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req: { user: { userId: string; email: string; role: string } },
  ) {
    return this.authService.login(req.user);
  }

  // Stricter rate limit on registration: 3 attempts per 60 seconds
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login/google')
  async googleLogin(@Body() dto: SocialLoginDto) {
    return this.authService.loginWithGoogle(dto.idToken);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login/apple')
  async appleLogin(@Body() dto: SocialLoginDto) {
    return this.authService.loginWithApple(dto.idToken, {
      email: dto.email,
      name: dto.name,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(
    @Request() req: { user: { userId: string } },
  ): Promise<Record<string, unknown>> {
    return this.authService.getProfile(req.user.userId) as Promise<
      Record<string, unknown>
    >;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Request() req: { user: { userId: string } }) {
    return this.authService.logout(req.user.userId);
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken?: string }) {
    const refreshToken = body?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }
    return this.authService.refreshTokens(refreshToken);
  }

  /**
   * GET /auth/my-permissions
   * Returns the server-computed permission set for the authenticated user.
   * Frontend should use this instead of computing permissions locally.
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-permissions')
  getMyPermissions(@Request() req: { user: { userId: string; role: string } }) {
    const permissions = getAllPermissionsForRole(req.user.role);
    return {
      role: req.user.role,
      permissions,
    };
  }
}
