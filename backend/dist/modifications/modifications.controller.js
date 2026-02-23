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
exports.ModificationsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const modifications_service_1 = require("./modifications.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ModificationsController = class ModificationsController {
    modificationsService;
    constructor(modificationsService) {
        this.modificationsService = modificationsService;
    }
    create(req, createDto) {
        return this.modificationsService.create(createDto, req.user);
    }
    vote(req, id, vote, reason) {
        return this.modificationsService.vote(id, req.user.userId, vote, reason, req.user);
    }
    approve(req, id) {
        return this.modificationsService.vote(id, req.user.userId, 'approved', undefined, req.user);
    }
    reject(req, id, reason) {
        return this.modificationsService.vote(id, req.user.userId, 'rejected', reason, req.user);
    }
    findAll(req, projectId) {
        return this.modificationsService.findAll(projectId, req.user);
    }
};
exports.ModificationsController = ModificationsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ModificationsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/vote'),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('vote')),
    __param(3, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ModificationsController.prototype, "vote", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ModificationsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ModificationsController.prototype, "reject", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ModificationsController.prototype, "findAll", null);
exports.ModificationsController = ModificationsController = __decorate([
    (0, common_1.Controller)('modifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [modifications_service_1.ModificationsService])
], ModificationsController);
//# sourceMappingURL=modifications.controller.js.map