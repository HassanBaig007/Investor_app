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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const modification_request_schema_1 = require("./schemas/modification-request.schema");
const projects_service_1 = require("../projects/projects.service");
const notifications_service_1 = require("../notifications/notifications.service");
let ModificationsService = class ModificationsService {
    modificationModel;
    projectsService;
    notificationService;
    constructor(modificationModel, projectsService, notificationService) {
        this.modificationModel = modificationModel;
        this.projectsService = projectsService;
        this.notificationService = notificationService;
    }
    getId(u) {
        if (!u)
            return '';
        if (typeof u === 'string')
            return u;
        if (u._id)
            return u._id.toString();
        if (u.id)
            return u.id.toString();
        return u.toString();
    }
    getVotesObject(votes) {
        if (!votes)
            return {};
        if (votes instanceof Map)
            return Object.fromEntries(votes.entries());
        return votes;
    }
    getVoteSummary(mod, project) {
        const votes = this.getVotesObject(mod?.votes);
        const voteEntries = Object.entries(votes);
        const approved = voteEntries.filter(([, value]) => value?.status === 'approved').length;
        const rejected = voteEntries.filter(([, value]) => value?.status === 'rejected').length;
        const activeInvestors = (project?.investors || []).filter((inv) => inv?.role === 'active').length;
        const total = activeInvestors || approved + rejected;
        const pending = Math.max(total - approved - rejected, 0);
        return {
            approved,
            rejected,
            pending,
            total,
        };
    }
    normalizeModification(modDoc, project) {
        const mod = modDoc?.toObject ? modDoc.toObject() : modDoc;
        const votes = this.getVotesObject(mod?.votes);
        const requestedById = this.getId(mod?.requestedBy);
        const projectId = this.getId(mod?.project);
        const projectName = mod?.project?.name || project?.name || mod?.projectName;
        return {
            ...mod,
            id: this.getId(mod),
            requestedBy: requestedById || mod?.requestedBy,
            requestedById: requestedById || null,
            requestedByName: mod?.requestedBy?.name || null,
            projectId,
            projectName: projectName || 'Project',
            votes,
            votesMap: votes,
            votesSummary: project ? this.getVoteSummary(mod, project) : undefined,
        };
    }
    async create(createDto, user) {
        const project = await this.projectsService.findOne(createDto.project || createDto.projectId);
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const createdMod = new this.modificationModel({
            ...createDto,
            project: project['_id'],
            requestedBy: user.userId,
            status: 'pending',
            votes: new Map(),
        });
        await createdMod.save();
        const activeInvestors = project.investors
            ? project.investors.filter((inv) => inv.role === 'active')
            : [];
        for (const inv of activeInvestors) {
            const invId = this.getId(inv.user);
            if (invId && invId !== user.userId) {
                await this.notificationService.sendPush(invId, 'New Modification Request', `${user.name || 'Someone'} requested a ${createdMod.type} modification for ${project.name}`, { modId: createdMod['_id'], projectId: project['_id'] });
            }
        }
        const populated = await createdMod.populate([
            { path: 'requestedBy', select: 'name email' },
            { path: 'project', select: 'name' },
        ]);
        return this.normalizeModification(populated, project);
    }
    async vote(modId, userId, vote, reason, user) {
        const mod = await this.modificationModel.findById(modId);
        if (!mod)
            throw new common_1.NotFoundException('Modification Request not found');
        if (mod.status === 'approved') {
            throw new common_1.ForbiddenException('This modification has already been fully approved');
        }
        if (mod.status === 'rejected') {
            throw new common_1.ForbiddenException('This modification has already been rejected');
        }
        const project = await this.projectsService.findOne(mod.project.toString());
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const activeInvestors = project.investors
            ? project.investors.filter((inv) => inv.role === 'active')
            : [];
        const requiredVotes = activeInvestors.length;
        const isVoterActive = activeInvestors.some((inv) => this.getId(inv.user) === userId);
        const isPrivileged = ['admin', 'project_admin', 'super_admin'].includes(user?.role || '');
        if (!isVoterActive && !isPrivileged)
            throw new common_1.ForbiddenException('Only active investors can vote');
        if (!mod.votes)
            mod.votes = new Map();
        if (vote === 'rejected') {
            mod.status = 'rejected';
            mod.rejectedBy = userId;
            mod.rejectedAt = new Date();
            mod.rejectionReason = (reason || '').trim() || undefined;
            mod.votes.set(userId, {
                status: 'rejected',
                date: new Date(),
                user: userId,
            });
            await mod.save();
            const populated = await mod.populate([
                { path: 'requestedBy', select: 'name email' },
                { path: 'project', select: 'name investors' },
            ]);
            return this.normalizeModification(populated, project);
        }
        mod.rejectedBy = undefined;
        mod.rejectedAt = undefined;
        mod.rejectionReason = undefined;
        mod.votes.set(userId, {
            status: 'approved',
            date: new Date(),
            user: userId,
        });
        let approvedCount = 0;
        for (const v of mod.votes.values()) {
            if (v.status === 'approved')
                approvedCount++;
        }
        if (approvedCount >= requiredVotes) {
            mod.status = 'approved';
        }
        await mod.save();
        const populated = await mod.populate([
            { path: 'requestedBy', select: 'name email' },
            { path: 'project', select: 'name investors' },
        ]);
        return this.normalizeModification(populated, project);
    }
    async findAll(projectId, user) {
        if (projectId) {
            if (user) {
                const project = await this.projectsService.findOne(projectId, user);
                if (!project)
                    throw new common_1.NotFoundException('Project not found');
            }
            const project = await this.projectsService.findOne(projectId, user);
            const mods = await this.modificationModel
                .find({ project: new mongoose_2.Types.ObjectId(projectId) })
                .populate('requestedBy', 'name email')
                .populate('project', 'name investors')
                .exec();
            return mods.map((mod) => this.normalizeModification(mod, project));
        }
        if (user &&
            ['admin', 'project_admin', 'super_admin'].includes(user.role || '')) {
            const mods = await this.modificationModel
                .find()
                .populate('requestedBy', 'name email')
                .populate('project', 'name investors')
                .exec();
            return mods.map((mod) => this.normalizeModification(mod));
        }
        return [];
    }
};
exports.ModificationsService = ModificationsService;
exports.ModificationsService = ModificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(modification_request_schema_1.ModificationRequest.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        projects_service_1.ProjectsService,
        notifications_service_1.NotificationService])
], ModificationsService);
//# sourceMappingURL=modifications.service.js.map