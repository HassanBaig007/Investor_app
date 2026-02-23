import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed-value'),
  compare: jest.fn(),
}));

const mockExecQuery = (result: any) => ({
  exec: jest.fn().mockResolvedValue(result),
});

describe('UsersService (account + export flows)', () => {
  let service: UsersService;
  let userModel: any;
  let projectModel: any;
  let spendingModel: any;
  let modificationModel: any;
  let notificationModel: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };
    projectModel = {
      updateMany: jest.fn(),
      find: jest.fn(),
    };
    spendingModel = {
      find: jest.fn(),
    };
    modificationModel = {
      find: jest.fn(),
    };
    notificationModel = {
      find: jest.fn(),
      deleteMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken('User'), useValue: userModel },
        { provide: getModelToken('Project'), useValue: projectModel },
        { provide: getModelToken('Spending'), useValue: spendingModel },
        {
          provide: getModelToken('ModificationRequest'),
          useValue: modificationModel,
        },
        { provide: getModelToken('Notification'), useValue: notificationModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('findOne normalizes email before querying', async () => {
    userModel.findOne.mockReturnValue(mockExecQuery({ _id: 'u1' }));

    await service.findOne('  USER@Example.COM ');

    expect(userModel.findOne).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
  });

  it('findBySocialSub queries provider-specific field', async () => {
    userModel.findOne.mockReturnValue(mockExecQuery({ _id: 'u2' }));

    await service.findBySocialSub('google', 'google-sub');
    await service.findBySocialSub('apple', 'apple-sub');

    expect(userModel.findOne).toHaveBeenNthCalledWith(1, {
      googleSub: 'google-sub',
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(2, {
      appleSub: 'apple-sub',
    });
  });

  it('findAll delegates directly to user model', async () => {
    userModel.find.mockReturnValue(mockExecQuery([{ _id: 'u1' }]));

    const result = await service.findAll();

    expect(result).toHaveLength(1);
  });

  it('update, settings and notification prefs use returnDocument after', async () => {
    userModel.findByIdAndUpdate.mockReturnValue(mockExecQuery({ _id: 'u1' }));

    await service.update('u1', { name: 'Updated' });
    await service.updateSettings('u1', { theme: 'dark' });
    await service.updateNotificationPrefs('u1', { pushEnabled: false });

    expect(userModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      1,
      'u1',
      { name: 'Updated' },
      { returnDocument: 'after' },
    );
    expect(userModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      2,
      'u1',
      { settings: { theme: 'dark' } },
      { returnDocument: 'after' },
    );
    expect(userModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      3,
      'u1',
      { 'settings.notifications': { pushEnabled: false } },
      { returnDocument: 'after' },
    );
  });

  it('setRefreshTokenHash and clearRefreshTokenHash use returnDocument before', async () => {
    userModel.findByIdAndUpdate.mockReturnValue(mockExecQuery({ _id: 'u1' }));

    await service.setRefreshTokenHash('u1', 'rth');
    await service.clearRefreshTokenHash('u1');

    expect(userModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      1,
      'u1',
      { refreshTokenHash: 'rth' },
      { returnDocument: 'before' },
    );
    expect(userModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      2,
      'u1',
      { refreshTokenHash: null },
      { returnDocument: 'before' },
    );
  });

  it('countInvestors delegates with investor role filter', async () => {
    userModel.countDocuments.mockReturnValue(mockExecQuery(12));

    const count = await service.countInvestors();

    expect(userModel.countDocuments).toHaveBeenCalledWith({ role: 'investor' });
    expect(count).toBe(12);
  });

  it('deleteAccount throws NotFoundException when user does not exist', async () => {
    userModel.findById.mockReturnValue(mockExecQuery(null));

    await expect(service.deleteAccount('u404', 'x')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deleteAccount throws BadRequestException when password check fails', async () => {
    userModel.findById.mockReturnValue(
      mockExecQuery({ _id: 'u1', passwordHash: 'stored' }),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.deleteAccount('u1', 'wrong')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deleteAccount anonymizes user and performs cleanup cascade', async () => {
    const existingUser = { _id: 'u1', passwordHash: 'stored-hash' };
    userModel.findById.mockReturnValue(mockExecQuery(existingUser));
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    userModel.findByIdAndUpdate.mockReturnValue(mockExecQuery({ _id: 'u1' }));
    projectModel.updateMany.mockReturnValue(
      mockExecQuery({ modifiedCount: 2 }),
    );
    notificationModel.deleteMany.mockResolvedValue({ deletedCount: 4 });

    const result = await service.deleteAccount('u1', 'valid-password');

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'valid-password',
      'stored-hash',
    );
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        name: 'Deleted User',
        email: 'deleted_u1@removed.local',
        role: 'guest',
        kycVerified: false,
        deletedAt: expect.any(Date),
      }),
    );
    expect(projectModel.updateMany).toHaveBeenCalledWith(
      { 'investors.user': 'u1' },
      { $pull: { investors: { user: 'u1' } } },
    );
    expect(notificationModel.deleteMany).toHaveBeenCalledWith({
      recipient: 'u1',
    });
    expect(result).toEqual({ deleted: true });
  });

  it('exportUserData throws NotFoundException when user is missing', async () => {
    userModel.findById.mockReturnValue(mockExecQuery(null));

    await expect(service.exportUserData('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('exportUserData returns sanitized profile and structured data sections', async () => {
    const user = {
      _id: 'u1',
      email: 'u1@example.com',
      passwordHash: 'secret',
      toObject: () => ({
        _id: 'u1',
        email: 'u1@example.com',
        passwordHash: 'secret',
        role: 'investor',
      }),
    };
    userModel.findById.mockReturnValue(mockExecQuery(user));

    const projectFindChain = (rows: any[]) => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(rows),
    });
    projectModel.find
      .mockReturnValueOnce(
        projectFindChain([
          {
            _id: 'p1',
            name: 'Project One',
            type: 'agri',
            status: 'active',
            investors: [{ user: 'u1', role: 'active', investedAmount: 500 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]),
      )
      .mockReturnValueOnce(
        projectFindChain([{ _id: 'p2', name: 'Created Project' }]),
      );

    spendingModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 's1', amount: 100 }]),
    });
    modificationModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'm1' }]),
    });
    notificationModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'n1' }]),
    });

    const result = await service.exportUserData('u1');

    expect(result.exportVersion).toBe('2.0');
    expect(result.userData.profile.passwordHash).toBeUndefined();
    expect(result.userData.memberships).toEqual([
      expect.objectContaining({
        projectId: 'p1',
        projectName: 'Project One',
        investedAmount: 500,
      }),
    ]);
    expect(result.userData.createdProjects).toHaveLength(1);
    expect(result.userData.financialActivity.spendings).toHaveLength(1);
    expect(result.userData.governanceActivity.modifications).toHaveLength(1);
    expect(result.userData.notifications).toHaveLength(1);
  });

  it('registerPushToken stores token and update timestamp', async () => {
    userModel.findByIdAndUpdate.mockReturnValue(mockExecQuery({ _id: 'u1' }));

    const result = await service.registerPushToken('u1', 'ExponentToken');

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        'settings.pushToken': 'ExponentToken',
        'settings.pushTokenUpdatedAt': expect.any(Date),
      }),
    );
    expect(result).toEqual({ registered: true });
  });
});
