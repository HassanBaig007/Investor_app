"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const privacy_service_1 = require("./privacy.service");
const privacy_interceptor_1 = require("./privacy.interceptor");
const auth_module_1 = require("../auth/auth.module");
let PrivacyModule = class PrivacyModule {
};
exports.PrivacyModule = PrivacyModule;
exports.PrivacyModule = PrivacyModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        providers: [
            privacy_service_1.PrivacyService,
            privacy_interceptor_1.PrivacyInterceptor,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: privacy_interceptor_1.PrivacyInterceptor,
            },
        ],
        exports: [privacy_service_1.PrivacyService, privacy_interceptor_1.PrivacyInterceptor],
    })
], PrivacyModule);
//# sourceMappingURL=privacy.module.js.map