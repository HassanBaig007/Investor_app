"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestmentsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const investments_controller_1 = require("./investments.controller");
const investments_service_1 = require("./investments.service");
const project_schema_1 = require("../projects/schemas/project.schema");
const auth_module_1 = require("../auth/auth.module");
let InvestmentsModule = class InvestmentsModule {
};
exports.InvestmentsModule = InvestmentsModule;
exports.InvestmentsModule = InvestmentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: project_schema_1.Project.name, schema: project_schema_1.ProjectSchema }]),
            auth_module_1.AuthModule,
        ],
        controllers: [investments_controller_1.InvestmentsController],
        providers: [investments_service_1.InvestmentsService],
        exports: [investments_service_1.InvestmentsService],
    })
], InvestmentsModule);
//# sourceMappingURL=investments.module.js.map