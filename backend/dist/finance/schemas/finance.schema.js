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
exports.LedgerSchema = exports.Ledger = exports.SpendingSchema = exports.Spending = exports.ApprovalSchema = exports.Approval = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../../users/schemas/user.schema");
const project_schema_1 = require("../../projects/schemas/project.schema");
let Approval = class Approval {
    user;
    userName;
    status;
    date;
};
exports.Approval = Approval;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", user_schema_1.User)
], Approval.prototype, "user", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], Approval.prototype, "userName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['approved', 'rejected'] }),
    __metadata("design:type", String)
], Approval.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Approval.prototype, "date", void 0);
exports.Approval = Approval = __decorate([
    (0, mongoose_1.Schema)()
], Approval);
exports.ApprovalSchema = mongoose_1.SchemaFactory.createForClass(Approval);
let Spending = class Spending {
    amount;
    description;
    category;
    paidTo;
    materialType;
    addedBy;
    fundedBy;
    project;
    ledger;
    subLedger;
    date;
    status;
    approvals;
};
exports.Spending = Spending;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Spending.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Spending.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['Service', 'Product'] }),
    __metadata("design:type", String)
], Spending.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Spending.prototype, "paidTo", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Spending.prototype, "materialType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", user_schema_1.User)
], Spending.prototype, "addedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", user_schema_1.User)
], Spending.prototype, "fundedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'Project', required: true }),
    __metadata("design:type", project_schema_1.Project)
], Spending.prototype, "project", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'Ledger' }),
    __metadata("design:type", Object)
], Spending.prototype, "ledger", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Spending.prototype, "subLedger", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Spending.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        default: 'pending',
        enum: ['pending', 'approved', 'rejected'],
    }),
    __metadata("design:type", String)
], Spending.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: exports.ApprovalSchema }),
    __metadata("design:type", Map)
], Spending.prototype, "approvals", void 0);
exports.Spending = Spending = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Spending);
exports.SpendingSchema = mongoose_1.SchemaFactory.createForClass(Spending);
let Ledger = class Ledger {
    name;
    project;
    subLedgers;
};
exports.Ledger = Ledger;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Ledger.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Schema.Types.ObjectId, ref: 'Project' }),
    __metadata("design:type", project_schema_1.Project)
], Ledger.prototype, "project", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], Ledger.prototype, "subLedgers", void 0);
exports.Ledger = Ledger = __decorate([
    (0, mongoose_1.Schema)()
], Ledger);
exports.LedgerSchema = mongoose_1.SchemaFactory.createForClass(Ledger);
//# sourceMappingURL=finance.schema.js.map