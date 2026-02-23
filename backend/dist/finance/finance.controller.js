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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const finance_service_1 = require("./finance.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_spending_dto_1 = require("./dto/create-spending.dto");
let FinanceController = class FinanceController {
    financeService;
    constructor(financeService) {
        this.financeService = financeService;
    }
    addSpending(req, createSpendingDto) {
        return this.financeService.addSpending(createSpendingDto, req.user);
    }
    voteSpending(req, id, vote) {
        return this.financeService.voteSpending(id, req.user.userId, vote, req.user);
    }
    searchSpendings(req, projectId, search, status, page, limit) {
        return this.financeService.searchSpendings(projectId, req.user, {
            search,
            status,
            page: page ? Number.parseInt(page, 10) : undefined,
            limit: limit ? Number.parseInt(limit, 10) : undefined,
        });
    }
    findAll(req, projectId, ownerUserId, status, fromDate, toDate) {
        return this.financeService.findAll(projectId, req.user, {
            ownerUserId,
            status,
            fromDate,
            toDate,
        });
    }
    createLedger(req, createLedgerDto) {
        return this.financeService.createLedger(createLedgerDto, req.user);
    }
    findAllLedgers(req, projectId) {
        return this.financeService.findAllLedgers(projectId, req.user);
    }
    findOneLedger(req, id) {
        return this.financeService.findOneLedger(id, req.user);
    }
    updateLedger(req, id, updateDto) {
        return this.financeService.updateLedger(id, updateDto, req.user);
    }
    deleteLedger(req, id) {
        return this.financeService.deleteLedger(id, req.user);
    }
    getMyExpenses(req, query) {
        return this.financeService.getMyExpenses(req.user, {
            fromDate: query?.fromDate,
            toDate: query?.toDate,
            category: query?.category,
            projectId: query?.projectId,
            ledgerId: query?.ledgerId,
            subLedger: query?.subLedger,
            page: query?.page ? Number.parseInt(query.page, 10) : undefined,
            limit: query?.limit ? Number.parseInt(query.limit, 10) : undefined,
        });
    }
    getExpenseAnalytics(req, fromDate, toDate) {
        return this.financeService.getExpenseAnalytics(req.user, {
            fromDate,
            toDate,
        });
    }
    getMyPendingApprovals(req) {
        return this.financeService.getMyPendingApprovals(req.user);
    }
    getSpendingSummary(req, projectId) {
        return this.financeService.getSpendingSummary(projectId, req.user);
    }
    getBulkSpendingSummary(req, projectIdsParam) {
        const projectIds = String(projectIdsParam || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
        return this.financeService.getBulkSpendingSummary(projectIds, req.user);
    }
    exportExpenses(req, query) {
        return this.financeService.exportExpenses(req.user, query?.format, {
            fromDate: query?.fromDate,
            toDate: query?.toDate,
            projectId: query?.projectId,
            ledgerId: query?.ledgerId,
            subLedger: query?.subLedger,
        });
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Post)('spendings'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_spending_dto_1.CreateSpendingDto]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "addSpending", null);
__decorate([
    (0, common_1.Post)('spendings/:id/vote'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('vote')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "voteSpending", null);
__decorate([
    (0, common_1.Get)('spendings/search'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('projectId')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "searchSpendings", null);
__decorate([
    (0, common_1.Get)('spendings'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('projectId')),
    __param(2, (0, common_1.Query)('ownerUserId')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('fromDate')),
    __param(5, (0, common_1.Query)('toDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('ledgers'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "createLedger", null);
__decorate([
    (0, common_1.Get)('ledgers'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "findAllLedgers", null);
__decorate([
    (0, common_1.Get)('ledgers/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "findOneLedger", null);
__decorate([
    (0, common_1.Put)('ledgers/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "updateLedger", null);
__decorate([
    (0, common_1.Delete)('ledgers/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "deleteLedger", null);
__decorate([
    (0, common_1.Get)('my-expenses'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getMyExpenses", null);
__decorate([
    (0, common_1.Get)('expense-analytics'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('fromDate')),
    __param(2, (0, common_1.Query)('toDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getExpenseAnalytics", null);
__decorate([
    (0, common_1.Get)('my-pending-approvals'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getMyPendingApprovals", null);
__decorate([
    (0, common_1.Get)('spending-summary'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getSpendingSummary", null);
__decorate([
    (0, common_1.Get)('spending-summary/bulk'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('projectIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getBulkSpendingSummary", null);
__decorate([
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "exportExpenses", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map