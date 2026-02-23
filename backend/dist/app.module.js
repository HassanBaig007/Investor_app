"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const privacy_module_1 = require("./privacy/privacy.module");
const projects_module_1 = require("./projects/projects.module");
const finance_module_1 = require("./finance/finance.module");
const notifications_module_1 = require("./notifications/notifications.module");
const admin_module_1 = require("./admin/admin.module");
const modifications_module_1 = require("./modifications/modifications.module");
const uploads_module_1 = require("./uploads/uploads.module");
const announcements_module_1 = require("./announcements/announcements.module");
const investments_module_1 = require("./investments/investments.module");
const legal_module_1 = require("./legal/legal.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                }),
                inject: [config_1.ConfigService],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 60,
                },
            ]),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            privacy_module_1.PrivacyModule,
            projects_module_1.ProjectsModule,
            finance_module_1.FinanceModule,
            notifications_module_1.NotificationsModule,
            admin_module_1.AdminModule,
            modifications_module_1.ModificationsModule,
            uploads_module_1.UploadsModule,
            announcements_module_1.AnnouncementsModule,
            investments_module_1.InvestmentsModule,
            legal_module_1.LegalModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map