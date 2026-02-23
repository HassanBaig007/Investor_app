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
exports.UserSchema = exports.User = exports.UserRole = void 0;
const mongoose_1 = require("@nestjs/mongoose");
var UserRole;
(function (UserRole) {
    UserRole["GUEST"] = "guest";
    UserRole["INVESTOR"] = "investor";
    UserRole["ADMIN"] = "admin";
    UserRole["PROJECT_ADMIN"] = "project_admin";
    UserRole["SUPER_ADMIN"] = "super_admin";
})(UserRole || (exports.UserRole = UserRole = {}));
let User = class User {
    email;
    username;
    phone;
    passwordHash;
    name;
    role;
    kycVerified;
    kycData;
    bankDetails;
    settings;
    refreshTokenHash;
    googleSub;
    appleSub;
    authProvider;
    deletedAt;
};
exports.User = User;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, unique: true, sparse: true, default: null }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, unique: true, sparse: true, default: null }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: UserRole, default: UserRole.GUEST }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "kycVerified", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], User.prototype, "kycData", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], User.prototype, "bankDetails", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], User.prototype, "settings", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], User.prototype, "refreshTokenHash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], User.prototype, "googleSub", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], User.prototype, "appleSub", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'password' }),
    __metadata("design:type", String)
], User.prototype, "authProvider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Date)
], User.prototype, "deletedAt", void 0);
exports.User = User = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], User);
exports.UserSchema = mongoose_1.SchemaFactory.createForClass(User);
//# sourceMappingURL=user.schema.js.map