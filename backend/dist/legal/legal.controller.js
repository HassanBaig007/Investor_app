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
exports.LegalController = void 0;
const common_1 = require("@nestjs/common");
const legal_service_1 = require("./legal.service");
let LegalController = class LegalController {
    legalService;
    constructor(legalService) {
        this.legalService = legalService;
    }
    getPrivacyPolicy() {
        return this.legalService.getPrivacyPolicy();
    }
    getTerms() {
        return this.legalService.getTermsOfService();
    }
};
exports.LegalController = LegalController;
__decorate([
    (0, common_1.Get)('privacy-policy'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "getPrivacyPolicy", null);
__decorate([
    (0, common_1.Get)('terms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "getTerms", null);
exports.LegalController = LegalController = __decorate([
    (0, common_1.Controller)('legal'),
    __metadata("design:paramtypes", [legal_service_1.LegalService])
], LegalController);
//# sourceMappingURL=legal.controller.js.map