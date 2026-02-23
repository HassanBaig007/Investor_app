import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsService } from './projects.service';

const mockQuery = (result: any) => {
  const query: any = {
    select: jest.fn(() => query),
    lean: jest.fn(() => query),
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    exec: jest.fn().mockResolvedValue(result),
    then: (resolve: any, reject?: any) => query.exec().then(resolve, reject),
  };
  return query;
};

const makeProjectDoc = (overrides: any = {}) => {
  const base: any = {
    _id: new Types.ObjectId(),
    name: 'Project A',
    createdBy: 'creator-1',
    status: 'pending',
    investors: [],
    pendingInvitations: [],
    save: jest.fn(),
    populate: jest.fn(),
    toObject: jest.fn(),
  };

  const doc = { ...base, ...overrides };
  doc.save.mockResolvedValue(doc);
  doc.populate.mockResolvedValue(doc);
  doc.toObject.mockReturnValue({
    ...doc,
    save: undefined,
    populate: undefined,
    toObject: undefined,
  });
  return doc;
};

describe('ProjectsService (member + metadata flows)', () => {
  let service: ProjectsService;
  let projectModel: any;
  let marketPriceModel: any;
  let marketNewsItemModel: any;
  let userModel: any;
  let notificationModel: any;
  let spendingModel: any;
  let ledgerModel: any;

  beforeEach(async () => {
    const ProjectModel = jest.fn().mockImplementation((dto: any) =>
      makeProjectDoc({
        ...dto,
        _id: new Types.ObjectId(),
      }),
    ) as any;
    ProjectModel.findById = jest.fn();
    ProjectModel.find = jest.fn();
    ProjectModel.findByIdAndUpdate = jest.fn();
    projectModel = ProjectModel;

    marketPriceModel = {
      countDocuments: jest.fn(),
      insertMany: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    marketNewsItemModel = {
      countDocuments: jest.fn(),
      insertMany: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    userModel = {
      findById: jest.fn(),
      find: jest.fn(),
    };

    const NotificationModel = jest.fn().mockImplementation((dto: any) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...dto }),
    })) as any;
    notificationModel = NotificationModel;

    spendingModel = { find: jest.fn() };
    ledgerModel = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken('Project'), useValue: projectModel },
        { provide: getModelToken('MarketPrice'), useValue: marketPriceModel },
        {
          provide: getModelToken('MarketNewsItem'),
          useValue: marketNewsItemModel,
        },
        { provide: getModelToken('User'), useValue: userModel },
        { provide: getModelToken('Notification'), useValue: notificationModel },
        { provide: getModelToken('Spending'), useValue: spendingModel },
        { provide: getModelToken('Ledger'), useValue: ledgerModel },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('create throws when creator id is missing', async () => {
    await expect(service.create({ name: 'P' } as any, null)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('create persists creator as active investor and sanitizes super admin from response', async () => {
    const creatorId = new Types.ObjectId().toHexString();
    userModel.findById.mockReturnValueOnce(mockQuery({ name: 'Creator Name' }));
    userModel.find.mockReturnValue(
      mockQuery([{ _id: new Types.ObjectId(), name: 'Root Admin' }]),
    );

    const projectFromReload = makeProjectDoc({
      createdBy: { _id: creatorId, name: 'Creator Name' },
      investors: [
        { user: { _id: creatorId, role: 'investor', name: 'Creator Name' } },
        { user: { _id: 'sa-1', role: 'super_admin', name: 'Root Admin' } },
      ],
    });
    projectModel.findById.mockReturnValue(mockQuery(projectFromReload));

    const result = await service.create(
      { name: 'P', targetAmount: 5000 } as any,
      { userId: creatorId },
    );

    expect(projectModel).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: creatorId,
        investors: expect.arrayContaining([
          expect.objectContaining({ user: creatorId, role: 'active' }),
        ]),
      }),
    );
    expect(result.investors).toHaveLength(1);
    expect(result.investors[0].user.role).toBe('investor');
  });

  it('findAll returns empty list when no viewer is provided', async () => {
    await expect(service.findAll(null)).resolves.toEqual([]);
  });

  it('findAll uses membership query for non-privileged viewer', async () => {
    userModel.find.mockReturnValue(mockQuery([]));
    projectModel.find.mockReturnValue(
      mockQuery([makeProjectDoc({ createdBy: 'u-1', investors: [] })]),
    );

    await service.findAll({ userId: 'u-1', role: 'investor' });

    expect(projectModel.find).toHaveBeenCalledWith({
      $or: [
        { createdBy: 'u-1' },
        { 'investors.user': 'u-1' },
        { 'pendingInvitations.userId': 'u-1' },
      ],
    });
  });

  it('findOne throws forbidden for non-member non-admin viewer', async () => {
    userModel.find.mockReturnValue(mockQuery([]));
    projectModel.findById.mockReturnValue(
      mockQuery(
        makeProjectDoc({
          createdBy: 'creator-a',
          investors: [{ user: 'investor-a', role: 'active' }],
          pendingInvitations: [],
        }),
      ),
    );

    await expect(
      service.findOne('project-1', { userId: 'outsider', role: 'investor' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('inviteMember adds invitation and creates notification', async () => {
    const projectDoc = makeProjectDoc({
      name: 'Alpha',
      investors: [],
      pendingInvitations: [],
    });
    projectModel.findById.mockResolvedValueOnce(projectDoc).mockReturnValueOnce(
      mockQuery(
        makeProjectDoc({
          investors: [],
          pendingInvitations: [
            { userId: 'invitee-1', role: 'active', invitedAt: new Date() },
          ],
        }),
      ),
    );
    userModel.findById
      .mockReturnValueOnce(mockQuery({ name: 'Invitee' }))
      .mockReturnValueOnce(mockQuery({ name: 'Project Owner' }));

    const result = await service.inviteMember(
      'project-1',
      'invitee-1',
      'active',
      { userId: 'creator-1', role: 'investor' },
    );

    expect(projectDoc.pendingInvitations).toHaveLength(1);
    expect(notificationModel).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: 'invitee-1',
        type: 'invitation',
      }),
    );
    expect(result.pendingInvitations).toHaveLength(1);
  });

  it('inviteMember rejects duplicate membership', async () => {
    const projectDoc = makeProjectDoc({
      investors: [{ user: 'u-2', role: 'active' }],
      pendingInvitations: [],
    });
    projectModel.findById.mockResolvedValue(projectDoc);

    await expect(
      service.inviteMember('project-1', 'u-2', 'passive', {
        userId: 'creator-1',
        role: 'admin',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('acceptInvitation moves user from pending to investors', async () => {
    const projectDoc = makeProjectDoc({
      pendingInvitations: [{ userId: 'u-3', role: 'passive' }],
      investors: [],
    });
    projectModel.findById.mockResolvedValueOnce(projectDoc).mockReturnValueOnce(
      mockQuery(
        makeProjectDoc({
          pendingInvitations: [],
          investors: [{ user: 'u-3', role: 'passive' }],
        }),
      ),
    );
    userModel.findById.mockReturnValue(mockQuery({ name: 'User 3' }));

    const result = await service.acceptInvitation('project-1', {
      userId: 'u-3',
      role: 'investor',
    });

    expect(projectDoc.pendingInvitations).toHaveLength(0);
    expect(projectDoc.investors).toHaveLength(1);
    expect(result.investors).toHaveLength(1);
  });

  it('declineInvitation removes pending invitation and returns success', async () => {
    const projectDoc = makeProjectDoc({
      pendingInvitations: [{ userId: 'u-4', role: 'active' }],
    });
    projectModel.findById.mockResolvedValue(projectDoc);

    const result = await service.declineInvitation('project-1', {
      userId: 'u-4',
      role: 'investor',
    });

    expect(projectDoc.pendingInvitations).toHaveLength(0);
    expect(result).toEqual({ success: true });
  });

  it('addMember throws when target is already in investors', async () => {
    const projectDoc = makeProjectDoc({
      investors: [{ user: 'u-5', role: 'active' }],
    });
    projectModel.findById.mockResolvedValue(projectDoc);

    await expect(
      service.addMember('project-1', 'u-5', 'passive', {
        userId: 'creator-1',
        role: 'admin',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('removeMember blocks removal of creator', async () => {
    const projectDoc = makeProjectDoc({
      createdBy: 'creator-1',
      investors: [{ user: 'u-6', role: 'active' }],
    });
    projectModel.findById.mockResolvedValue(projectDoc);

    await expect(
      service.removeMember('project-1', 'creator-1', {
        userId: 'creator-1',
        role: 'investor',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('removeMember throws when investor does not exist', async () => {
    const projectDoc = makeProjectDoc({
      createdBy: 'creator-1',
      investors: [{ user: 'u-7', role: 'active' }],
    });
    projectModel.findById.mockResolvedValue(projectDoc);
    userModel.findById.mockReturnValue(mockQuery({ role: 'investor' }));

    await expect(
      service.removeMember('project-1', 'missing-user', {
        userId: 'creator-1',
        role: 'investor',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('updateMemberRole throws when target investor is not found', async () => {
    const projectDoc = makeProjectDoc({
      investors: [{ user: 'u-8', role: 'active' }],
    });
    projectModel.findById.mockResolvedValue(projectDoc);

    await expect(
      service.updateMemberRole('project-1', 'ghost', 'active', {
        userId: 'creator-1',
        role: 'admin',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('updateMemberRole enforces creator as active', async () => {
    const projectDoc = makeProjectDoc({
      createdBy: 'creator-1',
      investors: [{ user: 'creator-1', role: 'active' }],
    });
    projectModel.findById.mockResolvedValue(projectDoc);
    userModel.findById.mockReturnValue(mockQuery({ role: 'investor' }));

    await expect(
      service.updateMemberRole('project-1', 'creator-1', 'passive', {
        userId: 'creator-1',
        role: 'investor',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('getInviteCandidates excludes creator/investors and guests', async () => {
    const projectDoc = makeProjectDoc({
      createdBy: 'creator-1',
      investors: [{ user: 'u-9', role: 'active' }],
    });
    projectModel.findById.mockResolvedValue(projectDoc);
    userModel.find.mockReturnValue(
      mockQuery([
        { _id: 'candidate-1', name: 'Candidate One', role: 'investor' },
      ]),
    );

    const result = await service.getInviteCandidates('project-1', {
      userId: 'creator-1',
      role: 'investor',
    });

    expect(userModel.find).toHaveBeenCalledWith({
      _id: { $nin: ['creator-1', 'u-9'] },
      role: { $ne: 'guest' },
    });
    expect(result).toHaveLength(1);
  });

  it('update throws for invalid state transition', async () => {
    projectModel.findById.mockResolvedValue(
      makeProjectDoc({ status: 'pending', createdBy: 'creator-1' }),
    );

    await expect(
      service.update(
        'project-1',
        { status: 'active' },
        { userId: 'creator-1', role: 'investor' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('update writes activity notification when status changes', async () => {
    projectModel.findById.mockResolvedValue(
      makeProjectDoc({
        _id: 'project-1',
        name: 'Gamma',
        status: 'pending',
        createdBy: 'creator-1',
      }),
    );
    projectModel.findByIdAndUpdate.mockReturnValue(
      mockQuery({
        _id: 'project-1',
        name: 'Gamma',
        status: 'funding',
        createdBy: 'creator-1',
      }),
    );

    const result = await service.update(
      'project-1',
      { status: 'funding' },
      { userId: 'creator-1', role: 'investor' },
    );

    expect(projectModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'project-1',
      { status: 'funding' },
      { returnDocument: 'after' },
    );
    expect(notificationModel).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: 'creator-1',
        type: 'activity',
      }),
    );
    expect(result?.status).toBe('funding');
  });

  it('getMarketPrices seeds defaults when collection is empty', async () => {
    marketPriceModel.countDocuments.mockResolvedValue(0);
    marketPriceModel.insertMany.mockResolvedValue([]);
    marketPriceModel.find.mockReturnValue(
      mockQuery([{ symbol: 'XAU', isActive: true }]),
    );

    const result = await service.getMarketPrices();

    expect(marketPriceModel.insertMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ symbol: 'XAU', isActive: true }]);
  });

  it('getNews seeds defaults when collection is empty', async () => {
    marketNewsItemModel.countDocuments.mockResolvedValue(0);
    marketNewsItemModel.insertMany.mockResolvedValue([]);
    marketNewsItemModel.find.mockReturnValue(
      mockQuery([{ headline: 'Market update', isActive: true }]),
    );

    const result = await service.getNews();

    expect(marketNewsItemModel.insertMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ headline: 'Market update', isActive: true }]);
  });

  it('updateMarketPrice throws when item is not found', async () => {
    marketPriceModel.findByIdAndUpdate.mockReturnValue(mockQuery(null));

    await expect(
      service.updateMarketPrice('mp-1', { price: 100 } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('updateNewsItem throws when item is not found', async () => {
    marketNewsItemModel.findByIdAndUpdate.mockReturnValue(mockQuery(null));

    await expect(
      service.updateNewsItem('mn-1', { title: 'New' } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
