"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const projects_service_1 = require("./projects.service");
const project_analytics_service_1 = require("./project-analytics.service");
const projects_controller_1 = require("./projects.controller");
const project_schema_1 = require("./schemas/project.schema");
const market_price_schema_1 = require("./schemas/market-price.schema");
const market_news_item_schema_1 = require("./schemas/market-news-item.schema");
const notifications_module_1 = require("../notifications/notifications.module");
const user_schema_1 = require("../users/schemas/user.schema");
const finance_schema_1 = require("../finance/schemas/finance.schema");
let ProjectsModule = class ProjectsModule {
};
exports.ProjectsModule = ProjectsModule;
exports.ProjectsModule = ProjectsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: project_schema_1.Project.name, schema: project_schema_1.ProjectSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: market_price_schema_1.MarketPrice.name, schema: market_price_schema_1.MarketPriceSchema },
                { name: market_news_item_schema_1.MarketNewsItem.name, schema: market_news_item_schema_1.MarketNewsItemSchema },
                { name: finance_schema_1.Spending.name, schema: finance_schema_1.SpendingSchema },
                { name: finance_schema_1.Ledger.name, schema: finance_schema_1.LedgerSchema },
            ]),
            notifications_module_1.NotificationsModule,
        ],
        providers: [projects_service_1.ProjectsService, project_analytics_service_1.ProjectAnalyticsService],
        controllers: [projects_controller_1.ProjectsController],
        exports: [projects_service_1.ProjectsService],
    })
], ProjectsModule);
//# sourceMappingURL=projects.module.js.map