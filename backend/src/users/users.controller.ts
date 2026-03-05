import {
  Controller,
  Get,
  UseGuards,
  Request,
  Put,
  Body,
  Post,
  Delete,
  Inject,
  forwardRef,
  SetMetadata,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  private sanitizeUser(user: any) {
    if (!user) return user;
    const source = user.toObject ? user.toObject() : user;
    const safe = { ...source };
    delete safe.passwordHash;
    return safe;
  }

  private normalizeSettingsForClient(settings: any) {
    const source = settings || {};
    const notifications = source.notifications || {};
    const isDark = source.theme ? source.theme === 'dark' : !!source.darkMode;

    return {
      theme: isDark ? 'dark' : 'light',
      darkMode: isDark,
      biometricEnabled: source.biometricEnabled ?? source.biometric ?? false,
      language: source.language || 'en',
      currency: source.currency || 'INR',
      notifications: {
        pushEnabled: notifications.pushEnabled ?? notifications.push ?? true,
        emailEnabled: notifications.emailEnabled ?? notifications.email ?? true,
        approvalReminders:
          notifications.approvalReminders ?? notifications.approvals ?? true,
        reportAlerts:
          notifications.reportAlerts ?? notifications.spendingAlerts ?? true,
      },
    };
  }

  private mapSettingsFromClient(payload: any) {
    const source =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    const mapped: Record<string, unknown> = {};

    const hasTheme =
      Object.prototype.hasOwnProperty.call(source, 'theme') ||
      Object.prototype.hasOwnProperty.call(source, 'darkMode');
    if (hasTheme) {
      const requestedTheme =
        source.theme === 'dark' || source.darkMode === true ? 'dark' : 'light';
      mapped.theme = requestedTheme;
      mapped.darkMode = requestedTheme === 'dark';
    }

    if (Object.prototype.hasOwnProperty.call(source, 'biometricEnabled')) {
      mapped.biometricEnabled = Boolean(source.biometricEnabled);
    } else if (Object.prototype.hasOwnProperty.call(source, 'biometric')) {
      mapped.biometricEnabled = Boolean(source.biometric);
    }

    if (typeof source.language === 'string' && source.language.trim()) {
      mapped.language = source.language.trim();
    }

    if (typeof source.currency === 'string' && source.currency.trim()) {
      mapped.currency = source.currency.trim().toUpperCase();
    }

    const hasNotifications =
      Object.prototype.hasOwnProperty.call(source, 'notifications') &&
      source.notifications &&
      typeof source.notifications === 'object';

    if (hasNotifications) {
      const notifications = source.notifications as Record<string, unknown>;
      const mappedNotifications: Record<string, boolean> = {};

      if (Object.prototype.hasOwnProperty.call(notifications, 'pushEnabled')) {
        mappedNotifications.pushEnabled = Boolean(notifications.pushEnabled);
      } else if (Object.prototype.hasOwnProperty.call(notifications, 'push')) {
        mappedNotifications.pushEnabled = Boolean(notifications.push);
      }

      if (Object.prototype.hasOwnProperty.call(notifications, 'emailEnabled')) {
        mappedNotifications.emailEnabled = Boolean(notifications.emailEnabled);
      } else if (Object.prototype.hasOwnProperty.call(notifications, 'email')) {
        mappedNotifications.emailEnabled = Boolean(notifications.email);
      }

      if (
        Object.prototype.hasOwnProperty.call(notifications, 'approvalReminders')
      ) {
        mappedNotifications.approvalReminders = Boolean(
          notifications.approvalReminders,
        );
      } else if (
        Object.prototype.hasOwnProperty.call(notifications, 'approvals')
      ) {
        mappedNotifications.approvalReminders = Boolean(notifications.approvals);
      }

      if (Object.prototype.hasOwnProperty.call(notifications, 'reportAlerts')) {
        mappedNotifications.reportAlerts = Boolean(notifications.reportAlerts);
      } else if (
        Object.prototype.hasOwnProperty.call(notifications, 'spendingAlerts')
      ) {
        mappedNotifications.reportAlerts = Boolean(notifications.spendingAlerts);
      }

      if (Object.keys(mappedNotifications).length > 0) {
        mapped.notifications = mappedNotifications;
      }
    }

    return mapped;
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'project_admin', 'super_admin')
  findAll() {
    return this.usersService
      .findAll()
      .then((users) => users.map((u) => this.sanitizeUser(u)));
  }

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return this.sanitizeUser(user);
  }

  @Get('settings')
  async getSettings(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    const fallback = {
      theme: 'light',
      darkMode: false,
      biometricEnabled: false,
      language: 'en',
      currency: 'INR',
      notifications: {
        pushEnabled: true,
        emailEnabled: true,
        approvalReminders: true,
        reportAlerts: true,
      },
    };
    return this.normalizeSettingsForClient(user?.settings || fallback);
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() updateDto: any) {
    // Whitelist allowed fields to prevent role/password escalation
    const { name, phone, address, bankDetails } = updateDto;
    const safeUpdate: Record<string, any> = {};
    if (name !== undefined) safeUpdate.name = name;
    if (phone !== undefined) safeUpdate.phone = phone;
    if (address !== undefined) safeUpdate.address = address;
    if (bankDetails !== undefined) safeUpdate.bankDetails = bankDetails;
    const user = await this.usersService.update(req.user.userId, safeUpdate);
    return this.sanitizeUser(user);
  }

  @Put('settings')
  async updateSettings(@Request() req, @Body() settingsDto: any) {
    const mappedSettings = this.mapSettingsFromClient(settingsDto);
    const user =
      Object.keys(mappedSettings).length > 0
        ? await this.usersService.updateSettings(req.user.userId, mappedSettings)
        : await this.usersService.findById(req.user.userId);
    return { settings: this.normalizeSettingsForClient(user?.settings || {}) };
  }

  @Put('settings/notifications')
  async updateNotificationPreferences(@Request() req, @Body() prefsDto: any) {
    const mappedPrefs = {
      pushEnabled: prefsDto?.pushEnabled ?? prefsDto?.push ?? true,
      emailEnabled: prefsDto?.emailEnabled ?? prefsDto?.email ?? true,
      approvalReminders:
        prefsDto?.approvalReminders ?? prefsDto?.approvals ?? true,
      reportAlerts: prefsDto?.reportAlerts ?? prefsDto?.spendingAlerts ?? true,
    };
    const user = await this.usersService.updateNotificationPrefs(
      req.user.userId,
      mappedPrefs,
    );
    return {
      settings: this.normalizeSettingsForClient(user?.settings || {}),
      notifications: this.normalizeSettingsForClient(user?.settings || {})
        .notifications,
    };
  }

  @Post('change-password')
  changePassword(@Request() req, @Body() body: any) {
    const { currentPassword, newPassword } = body;
    return this.authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword,
    );
  }

  /**
   * DELETE /users/account
   * Required by Apple App Store (§ 5.1.1) and Google Play User Data policy.
   * Soft-deletes the account: anonymizes PII, preserves financial audit trail.
   */
  @Delete('account')
  async deleteAccount(@Request() req, @Body() body: any) {
    const { password } = body;
    return this.usersService.deleteAccount(req.user.userId, password);
  }

  /**
   * GET /users/export-data
   * GDPR-compliant data export — returns all user data in JSON format.
   */
  @Get('export-data')
  async exportData(@Request() req) {
    return this.usersService.exportUserData(req.user.userId);
  }

  /**
   * POST /users/push-token
    * Register device push notification token for server-driven notifications.
   */
  @Post('push-token')
  async registerPushToken(@Request() req, @Body() body: RegisterPushTokenDto) {
    const { pushToken } = body;
    return this.usersService.registerPushToken(req.user.userId, pushToken);
  }

  /**
   * GET /users/app-config
   * Returns centralized app configuration (password policy, business rules, etc.)
   * Frontend should use this instead of hardcoded values.
   */
  @Get('app-config')
  getAppConfig() {
    return this.usersService.getAppConfig();
  }
}
