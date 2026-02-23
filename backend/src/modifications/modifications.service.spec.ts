import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ModificationsService } from './modifications.service';
import { ProjectsService } from '../projects/projects.service';
import { NotificationService } from '../notifications/notifications.service';
import { Types } from 'mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ModificationsService', () => {
  let service: ModificationsService;
  let modificationModel: any;
  let projectsService: any;
  let notificationService: any;

  const mockQuery = (data: any) => ({
    exec: jest.fn().mockResolvedValue(data),
    populate: jest.fn().mockReturnThis(),
    find: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    then: (resolve: any) => resolve(data),
  });

  beforeEach(async () => {
    modificationModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ ...dto, _id: new Types.ObjectId() }),
      populate: jest.fn().mockReturnThis(),
      execPopulate: jest.fn().mockReturnThis(),
      toObject: jest.fn().mockReturnValue(dto),
    }));

    modificationModel.find = jest.fn();
    modificationModel.findById = jest.fn();

    projectsService = {
      findOne: jest.fn(),
    };

    notificationService = {
      sendPush: jest.fn().mockResolvedValue({ delivered: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModificationsService,
        {
          provide: getModelToken('ModificationRequest'),
          useValue: modificationModel,
        },
        { provide: ProjectsService, useValue: projectsService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<ModificationsService>(ModificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Utility Helpers', () => {
    it('getId resolves various inputs', () => {
      const oid = new Types.ObjectId();
      expect((service as any).getId(oid)).toBe(oid.toString());
      expect((service as any).getId('abc')).toBe('abc');
      expect((service as any).getId({ _id: '123' })).toBe('123');
      expect((service as any).getId(null)).toBe('');
    });

    it('getVoteSummary calculates correctly', () => {
      const mod = {
        votes: new Map([
          ['u1', { status: 'approved' }],
          ['u2', { status: 'rejected' }],
        ]),
      };
      const project = {
        investors: [{ role: 'active' }, { role: 'active' }, { role: 'active' }],
      };
      const summary = (service as any).getVoteSummary(mod, project);
      expect(summary.approved).toBe(1);
      expect(summary.rejected).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.total).toBe(3);
    });
  });

  describe('create', () => {
    const mockUser = {
      userId: new Types.ObjectId().toHexString(),
      name: 'User 1',
    };
    const mockProject = {
      _id: new Types.ObjectId(),
      name: 'Project 1',
      investors: [
        { user: mockUser.userId, role: 'active' },
        { user: new Types.ObjectId().toHexString(), role: 'active' },
      ],
    };

    it('throws NotFoundException if project not found', async () => {
      projectsService.findOne.mockResolvedValue(null);
      await expect(service.create({ project: 'p1' }, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('successfully creates modification and notifies investors', async () => {
      projectsService.findOne.mockResolvedValue(mockProject);
      const dto = { project: mockProject._id.toHexString(), type: 'funding' };

      const result = await service.create(dto, mockUser);

      expect(result).toBeDefined();
      expect(notificationService.sendPush).toHaveBeenCalled();
    });
  });

  describe('vote', () => {
    const mockUser = {
      userId: new Types.ObjectId().toHexString(),
      name: 'User 2',
      role: 'investor',
    };
    const mockProject = {
      _id: new Types.ObjectId(),
      name: 'Project 1',
      investors: [
        { user: new Types.ObjectId().toHexString(), role: 'active' },
        { user: mockUser.userId, role: 'active' },
      ],
    };
    let mockMod: any;

    beforeEach(() => {
      mockMod = {
        _id: new Types.ObjectId(),
        status: 'pending',
        project: mockProject._id,
        votes: new Map(),
        save: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnThis(),
      };
      modificationModel.findById.mockReturnValue(mockQuery(mockMod));
      projectsService.findOne.mockResolvedValue(mockProject);
    });

    it('throws ForbiddenException if already approved', async () => {
      mockMod.status = 'approved';
      await expect(
        service.vote('m1', mockUser.userId, 'approved', '', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('handles immediate rejection', async () => {
      await service.vote(
        mockMod._id.toHexString(),
        mockUser.userId,
        'rejected',
        'too expensive',
        mockUser,
      );
      expect(mockMod.status).toBe('rejected');
      expect(mockMod.save).toHaveBeenCalled();
    });

    it('records approval and finalizes if threshold hit', async () => {
      mockMod.votes.set(mockProject.investors[0].user, { status: 'approved' });
      await service.vote(
        mockMod._id.toHexString(),
        mockUser.userId,
        'approved',
        '',
        mockUser,
      );
      expect(mockMod.status).toBe('approved');
    });

    it('throws ForbiddenException if user not an active investor', async () => {
      const guest = {
        userId: new Types.ObjectId().toHexString(),
        role: 'investor',
      };
      await expect(
        service.vote('m1', guest.userId, 'approved', '', guest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows privileged roles to vote', async () => {
      const adminUser = { userId: 'admin1', role: 'admin' };
      await service.vote(
        mockMod._id.toHexString(),
        adminUser.userId,
        'approved',
        '',
        adminUser,
      );
      expect(mockMod.votes.has(adminUser.userId)).toBe(true);
    });
  });

  describe('findAll', () => {
    const pid = new Types.ObjectId();
    const mockUser = { userId: 'u1', role: 'investor' };

    it('returns project mods if allowed access', async () => {
      projectsService.findOne.mockResolvedValue({ _id: pid });
      modificationModel.find.mockReturnValue(
        mockQuery([{ _id: 'm1', project: pid }]),
      );

      const result = await service.findAll(pid.toHexString(), mockUser);
      expect(result).toHaveLength(1);
    });

    it('returns all mods for privileged users when no projectId provided', async () => {
      const admin = { userId: 'a1', role: 'admin' };
      modificationModel.find.mockReturnValue(
        mockQuery([{ _id: 'm1' }, { _id: 'm2' }]),
      );

      const result = await service.findAll(undefined, admin);
      expect(result).toHaveLength(2);
    });

    it('returns empty for non-privileged users without projectId', async () => {
      const result = await service.findAll(undefined, mockUser);
      expect(result).toEqual([]);
    });
  });
});
