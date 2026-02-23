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
exports.ProjectSchema = exports.Project = exports.PendingInvitationSchema = exports.PendingInvitation = exports.ProjectInvestorSchema = exports.ProjectInvestor = exports.ProjectStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../../users/schemas/user.schema");
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["PENDING"] = "pending";
    ProjectStatus["FUNDING"] = "funding";
    ProjectStatus["ACTIVE"] = "active";
    ProjectStatus["COMPLETED"] = "completed";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
let ProjectInvestor = class ProjectInvestor {
    user;
    role;
    investedAmount;
    privacySettings;
};
exports.ProjectInvestor = ProjectInvestor;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User', index: true }),
    __metadata("design:type", user_schema_1.User)
], ProjectInvestor.prototype, "user", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'active' }),
    __metadata("design:type", String)
], ProjectInvestor.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProjectInvestor.prototype, "investedAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProjectInvestor.prototype, "privacySettings", void 0);
exports.ProjectInvestor = ProjectInvestor = __decorate([
    (0, mongoose_1.Schema)()
], ProjectInvestor);
exports.ProjectInvestorSchema = mongoose_1.SchemaFactory.createForClass(ProjectInvestor);
let PendingInvitation = class PendingInvitation {
    userId;
    role;
    invitedAt;
};
exports.PendingInvitation = PendingInvitation;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true,
    }),
    __metadata("design:type", String)
], PendingInvitation.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'passive' }),
    __metadata("design:type", String)
], PendingInvitation.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], PendingInvitation.prototype, "invitedAt", void 0);
exports.PendingInvitation = PendingInvitation = __decorate([
    (0, mongoose_1.Schema)()
], PendingInvitation);
exports.PendingInvitationSchema = mongoose_1.SchemaFactory.createForClass(PendingInvitation);
let Project = class Project {
    name;
    type;
    description;
    targetAmount;
    raisedAmount;
    minInvestment;
    returnRate;
    duration;
    riskLevel;
    currentValuation;
    valuationHistory;
    status;
    createdBy;
    investors;
    pendingInvitations;
};
exports.Project = Project;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Project.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Project.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Project.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Project.prototype, "targetAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Project.prototype, "raisedAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Project.prototype, "minInvestment", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Project.prototype, "returnRate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Project.prototype, "duration", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Project.prototype, "riskLevel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Project.prototype, "currentValuation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ valuation: Number, date: Date }] }),
    __metadata("design:type", Array)
], Project.prototype, "valuationHistory", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ProjectStatus, default: ProjectStatus.PENDING }),
    __metadata("design:type", String)
], Project.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User', index: true }),
    __metadata("design:type", user_schema_1.User)
], Project.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.ProjectInvestorSchema] }),
    __metadata("design:type", Array)
], Project.prototype, "investors", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.PendingInvitationSchema], default: [] }),
    __metadata("design:type", Array)
], Project.prototype, "pendingInvitations", void 0);
exports.Project = Project = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Project);
exports.ProjectSchema = mongoose_1.SchemaFactory.createForClass(Project);
//# sourceMappingURL=project.schema.js.map