"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyService = void 0;
const common_1 = require("@nestjs/common");
let PrivacyService = class PrivacyService {
    getVisibleInvestorData(investor, projectId, viewerId, isViewerAdmin) {
        if (investor.id === viewerId || investor._id?.toString() === viewerId) {
            return {
                ...investor,
                isAnonymous: false,
                isSelf: true,
                visibilityLevel: 'full',
            };
        }
        const privacySettings = investor.privacySettings || {};
        const projectPrivacy = privacySettings[projectId] || {};
        const isAnonymous = projectPrivacy.isAnonymous === true;
        if (isViewerAdmin) {
            return {
                ...investor,
                isAnonymous,
                isSelf: false,
                visibilityLevel: 'admin',
            };
        }
        if (isAnonymous) {
            return {
                id: investor.id || investor._id,
                name: projectPrivacy.displayName || 'Anonymous Investor',
                email: '••••••••@••••.com',
                avatar: null,
                totalInvested: projectPrivacy.showInvestmentAmount
                    ? investor.totalInvested
                    : null,
                isAnonymous: true,
                isSelf: false,
                visibilityLevel: 'anonymous',
            };
        }
        return {
            ...investor,
            isAnonymous: false,
            isSelf: false,
            visibilityLevel: 'full',
        };
    }
};
exports.PrivacyService = PrivacyService;
exports.PrivacyService = PrivacyService = __decorate([
    (0, common_1.Injectable)()
], PrivacyService);
//# sourceMappingURL=privacy.service.js.map