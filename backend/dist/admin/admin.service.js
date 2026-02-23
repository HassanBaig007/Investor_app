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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const projects_service_1 = require("../projects/projects.service");
const users_service_1 = require("../users/users.service");
let AdminService = class AdminService {
    projectsService;
    usersService;
    constructor(projectsService, usersService) {
        this.projectsService = projectsService;
        this.usersService = usersService;
    }
    async getStats() {
        const projects = await this.projectsService.findAll({
            userId: '',
            role: 'super_admin',
        });
        const activeProjects = projects.filter((p) => p.status === 'active').length;
        const totalRaised = projects.reduce((sum, p) => sum + (p.raisedAmount || 0), 0);
        const totalTarget = projects.reduce((sum, p) => sum + (p.targetAmount || 0), 0);
        const totalInvestors = await this.usersService.countInvestors();
        const pendingApprovals = projects.reduce((sum, p) => {
            return (sum + (p.investors?.filter((i) => i.role === 'pending').length || 0));
        }, 0);
        return {
            activeProjects,
            totalAUM: totalRaised,
            fundingProgress: totalTarget > 0 ? (totalRaised / totalTarget) * 100 : 0,
            totalInvestors,
            pendingApprovals,
            monthlyGrowth: totalTarget > 0
                ? Number(((totalRaised / totalTarget) * 100).toFixed(1))
                : 0,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService,
        users_service_1.UsersService])
], AdminService);
//# sourceMappingURL=admin.service.js.map