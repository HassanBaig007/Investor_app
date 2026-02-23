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
exports.ModificationRequestSchema = exports.ModificationRequest = exports.VoteSchema = exports.Vote = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../../users/schemas/user.schema");
const project_schema_1 = require("../../projects/schemas/project.schema");
let Vote = class Vote {
    user;
    status;
    date;
};
exports.Vote = Vote;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", user_schema_1.User)
], Vote.prototype, "user", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['approved', 'rejected'] }),
    __metadata("design:type", String)
], Vote.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Vote.prototype, "date", void 0);
exports.Vote = Vote = __decorate([
    (0, mongoose_1.Schema)()
], Vote);
exports.VoteSchema = mongoose_1.SchemaFactory.createForClass(Vote);
let ModificationRequest = class ModificationRequest {
    project;
    type;
    title;
    description;
    details;
    requestedBy;
    status;
    rejectedBy;
    rejectedAt;
    rejectionReason;
    votes;
};
exports.ModificationRequest = ModificationRequest;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'Project', required: true }),
    __metadata("design:type", project_schema_1.Project)
], ModificationRequest.prototype, "project", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['timeline', 'budget', 'scope', 'other'] }),
    __metadata("design:type", String)
], ModificationRequest.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ModificationRequest.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ModificationRequest.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ModificationRequest.prototype, "details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", user_schema_1.User)
], ModificationRequest.prototype, "requestedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        default: 'pending',
        enum: ['pending', 'approved', 'rejected'],
    }),
    __metadata("design:type", String)
], ModificationRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", user_schema_1.User)
], ModificationRequest.prototype, "rejectedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ModificationRequest.prototype, "rejectedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ModificationRequest.prototype, "rejectionReason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: exports.VoteSchema }),
    __metadata("design:type", Map)
], ModificationRequest.prototype, "votes", void 0);
exports.ModificationRequest = ModificationRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ModificationRequest);
exports.ModificationRequestSchema = mongoose_1.SchemaFactory.createForClass(ModificationRequest);
//# sourceMappingURL=modification-request.schema.js.map