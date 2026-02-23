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
exports.RegisterDto = void 0;
const class_validator_1 = require("class-validator");
const user_schema_1 = require("../../users/schemas/user.schema");
const SELF_ASSIGNABLE_ROLES = [user_schema_1.UserRole.GUEST, user_schema_1.UserRole.INVESTOR];
class RegisterDto {
    email;
    password;
    name;
    username;
    phone;
    role;
    kycVerified;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(10, { message: 'Password must be at least 10 characters long' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password cannot exceed 128 characters' }),
    (0, class_validator_1.Matches)(/[A-Z]/, {
        message: 'Password must contain at least one uppercase letter',
    }),
    (0, class_validator_1.Matches)(/[a-z]/, {
        message: 'Password must contain at least one lowercase letter',
    }),
    (0, class_validator_1.Matches)(/\d/, { message: 'Password must contain at least one number' }),
    (0, class_validator_1.Matches)(/[!@#$%^&*()_+\-={}';:"\\|,.<>?]/, {
        message: 'Password must contain at least one special character',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2, { message: 'Name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Name cannot exceed 50 characters' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z]+(?:\s[a-zA-Z]+)+$/, {
        message: 'Please enter your full name (first and last name, letters only)',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(user_schema_1.UserRole),
    (0, class_validator_1.IsIn)(SELF_ASSIGNABLE_ROLES),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RegisterDto.prototype, "kycVerified", void 0);
//# sourceMappingURL=register.dto.js.map