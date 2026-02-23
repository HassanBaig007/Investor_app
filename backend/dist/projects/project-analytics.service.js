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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const projects_service_1 = require("../projects/projects.service");
let ProjectAnalyticsService = class ProjectAnalyticsService {
    projectsService;
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    async getPortfolioAnalytics(userId) {
        const projects = await this.projectsService.findAll({
            userId,
            role: 'investor',
        });
        const totalAUM = projects.reduce((sum, p) => sum + (p.raisedAmount || 0), 0);
        const totalCurrentValue = projects.reduce((sum, p) => sum + (p.currentValuation || p.targetAmount || 0), 0);
        const activeProjects = projects.filter((p) => p.status === 'active').length;
        const totalInvested = totalAUM;
        const returnsPercent = totalInvested > 0
            ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
            : 0;
        const monthlyReturns = new Array(12).fill(0).map((_, index) => {
            const month = index + 1;
            const trend = returnsPercent / 12;
            return {
                month,
                return: Number((trend * month).toFixed(2)),
            };
        });
        const byType = projects.reduce((acc, project) => {
            const key = project.type || 'other';
            acc[key] = (acc[key] || 0) + (project.raisedAmount || 0);
            return acc;
        }, {});
        const assetAllocation = Object.entries(byType).map(([name, value]) => ({
            name,
            value: Number(value.toFixed ? value.toFixed(2) : value),
        }));
        return {
            totalValuation: totalCurrentValue,
            totalInvested,
            activeProjects,
            monthlyReturns,
            assetAllocation,
        };
    }
};
exports.ProjectAnalyticsService = ProjectAnalyticsService;
exports.ProjectAnalyticsService = ProjectAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectAnalyticsService);
//# sourceMappingURL=project-analytics.service.js.map