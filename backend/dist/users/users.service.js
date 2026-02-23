"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const user_schema_1 = require("./schemas/user.schema");
const project_schema_1 = require("../projects/schemas/project.schema");
const finance_schema_1 = require("../finance/schemas/finance.schema");
const modification_request_schema_1 = require("../modifications/schemas/modification-request.schema");
const notification_schema_1 = require("../notifications/schemas/notification.schema");
let UsersService = class UsersService {
    userModel;
    projectModel;
    spendingModel;
    modificationModel;
    notificationModel;
    constructor(userModel, projectModel, spendingModel, modificationModel, notificationModel) {
        this.userModel = userModel;
        this.projectModel = projectModel;
        this.spendingModel = spendingModel;
        this.modificationModel = modificationModel;
        this.notificationModel = notificationModel;
    }
    async create(createUserDto) {
        const { password, ...rest } = createUserDto;
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);
        const normalizedEmail = String(rest?.email || '')
            .trim()
            .toLowerCase();
        const normalizedUsername = rest?.username
            ? String(rest.username).trim().toLowerCase()
            : null;
        const normalizedPhone = rest?.phone
            ? String(rest.phone).replaceAll(/[^\d+]/g, '')
            : null;
        const createdUser = new this.userModel({
            ...rest,
            email: normalizedEmail,
            username: normalizedUsername,
            phone: normalizedPhone,
            passwordHash,
        });
        return createdUser.save();
    }
    async findOne(email) {
        return this.userModel
            .findOne({
            email: String(email || '')
                .trim()
                .toLowerCase(),
        })
            .exec();
    }
    async findByIdentifier(identifier) {
        const raw = String(identifier || '').trim();
        if (!raw)
            return null;
        const normalizedEmail = raw.toLowerCase();
        const normalizedUsername = raw.toLowerCase();
        const normalizedPhone = raw.replaceAll(/[^\d+]/g, '');
        return this.userModel
            .findOne({
            $or: [
                { email: normalizedEmail },
                { username: normalizedUsername },
                { phone: raw },
                { phone: normalizedPhone },
            ],
        })
            .exec();
    }
    async findBySocialSub(provider, sub) {
        const field = provider === 'google' ? 'googleSub' : 'appleSub';
        return this.userModel.findOne({ [field]: String(sub || '') }).exec();
    }
    async findById(id) {
        return this.userModel.findById(id).exec();
    }
    async findAll() {
        return this.userModel.find().exec();
    }
    async update(id, updateDto) {
        return this.userModel
            .findByIdAndUpdate(id, updateDto, { returnDocument: 'after' })
            .exec();
    }
    async updateKyc(id, kycData) {
        return this.userModel
            .findByIdAndUpdate(id, { kycData, kycVerified: true }, { returnDocument: 'after' })
            .exec();
    }
    async updateSettings(id, settings) {
        return this.userModel
            .findByIdAndUpdate(id, { settings }, { returnDocument: 'after' })
            .exec();
    }
    async updateNotificationPrefs(id, prefs) {
        return this.userModel
            .findByIdAndUpdate(id, { 'settings.notifications': prefs }, { returnDocument: 'after' })
            .exec();
    }
    async setRefreshTokenHash(id, refreshTokenHash) {
        await this.userModel
            .findByIdAndUpdate(id, { refreshTokenHash }, { returnDocument: 'before' })
            .exec();
    }
    async clearRefreshTokenHash(id) {
        await this.userModel
            .findByIdAndUpdate(id, { refreshTokenHash: null }, { returnDocument: 'before' })
            .exec();
    }
    async countInvestors() {
        return this.userModel.countDocuments({ role: 'investor' }).exec();
    }
    async deleteAccount(userId, password) {
        const user = await this.userModel.findById(userId).exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.BadRequestException('Incorrect password. Account deletion requires re-authentication.');
        }
        const anonymizedSalt = await bcrypt.genSalt();
        const anonymizedHash = await bcrypt.hash(`deleted_${Date.now()}`, anonymizedSalt);
        await this.userModel
            .findByIdAndUpdate(userId, {
            name: 'Deleted User',
            email: `deleted_${userId}@removed.local`,
            passwordHash: anonymizedHash,
            role: 'guest',
            kycData: {},
            bankDetails: {},
            settings: {},
            kycVerified: false,
            deletedAt: new Date(),
        })
            .exec();
        await this.projectModel
            .updateMany({ 'investors.user': user._id }, { $pull: { investors: { user: user._id } } })
            .exec();
        await this.notificationModel.deleteMany({ recipient: user._id });
        return { deleted: true };
    }
    async exportUserData(userId) {
        const user = await this.userModel.findById(userId).exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const userData = user.toObject ? user.toObject() : user;
        const safeProfile = {
            ...userData,
        };
        delete safeProfile.passwordHash;
        const [memberships, createdProjects, spendings, modifications, notifications,] = await Promise.all([
            this.projectModel
                .find({ 'investors.user': user._id })
                .select({
                name: 1,
                type: 1,
                status: 1,
                createdBy: 1,
                targetAmount: 1,
                raisedAmount: 1,
                investors: 1,
                createdAt: 1,
                updatedAt: 1,
            })
                .lean()
                .exec(),
            this.projectModel
                .find({ createdBy: user._id })
                .select({
                name: 1,
                type: 1,
                description: 1,
                status: 1,
                targetAmount: 1,
                raisedAmount: 1,
                currentValuation: 1,
                valuationHistory: 1,
                investors: 1,
                createdAt: 1,
                updatedAt: 1,
            })
                .lean()
                .exec(),
            this.spendingModel
                .find({
                $or: [{ addedBy: user._id }, { fundedBy: user._id }],
            })
                .sort({ createdAt: -1 })
                .lean()
                .exec(),
            this.modificationModel
                .find({
                $or: [
                    { requestedBy: user._id },
                    { [`votes.${String(user._id)}.user`]: user._id },
                ],
            })
                .sort({ createdAt: -1 })
                .lean()
                .exec(),
            this.notificationModel
                .find({ recipient: user._id })
                .sort({ createdAt: -1 })
                .lean()
                .exec(),
        ]);
        const membershipSummary = memberships.map((project) => {
            const investorEntry = (project?.investors || []).find((inv) => String(inv?.user) === String(user._id));
            return {
                projectId: String(project?._id),
                projectName: project?.name,
                projectType: project?.type,
                projectStatus: project?.status,
                role: investorEntry?.role || 'active',
                investedAmount: investorEntry?.investedAmount || 0,
                joinedAt: investorEntry?.createdAt || project?.createdAt || null,
            };
        });
        return {
            exportedAt: new Date().toISOString(),
            exportVersion: '2.0',
            userData: {
                profile: safeProfile,
                memberships: membershipSummary,
                createdProjects,
                financialActivity: {
                    spendings,
                },
                governanceActivity: {
                    modifications,
                },
                notifications,
            },
        };
    }
    async registerPushToken(userId, pushToken) {
        await this.userModel
            .findByIdAndUpdate(userId, {
            'settings.pushToken': pushToken,
            'settings.pushTokenUpdatedAt': new Date(),
        })
            .exec();
        return { registered: true };
    }
    getAppConfig() {
        return {
            passwordPolicy: {
                minLength: 10,
                requireUppercase: true,
                requireLowercase: true,
                requireNumber: true,
                requireSpecialChar: true,
            },
            approvalThresholdPercent: 50,
            defaultBudget: 100000,
            disposableEmailDomains: [
                'tempmail.com',
                'throwaway.email',
                'guerrillamail.com',
                'mailinator.com',
                'yopmail.com',
                'temp-mail.org',
                'fakeinbox.com',
                'sharklasers.com',
                'guerrillamailblock.com',
                'grr.la',
                'dispostable.com',
                'trashmail.com',
                'maildrop.cc',
                'getairmail.com',
                'mohmal.com',
            ],
            supportedCurrencies: ['INR', 'USD'],
            privacyPolicyUrl: 'https://splitflow.app/privacy-policy',
            termsOfServiceUrl: 'https://splitflow.app/terms-of-service',
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(project_schema_1.Project.name)),
    __param(2, (0, mongoose_1.InjectModel)(finance_schema_1.Spending.name)),
    __param(3, (0, mongoose_1.InjectModel)(modification_request_schema_1.ModificationRequest.name)),
    __param(4, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map