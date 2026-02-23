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
var PrivacyInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const privacy_service_1 = require("./privacy.service");
let PrivacyInterceptor = PrivacyInterceptor_1 = class PrivacyInterceptor {
    privacyService;
    logger = new common_1.Logger(PrivacyInterceptor_1.name);
    constructor(privacyService) {
        this.privacyService = privacyService;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user)
            return next.handle();
        return next.handle().pipe((0, operators_1.map)((data) => {
            try {
                return this.deepMask(data, user);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'unknown error';
                this.logger.error(`deepMask failed, returning original data: ${errorMessage}`);
                return data;
            }
        }));
    }
    shouldStopTraversal(data, depth) {
        return depth > 10 || data === null || data === undefined;
    }
    toPlainData(data) {
        if (typeof data?.toObject === 'function') {
            return data.toObject();
        }
        if (typeof data?.toJSON === 'function' &&
            data.constructor?.name !== 'Object') {
            return data.toJSON();
        }
        return data;
    }
    shouldRecurseObject(value) {
        return (Boolean(value) &&
            typeof value === 'object' &&
            !(value instanceof Date) &&
            !Buffer.isBuffer(value));
    }
    maskObjectFields(data, user, depth) {
        const masked = this.maskIfInvestor(data, user);
        const result = { ...masked };
        for (const key of Object.keys(result)) {
            if (key.startsWith('$') || key === '_doc' || key === '__v')
                continue;
            const value = result[key];
            if (Array.isArray(value)) {
                result[key] = value.map((item) => this.deepMask(item, user, depth + 1));
                continue;
            }
            if (this.shouldRecurseObject(value)) {
                result[key] = this.deepMask(value, user, depth + 1);
            }
        }
        return result;
    }
    deepMask(data, user, depth = 0) {
        if (this.shouldStopTraversal(data, depth))
            return data;
        data = this.toPlainData(data);
        if (Array.isArray(data)) {
            return data.map((item) => this.deepMask(item, user, depth + 1));
        }
        if (typeof data === 'object' && !(data instanceof Date)) {
            return this.maskObjectFields(data, user, depth);
        }
        return data;
    }
    maskIfInvestor(item, user) {
        if (item?.role === 'investor' && item?.privacySettings) {
            const projectId = item.projectId;
            const isViewerAdmin = user.role === 'project_admin' ||
                user.role === 'super_admin' ||
                user.role === 'admin';
            return this.privacyService.getVisibleInvestorData(item, projectId, user.userId, isViewerAdmin);
        }
        return item;
    }
};
exports.PrivacyInterceptor = PrivacyInterceptor;
exports.PrivacyInterceptor = PrivacyInterceptor = PrivacyInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [privacy_service_1.PrivacyService])
], PrivacyInterceptor);
//# sourceMappingURL=privacy.interceptor.js.map