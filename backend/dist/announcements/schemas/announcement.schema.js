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
exports.AnnouncementSchema = exports.Announcement = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../../users/schemas/user.schema");
let Announcement = class Announcement {
    title;
    content;
    priority;
    createdBy;
    isActive;
    readBy;
};
exports.Announcement = Announcement;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Announcement.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Announcement.prototype, "content", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['low', 'medium', 'high'], default: 'medium' }),
    __metadata("design:type", String)
], Announcement.prototype, "priority", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", user_schema_1.User)
], Announcement.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Announcement.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{ type: mongoose_2.Schema.Types.ObjectId, ref: 'User' }],
        default: [],
    }),
    __metadata("design:type", Array)
], Announcement.prototype, "readBy", void 0);
exports.Announcement = Announcement = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Announcement);
exports.AnnouncementSchema = mongoose_1.SchemaFactory.createForClass(Announcement);
//# sourceMappingURL=announcement.schema.js.map