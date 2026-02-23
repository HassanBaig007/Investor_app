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
exports.InvestmentsController = void 0;
const common_1 = require("@nestjs/common");
const investments_service_1 = require("./investments.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let InvestmentsController = class InvestmentsController {
    investmentsService;
    constructor(investmentsService) {
        this.investmentsService = investmentsService;
    }
    getPortfolio(req) {
        return this.investmentsService.getPortfolio(req.user.userId);
    }
    getInvestments(req) {
        return this.investmentsService.getInvestments(req.user.userId);
    }
    getQuarterlyReports(req) {
        return this.investmentsService.getQuarterlyReports(req.user.userId);
    }
    downloadQuarterlyReport(req, reportId, format) {
        return this.investmentsService.getQuarterlyReportDownload(req.user.userId, reportId, format);
    }
    getPerformanceMetrics(req, period) {
        return this.investmentsService.getPerformanceMetrics(req.user.userId, period);
    }
    getInvestmentById(id, req) {
        return this.investmentsService.getInvestmentById(id, req.user.userId);
    }
};
exports.InvestmentsController = InvestmentsController;
__decorate([
    (0, common_1.Get)('portfolio'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvestmentsController.prototype, "getPortfolio", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvestmentsController.prototype, "getInvestments", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvestmentsController.prototype, "getQuarterlyReports", null);
__decorate([
    (0, common_1.Get)('reports/:reportId/download'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('reportId')),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], InvestmentsController.prototype, "downloadQuarterlyReport", null);
__decorate([
    (0, common_1.Get)('performance-metrics'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InvestmentsController.prototype, "getPerformanceMetrics", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InvestmentsController.prototype, "getInvestmentById", null);
exports.InvestmentsController = InvestmentsController = __decorate([
    (0, common_1.Controller)('investments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [investments_service_1.InvestmentsService])
], InvestmentsController);
//# sourceMappingURL=investments.controller.js.map