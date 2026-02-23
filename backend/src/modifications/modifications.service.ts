import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ModificationRequest,
  ModificationRequestDocument,
} from './schemas/modification-request.schema';
import { ProjectsService } from '../projects/projects.service';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class ModificationsService {
  constructor(
    @InjectModel(ModificationRequest.name)
    private readonly modificationModel: Model<ModificationRequestDocument>,
    private readonly projectsService: ProjectsService,
    private readonly notificationService: NotificationService,
  ) {}

  private getId(u: any): string {
    if (!u) return '';
    if (typeof u === 'string') return u;
    if (u._id) return u._id.toString();
    if (u.id) return u.id.toString();
    return u.toString();
  }

  private getVotesObject(votes: any): Record<string, any> {
    if (!votes) return {};
    if (votes instanceof Map) return Object.fromEntries(votes.entries());
    return votes;
  }

  private getVoteSummary(mod: any, project: any) {
    const votes = this.getVotesObject(mod?.votes);
    const voteEntries = Object.entries(votes);
    const approved = voteEntries.filter(
      ([, value]) => value?.status === 'approved',
    ).length;
    const rejected = voteEntries.filter(
      ([, value]) => value?.status === 'rejected',
    ).length;
    const activeInvestors = (project?.investors || []).filter(
      (inv: any) => inv?.role === 'active',
    ).length;
    const total = activeInvestors || approved + rejected;
    const pending = Math.max(total - approved - rejected, 0);

    return {
      approved,
      rejected,
      pending,
      total,
    };
  }

  private normalizeModification(modDoc: any, project?: any) {
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

  async create(createDto: any, user: any) {
    const project = await this.projectsService.findOne(
      createDto.project || createDto.projectId,
    );
    if (!project) throw new NotFoundException('Project not found');

    const createdMod = new this.modificationModel({
      ...createDto,
      project: project['_id'],
      requestedBy: user.userId,
      status: 'pending',
      votes: new Map(),
    });

    await createdMod.save();

    // Standard push to all active investors
    const activeInvestors = project.investors
      ? project.investors.filter((inv) => inv.role === 'active')
      : [];

    for (const inv of activeInvestors) {
      const invId = this.getId(inv.user);
      if (invId && invId !== user.userId) {
        await this.notificationService.sendPush(
          invId,
          'New Modification Request',
          `${user.name || 'Someone'} requested a ${createdMod.type} modification for ${project.name}`,
          { modId: createdMod['_id'], projectId: project['_id'] },
        );
      }
    }

    const populated = await createdMod.populate([
      { path: 'requestedBy', select: 'name email' },
      { path: 'project', select: 'name' },
    ]);
    return this.normalizeModification(populated, project);
  }

  async vote(
    modId: string,
    userId: string,
    vote: 'approved' | 'rejected',
    reason?: string,
    user?: any,
  ) {
    const mod = await this.modificationModel.findById(modId);
    if (!mod) throw new NotFoundException('Modification Request not found');

    // SECURITY: Prevent voting on already-finalized modifications
    if (mod.status === 'approved') {
      throw new ForbiddenException(
        'This modification has already been fully approved',
      );
    }
    if (mod.status === 'rejected') {
      throw new ForbiddenException(
        'This modification has already been rejected',
      );
    }

    const project = await this.projectsService.findOne(
      (mod.project as any).toString(),
    );

    if (!project) throw new NotFoundException('Project not found');

    // Safety check for investors array
    const activeInvestors = project.investors
      ? project.investors.filter((inv) => inv.role === 'active')
      : [];
    const requiredVotes = activeInvestors.length;

    const isVoterActive = activeInvestors.some(
      (inv) => this.getId(inv.user) === userId,
    );

    // Allow privileged roles (super_admin, admin, project_admin) to vote even if not an active investor
    const isPrivileged = ['admin', 'project_admin', 'super_admin'].includes(
      user?.role || '',
    );

    if (!isVoterActive && !isPrivileged)
      throw new ForbiddenException('Only active investors can vote');

    if (!mod.votes) mod.votes = new Map();

    if (vote === 'rejected') {
      mod.status = 'rejected';
      mod.rejectedBy = userId as any;
      mod.rejectedAt = new Date();
      mod.rejectionReason = (reason || '').trim() || undefined;
      mod.votes.set(userId, {
        status: 'rejected',
        date: new Date(),
        user: userId,
      } as any);
      await mod.save();
      const populated = await mod.populate([
        { path: 'requestedBy', select: 'name email' },
        { path: 'project', select: 'name investors' },
      ]);
      return this.normalizeModification(populated, project);
    }

    mod.rejectedBy = undefined as any;
    mod.rejectedAt = undefined;
    mod.rejectionReason = undefined;

    mod.votes.set(userId, {
      status: 'approved',
      date: new Date(),
      user: userId,
    } as any);

    let approvedCount = 0;
    for (const v of mod.votes.values()) {
      if (v.status === 'approved') approvedCount++;
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

  async findAll(projectId: string, user?: { userId: string; role?: string }) {
    if (projectId) {
      // If a project ID is given, verify user has access
      if (user) {
        const project = await this.projectsService.findOne(projectId, user);
        if (!project) throw new NotFoundException('Project not found');
      }
      const project = await this.projectsService.findOne(
        projectId,
        user as any,
      );
      const mods = await this.modificationModel
        .find({ project: new Types.ObjectId(projectId) as any })
        .populate('requestedBy', 'name email')
        .populate('project', 'name investors')
        .exec();
      return mods.map((mod) => this.normalizeModification(mod, project));
    }

    // If no projectId, only privileged roles can see all modifications
    if (
      user &&
      ['admin', 'project_admin', 'super_admin'].includes(user.role || '')
    ) {
      const mods = await this.modificationModel
        .find()
        .populate('requestedBy', 'name email')
        .populate('project', 'name investors')
        .exec();
      return mods.map((mod) => this.normalizeModification(mod));
    }

    // Regular users with no projectId: return empty (must specify project)
    return [];
  }
}
