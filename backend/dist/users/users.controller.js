"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const users_service_1 = require("./users.service");
const auth_service_1 = require("../auth/auth.service");
const Roles = (...roles) => (0, common_1.SetMetadata)('roles', roles);
let UsersController = class UsersController {
    usersService;
    authService;
    constructor(usersService, authService) {
        this.usersService = usersService;
        this.authService = authService;
    }
    sanitizeUser(user) {
        if (!user)
            return user;
        const source = user.toObject ? user.toObject() : user;
        const safe = { ...source };
        delete safe.passwordHash;
        return safe;
    }
    normalizeSettingsForClient(settings) {
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
                approvalReminders: notifications.approvalReminders ?? notifications.approvals ?? true,
                reportAlerts: notifications.reportAlerts ?? notifications.spendingAlerts ?? true,
            },
        };
    }
    mapSettingsFromClient(payload) {
        const source = payload || {};
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
                approvalReminders: notifications.approvalReminders ?? notifications.approvals ?? true,
                reportAlerts: notifications.reportAlerts ?? notifications.spendingAlerts ?? true,
            },
        };
    }
    findAll() {
        return this.usersService
            .findAll()
            .then((users) => users.map((u) => this.sanitizeUser(u)));
    }
    async getProfile(req) {
        const user = await this.usersService.findById(req.user.userId);
        return this.sanitizeUser(user);
    }
    async getSettings(req) {
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
    async updateProfile(req, updateDto) {
        const { name, phone, address, bankDetails } = updateDto;
        const safeUpdate = {};
        if (name !== undefined)
            safeUpdate.name = name;
        if (phone !== undefined)
            safeUpdate.phone = phone;
        if (address !== undefined)
            safeUpdate.address = address;
        if (bankDetails !== undefined)
            safeUpdate.bankDetails = bankDetails;
        const user = await this.usersService.update(req.user.userId, safeUpdate);
        return this.sanitizeUser(user);
    }
    async updateKyc(req, kycData) {
        const user = await this.usersService.updateKyc(req.user.userId, kycData);
        return this.sanitizeUser(user);
    }
    async updateSettings(req, settingsDto) {
        const mappedSettings = this.mapSettingsFromClient(settingsDto);
        const user = await this.usersService.updateSettings(req.user.userId, mappedSettings);
        return { settings: this.normalizeSettingsForClient(user?.settings || {}) };
    }
    async updateNotificationPreferences(req, prefsDto) {
        const mappedPrefs = {
            pushEnabled: prefsDto?.pushEnabled ?? prefsDto?.push ?? true,
            emailEnabled: prefsDto?.emailEnabled ?? prefsDto?.email ?? true,
            approvalReminders: prefsDto?.approvalReminders ?? prefsDto?.approvals ?? true,
            reportAlerts: prefsDto?.reportAlerts ?? prefsDto?.spendingAlerts ?? true,
        };
        const user = await this.usersService.updateNotificationPrefs(req.user.userId, mappedPrefs);
        return {
            settings: this.normalizeSettingsForClient(user?.settings || {}),
            notifications: this.normalizeSettingsForClient(user?.settings || {})
                .notifications,
        };
    }
    changePassword(req, body) {
        const { currentPassword, newPassword } = body;
        return this.authService.changePassword(req.user.userId, currentPassword, newPassword);
    }
    async deleteAccount(req, body) {
        const { password } = body;
        return this.usersService.deleteAccount(req.user.userId, password);
    }
    async exportData(req) {
        return this.usersService.exportUserData(req.user.userId);
    }
    async registerPushToken(req, body) {
        const { pushToken } = body;
        return this.usersService.registerPushToken(req.user.userId, pushToken);
    }
    getAppConfig() {
        return this.usersService.getAppConfig();
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    Roles('admin', 'project_admin', 'super_admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('settings'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('profile'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)('kyc'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateKyc", null);
__decorate([
    (0, common_1.Put)('settings'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Put)('settings/notifications'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateNotificationPreferences", null);
__decorate([
    (0, common_1.Post)('change-password'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Delete)('account'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteAccount", null);
__decorate([
    (0, common_1.Get)('export-data'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "exportData", null);
__decorate([
    (0, common_1.Post)('push-token'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "registerPushToken", null);
__decorate([
    (0, common_1.Get)('app-config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getAppConfig", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => auth_service_1.AuthService))),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        auth_service_1.AuthService])
], UsersController);
//# sourceMappingURL=users.controller.js.map