import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FinanceService } from './finance.service';
import { ProjectsService } from '../projects/projects.service';
import { NotificationService } from '../notifications/notifications.service';
import { Types } from 'mongoose';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('FinanceService', () => {
  let service: any;
  let spendingModel: any;
  let ledgerModel: any;
  let projectsService: any;
  let notificationService: any;

  const mockQuery = (result: any) => {
    const query: any = {
      populate: jest.fn(() => query),
      sort: jest.fn(() => query),
      skip: jest.fn(() => query),
      limit: jest.fn(() => query),
      exec: jest.fn().mockResolvedValue(result),
      then: function (resolve: any, reject?: any) {
        return query.exec().then(resolve, reject);
      },
    };
    return query;
  };

  beforeEach(async () => {
    spendingModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ ...dto, _id: new Types.ObjectId() }),
      populate: jest.fn().mockReturnThis(),
      execPopulate: jest.fn().mockReturnThis(),
      toObject: jest.fn().mockReturnValue(dto),
    }));

    spendingModel.find = jest.fn();
    spendingModel.findById = jest.fn();
    spendingModel.findOneAndUpdate = jest.fn();
    spendingModel.create = jest.fn();
    spendingModel.aggregate = jest.fn();
    spendingModel.countDocuments = jest.fn();

    const LedgerModel = function (this: any, dto: any) {
      Object.assign(this, dto);
      this.save = jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(), ...dto });
    };
    ledgerModel = LedgerModel as any;
    ledgerModel.find = jest.fn();
    ledgerModel.findById = jest.fn();
    ledgerModel.findOne = jest.fn();
    ledgerModel.findByIdAndUpdate = jest.fn();
    ledgerModel.findByIdAndDelete = jest.fn();

    projectsService = {
      findOne: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
    };

    notificationService = {
      sendPush: jest.fn().mockResolvedValue({ delivered: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: getModelToken('Spending'), useValue: spendingModel },
        { provide: getModelToken('Ledger'), useValue: ledgerModel },
        { provide: ProjectsService, useValue: projectsService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════
  describe('Utility Helpers', () => {
    it('getId resolves strings, objects, and objectids', () => {
      const oid = new Types.ObjectId();
      expect(service.getId(oid)).toBe(oid.toString());
      expect(service.getId('123')).toBe('123');
      expect(service.getId({ _id: '456' })).toBe('456');
      expect(service.getId(null)).toBe('');
    });

    it('isPrivilegedRole identifies admin roles', () => {
      expect(service.isPrivilegedRole('admin')).toBe(true);
      expect(service.isPrivilegedRole('super_admin')).toBe(true);
      expect(service.isPrivilegedRole('investor')).toBe(false);
    });

    it('parseStatusFilter handles varied inputs', () => {
      expect(
        service.parseStatusFilter('approved,pending').has('approved'),
      ).toBe(true);
      expect(service.parseStatusFilter('').size).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // addSpending
  // ═══════════════════════════════════════════════════════════════════
  describe('addSpending', () => {
    const mockUser = {
      userId: new Types.ObjectId().toHexString(),
      role: 'investor',
      name: 'User 1',
    };
    const mockProject = {
      _id: new Types.ObjectId(),
      name: 'Project 1',
      investors: [
        { user: mockUser.userId, role: 'active' },
        { user: new Types.ObjectId().toHexString(), role: 'active' },
      ],
      targetAmount: 1000,
    };

    it('throws NotFoundException if project not found', async () => {
      projectsService.findOne.mockResolvedValue(null);
      await expect(
        service.addSpending({ projectId: 'p1' }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('successfully creates spending and notifies investors', async () => {
      projectsService.findOne.mockResolvedValue(mockProject);
      spendingModel.find.mockReturnValue(mockQuery([]));
      ledgerModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() });

      const dto = {
        projectId: mockProject._id.toHexString(),
        amount: 100,
        category: 'Product',
        materialType: 'Lunch',
      };

      const result = await service.addSpending(dto, mockUser);
      expect(result).toBeDefined();
    });

    it('enforces positive spending amount', async () => {
      projectsService.findOne.mockResolvedValue(mockProject);
      await expect(
        service.addSpending({ projectId: 'p1', amount: -10 }, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws error if spending exceeds project capacity', async () => {
      projectsService.findOne.mockResolvedValue({
        ...mockProject,
        targetAmount: 50,
      });
      spendingModel.find.mockReturnValue(mockQuery([{ amount: 60 }]));

      await expect(
        service.addSpending({ projectId: 'p1', amount: 100 }, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // voteSpending
  // ═══════════════════════════════════════════════════════════════════
  describe('voteSpending', () => {
    const mockUser = {
      userId: new Types.ObjectId().toHexString(),
      role: 'investor',
      name: 'User 2',
    };
    const mockProject = {
      _id: new Types.ObjectId(),
      investors: [
        { user: new Types.ObjectId().toHexString(), role: 'active' },
        { user: mockUser.userId, role: 'active' },
      ],
    };

    let mockSpending: any;

    beforeEach(() => {
      mockSpending = {
        _id: new Types.ObjectId(),
        status: 'pending',
        amount: 100,
        project: mockProject._id,
        approvals: new Map(),
        save: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnThis(),
      };
      spendingModel.findById.mockReturnValue(mockQuery(mockSpending));
      projectsService.findOne.mockResolvedValue(mockProject);
    });

    it('throws BadRequestException if already finalized', async () => {
      mockSpending.status = 'approved';
      await expect(
        service.voteSpending('s1', mockUser.userId, 'approved', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('records an approval vote and finalizes if threshold reached', async () => {
      mockSpending.approvals.set(mockProject.investors[0].user, {
        status: 'approved',
      });
      await service.voteSpending(
        mockSpending._id.toString(),
        mockUser.userId,
        'approved',
        mockUser,
      );

      expect(mockSpending.status).toBe('approved');
      expect(mockSpending.save).toHaveBeenCalled();
    });

    it('records a rejection and finalizes immediately', async () => {
      await service.voteSpending(
        mockSpending._id.toString(),
        mockUser.userId,
        'rejected',
        mockUser,
      );

      expect(mockSpending.status).toBe('rejected');
      expect(mockSpending.save).toHaveBeenCalled();
    });

    it('throws ForbiddenException if user is not an active investor', async () => {
      const guestUser = {
        userId: new Types.ObjectId().toHexString(),
        role: 'investor',
      };
      await expect(
        service.voteSpending('s1', guestUser.userId, 'approved', guestUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════
  describe('findAll', () => {
    const mockUser = {
      userId: new Types.ObjectId().toHexString(),
      role: 'investor',
    };
    const pid = new Types.ObjectId();
    const mockSpendings = [
      { _id: 's1', status: 'approved', amount: 100, project: pid },
      { _id: 's2', status: 'pending', amount: 50, project: pid },
    ];

    it('returns all spendings for a project with enrichment', async () => {
      projectsService.findOne.mockResolvedValue({
        _id: pid,
        investors: [{ user: mockUser.userId, role: 'active' }],
      });
      spendingModel.find.mockReturnValue(mockQuery(mockSpendings));

      const result = await service.findAll(pid.toHexString(), mockUser);
      expect(result).toHaveLength(2);
    });

    it('filters spendings by status', async () => {
      projectsService.findOne.mockResolvedValue({
        _id: pid,
        investors: [{ user: mockUser.userId, role: 'active' }],
      });
      spendingModel.find.mockReturnValue(
        mockQuery(mockSpendings.map((s) => ({ ...s, toObject: () => s }))),
      );

      const result = await service.findAll(pid.toHexString(), mockUser, {
        status: 'approved',
      });
      expect(result.every((s: any) => s.status === 'approved')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Controller Delegations / Other Methods
  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // searchSpendings
  // ═══════════════════════════════════════════════════════════════════
  describe('searchSpendings', () => {
    it('performs paginated search', async () => {
      const pid = new Types.ObjectId();
      projectsService.findOne.mockResolvedValue({ _id: pid, investors: [] });
      spendingModel.find.mockReturnValue(mockQuery([{ _id: 's1' }]));
      spendingModel.countDocuments.mockReturnValue(mockQuery(1));

      const result = await service.searchSpendings(
        pid.toHexString(),
        { userId: 'u1', role: 'admin' },
        { search: 'test', page: 1 },
      );
      expect(result.spendings).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Ledger Methods
  // ═══════════════════════════════════════════════════════════════════
  describe('Ledgers', () => {
    const mockUser = { userId: 'u1', role: 'admin' };
    const lid = new Types.ObjectId();
    const mockProject = {
      _id: new Types.ObjectId(),
      name: 'Project 1',
      investors: [],
    };
    const pid = mockProject._id.toHexString();

    beforeEach(() => {
      projectsService.findOne.mockResolvedValue(mockProject);
    });

    it('creates a ledger', async () => {
      const dto = { projectId: pid, name: 'L1' };
      const res = await service.createLedger(dto, mockUser);
      expect(res).toBeDefined();
    });

    it('findAllLedgers returns ledgers for project', async () => {
      ledgerModel.find.mockReturnValue(mockQuery([{ _id: lid }]));
      const res = await service.findAllLedgers(pid, mockUser);
      expect(res).toHaveLength(1);
    });

    it('findOneLedger returns single ledger', async () => {
      ledgerModel.findById.mockReturnValue(
        mockQuery({ _id: lid, project: pid }),
      );
      const res = await service.findOneLedger(lid.toHexString(), mockUser);
      expect(res).toBeDefined();
    });

    it('updateLedger updates ledger', async () => {
      ledgerModel.findById.mockReturnValue(
        mockQuery({ _id: lid, project: pid }),
      );
      ledgerModel.findByIdAndUpdate.mockReturnValue(
        mockQuery({ _id: lid, project: pid }),
      );
      const res = await service.updateLedger(
        lid.toHexString(),
        { name: 'New' },
        mockUser,
      );
      expect(res).toBeDefined();
    });

    it('deleteLedger deletes ledger', async () => {
      ledgerModel.findById.mockReturnValue(
        mockQuery({ _id: lid, project: pid }),
      );
      ledgerModel.findByIdAndDelete.mockReturnValue(mockQuery({ _id: lid }));
      const res = await service.deleteLedger(lid.toHexString(), mockUser);
      expect(res.deleted).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Analytics & Summary
  // ═══════════════════════════════════════════════════════════════════
  describe('Analytics & Summary', () => {
    const mockUser = { userId: new Types.ObjectId().toHexString() };

    it('getExpenseAnalytics returns formatted analytics', async () => {
      projectsService.findAll.mockResolvedValue([{ _id: 'p1' }]);
      spendingModel.find.mockReturnValue(
        mockQuery([
          { amount: 100, category: 'Product', createdAt: new Date() },
        ]),
      );

      const res = await service.getExpenseAnalytics({
        ...mockUser,
        role: 'admin',
      });
      expect(res.totalSpent).toBeDefined();
    });

    it('getSpendingSummary returns totals', async () => {
      const pid = new Types.ObjectId();
      projectsService.findOne.mockResolvedValue({
        _id: pid,
        name: 'P',
        targetAmount: 1000,
      });
      spendingModel.find.mockReturnValue(
        mockQuery([{ amount: 50, status: 'approved' }]),
      );
      const res = await service.getSpendingSummary(pid.toHexString(), {
        ...mockUser,
        role: 'admin',
      });
      expect(res.approvedSpent).toBe(50);
    });

    it('getBulkSpendingSummary returns multiple summaries', async () => {
      const p1 = new Types.ObjectId();
      projectsService.findAll.mockResolvedValue([{ _id: p1, name: 'P1' }]);
      spendingModel.aggregate.mockResolvedValue([
        { _id: { project: p1, status: 'approved' }, amount: 100, count: 1 },
      ]);

      const res = await service.getBulkSpendingSummary([p1.toHexString()], {
        userId: 'u1',
      });
      expect(res.summaries).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Exports
  // ═══════════════════════════════════════════════════════════════════
  describe('exportExpenses extension', () => {
    it('handles different formats and filters', async () => {
      const mockUser = { userId: new Types.ObjectId().toHexString() };
      projectsService.findAll.mockResolvedValue([]);
      spendingModel.find.mockReturnValue(mockQuery([]));

      const csvRes = await service.exportExpenses(mockUser, 'csv', {
        subLedger: 'test',
      });
      expect(csvRes).toBeDefined();

      const xlsRes = await service.exportExpenses(mockUser, 'xlsx');
      expect(xlsRes).toBeDefined();
    });
  });
});
