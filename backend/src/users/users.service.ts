import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Spending, SpendingDocument } from '../finance/schemas/finance.schema';
import {
  ModificationRequest,
  ModificationRequestDocument,
} from '../modifications/schemas/modification-request.schema';
import {
  Notification,
  NotificationDocument,
} from '../notifications/schemas/notification.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Spending.name)
    private readonly spendingModel: Model<SpendingDocument>,
    @InjectModel(ModificationRequest.name)
    private readonly modificationModel: Model<ModificationRequestDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(createUserDto: any): Promise<UserDocument> {
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

  async findOne(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        email: String(email || '')
          .trim()
          .toLowerCase(),
      })
      .exec();
  }

  async findByIdentifier(identifier: string): Promise<UserDocument | null> {
    const raw = String(identifier || '').trim();
    if (!raw) return null;

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
      } as any)
      .exec();
  }

  async findBySocialSub(
    provider: 'google' | 'apple',
    sub: string,
  ): Promise<UserDocument | null> {
    const field = provider === 'google' ? 'googleSub' : 'appleSub';
    return this.userModel.findOne({ [field]: String(sub || '') } as any).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async update(id: string, updateDto: any): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateDto, { returnDocument: 'after' })
      .exec();
  }

  async updateKyc(id: string, kycData: any): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { kycData, kycVerified: true },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async updateSettings(
    id: string,
    settings: any,
  ): Promise<UserDocument | null> {
    // Assuming 'settings' field exists or mixing into user root for now if schema isn't strict
    // Ideally User schema needs a 'settings' prop
    return this.userModel
      .findByIdAndUpdate(id, { settings }, { returnDocument: 'after' })
      .exec();
  }

  async updateNotificationPrefs(
    id: string,
    prefs: any,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { 'settings.notifications': prefs },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async setRefreshTokenHash(id: string, refreshTokenHash: string) {
    await this.userModel
      .findByIdAndUpdate(id, { refreshTokenHash }, { returnDocument: 'before' })
      .exec();
  }

  async clearRefreshTokenHash(id: string) {
    await this.userModel
      .findByIdAndUpdate(
        id,
        { refreshTokenHash: null },
        { returnDocument: 'before' },
      )
      .exec();
  }

  async countInvestors(): Promise<number> {
    return this.userModel.countDocuments({ role: 'investor' }).exec();
  }

  /**
   * Soft-delete user account: anonymize PII, mark as deleted.
   * Required by Apple App Store (§ 5.1.1) and Google Play (User Data policy).
   */
  async deleteAccount(
    userId: string,
    password: string,
  ): Promise<{ deleted: true }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    // Re-authenticate before destructive action
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException(
        'Incorrect password. Account deletion requires re-authentication.',
      );
    }

    // Anonymize PII instead of hard delete (preserves financial audit trail)
    const anonymizedSalt = await bcrypt.genSalt();
    const anonymizedHash = await bcrypt.hash(
      `deleted_${Date.now()}`,
      anonymizedSalt,
    );

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

    // Cascade cleanup: remove user from project memberships
    await this.projectModel
      .updateMany(
        { 'investors.user': user._id } as any,
        { $pull: { investors: { user: user._id } } } as any,
      )
      .exec();

    // Remove user notifications (recipient inbox) after deletion
    await this.notificationModel.deleteMany({ recipient: user._id } as any);

    return { deleted: true };
  }

  /**
   * Export all user data (GDPR compliance).
   */
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    const userData = user.toObject ? user.toObject() : user;
    const safeProfile: Record<string, any> = {
      ...(userData as Record<string, any>),
    };
    delete safeProfile.passwordHash;

    const [
      memberships,
      createdProjects,
      spendings,
      modifications,
      notifications,
    ] = await Promise.all([
      this.projectModel
        .find({ 'investors.user': user._id } as any)
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
        .find({ createdBy: user._id } as any)
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
        } as any)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.modificationModel
        .find({
          $or: [
            { requestedBy: user._id },
            { [`votes.${String(user._id)}.user`]: user._id },
          ],
        } as any)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.notificationModel
        .find({ recipient: user._id } as any)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);

    const membershipSummary = memberships.map((project: any) => {
      const investorEntry = (project?.investors || []).find(
        (inv: any) => String(inv?.user) === String(user._id),
      );
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

  /**
   * Register a push notification token for the user.
   */
  async registerPushToken(
    userId: string,
    pushToken: string,
  ): Promise<{ registered: true }> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        'settings.pushToken': pushToken,
        'settings.pushTokenUpdatedAt': new Date(),
      })
      .exec();

    return { registered: true };
  }

  /**
   * Get the app configuration (password policy, business rules, etc.)
   * Single source of truth — frontend should fetch this instead of hardcoding.
   */
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
}
