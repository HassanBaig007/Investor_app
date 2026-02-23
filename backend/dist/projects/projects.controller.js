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
exports.ProjectsController = exports.Roles = void 0;
const common_1 = require("@nestjs/common");
const projects_service_1 = require("./projects.service");
const project_analytics_service_1 = require("./project-analytics.service");
const create_project_dto_1 = require("./dto/create-project.dto");
const update_market_price_dto_1 = require("./dto/update-market-price.dto");
const update_market_news_item_dto_1 = require("./dto/update-market-news-item.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const Roles = (...roles) => (0, common_1.SetMetadata)('roles', roles);
exports.Roles = Roles;
let ProjectsController = class ProjectsController {
    projectsService;
    analyticsService;
    constructor(projectsService, analyticsService) {
        this.projectsService = projectsService;
        this.analyticsService = analyticsService;
    }
    getAnalytics(req) {
        return this.analyticsService.getPortfolioAnalytics(req.user.userId);
    }
    create(req, createProjectDto) {
        return this.projectsService.create(createProjectDto, req.user);
    }
    findAll(req) {
        return this.projectsService.findAll(req.user);
    }
    getProjectTypes() {
        return [
            { id: 'real_estate', label: 'Real Estate', icon: 'business' },
            { id: 'venture_capital', label: 'Venture Capital', icon: 'rocket' },
            { id: 'fixed_income', label: 'Fixed Income', icon: 'trending-up' },
            { id: 'private_equity', label: 'Private Equity', icon: 'briefcase' },
        ];
    }
    getRiskLevels() {
        return [
            { id: 'low', label: 'Low Risk', color: '#10B981' },
            { id: 'medium', label: 'Medium Risk', color: '#F59E0B' },
            { id: 'high', label: 'High Risk', color: '#EF4444' },
        ];
    }
    getMarketPrices() {
        return this.projectsService.getMarketPrices();
    }
    getNews() {
        return this.projectsService.getNews();
    }
    updateMarketPrice(id, updateDto) {
        return this.projectsService.updateMarketPrice(id, updateDto);
    }
    updateNewsItem(id, updateDto) {
        return this.projectsService.updateNewsItem(id, updateDto);
    }
    exportProjectDetails(id, req, format) {
        return this.projectsService.exportProjectDetails(id, req.user, format);
    }
    findOne(id, req) {
        return this.projectsService.findOne(id, req.user);
    }
    addMember(req, id, userId, role) {
        return this.projectsService.addMember(id, userId, role, req.user);
    }
    removeMember(req, id, userId) {
        return this.projectsService.removeMember(id, userId, req.user);
    }
    updateMemberRole(req, id, userId, role) {
        return this.projectsService.updateMemberRole(id, userId, role, req.user);
    }
    getInviteCandidates(req, id) {
        return this.projectsService.getInviteCandidates(id, req.user);
    }
    inviteMember(req, id, userId, role) {
        return this.projectsService.inviteMember(id, userId, role, req.user);
    }
    acceptInvitation(req, id) {
        return this.projectsService.acceptInvitation(id, req.user);
    }
    declineInvitation(req, id) {
        return this.projectsService.declineInvitation(id, req.user);
    }
    update(req, id, updateDto) {
        return this.projectsService.update(id, updateDto, req.user);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Get)('analytics'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_project_dto_1.CreateProjectDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('metadata/types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "getProjectTypes", null);
__decorate([
    (0, common_1.Get)('metadata/risks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "getRiskLevels", null);
__decorate([
    (0, common_1.Get)('metadata/market-prices'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "getMarketPrices", null);
__decorate([
    (0, common_1.Get)('metadata/news'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "getNews", null);
__decorate([
    (0, common_1.Put)('metadata/market-prices/:id'),
    (0, exports.Roles)('super_admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_market_price_dto_1.UpdateMarketPriceDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "updateMarketPrice", null);
__decorate([
    (0, common_1.Put)('metadata/news/:id'),
    (0, exports.Roles)('super_admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_market_news_item_dto_1.UpdateMarketNewsItemDto]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "updateNewsItem", null);
__decorate([
    (0, common_1.Get)(':id/export'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "exportProjectDetails", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/investors'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('userId')),
    __param(3, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "addMember", null);
__decorate([
    (0, common_1.Delete)(':id/investors/:userId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Put)(':id/investors/:userId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('userId')),
    __param(3, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "updateMemberRole", null);
__decorate([
    (0, common_1.Get)(':id/invite-candidates'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "getInviteCandidates", null);
__decorate([
    (0, common_1.Post)(':id/invites'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('userId')),
    __param(3, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "inviteMember", null);
__decorate([
    (0, common_1.Post)(':id/invites/accept'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "acceptInvitation", null);
__decorate([
    (0, common_1.Post)(':id/invites/decline'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "declineInvitation", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "update", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, common_1.Controller)('projects'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService,
        project_analytics_service_1.ProjectAnalyticsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map