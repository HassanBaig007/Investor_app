import { Test, TestingModule } from '@nestjs/testing';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

describe('FinanceController', () => {
  let controller: FinanceController;

  const mockFinanceService = {
    addSpending: jest.fn(),
    voteSpending: jest.fn(),
    searchSpendings: jest.fn(),
    findAll: jest.fn(),
    createLedger: jest.fn(),
    findAllLedgers: jest.fn(),
    findOneLedger: jest.fn(),
    updateLedger: jest.fn(),
    deleteLedger: jest.fn(),
    getMyExpenses: jest.fn(),
    getExpenseAnalytics: jest.fn(),
    getMyPendingApprovals: jest.fn(),
    getSpendingSummary: jest.fn(),
    getBulkSpendingSummary: jest.fn(),
    exportExpenses: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [{ provide: FinanceService, useValue: mockFinanceService }],
    }).compile();

    controller = module.get<FinanceController>(FinanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // addSpending
  // ═══════════════════════════════════════════════════════════════════
  describe('addSpending', () => {
    it('delegates to financeService.addSpending', async () => {
      const mockReq = { user: { userId: 'u1' } };
      const dto = { projectId: 'p1', amount: 500, description: 'Test' } as any;
      mockFinanceService.addSpending.mockResolvedValue({ _id: 's1', ...dto });

      const result = await controller.addSpending(mockReq, dto);

      expect(mockFinanceService.addSpending).toHaveBeenCalledWith(
        dto,
        mockReq.user,
      );
      expect(result).toEqual({ _id: 's1', ...dto });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // voteSpending
  // ═══════════════════════════════════════════════════════════════════
  describe('voteSpending', () => {
    it('delegates to financeService.voteSpending passing the approval properties', async () => {
      const mockReq = { user: { userId: 'u1', role: 'investor' } };
      const vote = 'approved';

      mockFinanceService.voteSpending.mockResolvedValue({ success: true });

      const result = await controller.voteSpending(mockReq, 's1', vote);

      expect(mockFinanceService.voteSpending).toHaveBeenCalledWith(
        's1',
        'u1',
        vote,
        mockReq.user,
      );
      expect(result).toEqual({ success: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // createLedger
  // ═══════════════════════════════════════════════════════════════════
  describe('createLedger', () => {
    it('delegates to financeService.createLedger', async () => {
      const mockReq = { user: { userId: 'u1' } };
      const dto = {
        projectId: 'p1',
        amount: 100000,
        type: 'CAPITAL_CALL',
      } as any;

      mockFinanceService.createLedger.mockResolvedValue({ _id: 'l1' });

      const result = await controller.createLedger(mockReq, dto);

      expect(mockFinanceService.createLedger).toHaveBeenCalledWith(
        dto,
        mockReq.user,
      );
      expect(result).toEqual({ _id: 'l1' });
    });
  });

  describe('spending list/search endpoints', () => {
    it('searchSpendings parses page and limit as numbers', async () => {
      mockFinanceService.searchSpendings.mockResolvedValue({
        spendings: [{ _id: 's1' }],
        total: 1,
      });

      const result = await controller.searchSpendings(
        { user: { userId: 'u1', role: 'investor' } } as any,
        'p1',
        'lunch',
        'approved,pending',
        '2',
        '25',
      );

      expect(mockFinanceService.searchSpendings).toHaveBeenCalledWith(
        'p1',
        { userId: 'u1', role: 'investor' },
        {
          search: 'lunch',
          status: 'approved,pending',
          page: 2,
          limit: 25,
        },
      );
      expect(result.total).toBe(1);
    });

    it('findAll passes filters through unchanged', async () => {
      mockFinanceService.findAll.mockResolvedValue([{ _id: 's2' }]);

      const result = await controller.findAll(
        { user: { userId: 'u2' } } as any,
        'project-1',
        'owner-1',
        'approved',
        '2026-01-01',
        '2026-02-01',
      );

      expect(mockFinanceService.findAll).toHaveBeenCalledWith(
        'project-1',
        { userId: 'u2' },
        {
          ownerUserId: 'owner-1',
          status: 'approved',
          fromDate: '2026-01-01',
          toDate: '2026-02-01',
        },
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('ledger endpoints', () => {
    it('findAllLedgers delegates to service', async () => {
      mockFinanceService.findAllLedgers.mockResolvedValue([{ _id: 'l1' }]);

      const result = await controller.findAllLedgers(
        { user: { userId: 'u1' } } as any,
        'p1',
      );

      expect(mockFinanceService.findAllLedgers).toHaveBeenCalledWith('p1', {
        userId: 'u1',
      });
      expect(result).toEqual([{ _id: 'l1' }]);
    });

    it('findOneLedger delegates to service', async () => {
      mockFinanceService.findOneLedger.mockResolvedValue({ _id: 'l2' });

      const result = await controller.findOneLedger(
        { user: { userId: 'u1' } } as any,
        'l2',
      );

      expect(mockFinanceService.findOneLedger).toHaveBeenCalledWith('l2', {
        userId: 'u1',
      });
      expect(result).toEqual({ _id: 'l2' });
    });

    it('updateLedger delegates to service', async () => {
      mockFinanceService.updateLedger.mockResolvedValue({
        _id: 'l3',
        name: 'Updated',
      });

      const result = await controller.updateLedger(
        { user: { userId: 'u1' } } as any,
        'l3',
        { name: 'Updated' },
      );

      expect(mockFinanceService.updateLedger).toHaveBeenCalledWith(
        'l3',
        { name: 'Updated' },
        { userId: 'u1' },
      );
      expect(result.name).toBe('Updated');
    });

    it('deleteLedger delegates to service', async () => {
      mockFinanceService.deleteLedger.mockResolvedValue({ deleted: true });

      const result = await controller.deleteLedger(
        { user: { userId: 'u1' } } as any,
        'l4',
      );

      expect(mockFinanceService.deleteLedger).toHaveBeenCalledWith('l4', {
        userId: 'u1',
      });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('consolidated finance endpoints', () => {
    it('getMyExpenses parses pagination values', async () => {
      mockFinanceService.getMyExpenses.mockResolvedValue({
        expenses: [],
        total: 0,
      });

      const result = await controller.getMyExpenses(
        { user: { userId: 'u1', role: 'investor' } } as any,
        {
          fromDate: '2026-01-01',
          toDate: '2026-02-01',
          category: 'Materials',
          projectId: 'p1',
          ledgerId: 'l1',
          subLedger: 'S1',
          page: '3',
          limit: '40',
        },
      );

      expect(mockFinanceService.getMyExpenses).toHaveBeenCalledWith(
        { userId: 'u1', role: 'investor' },
        {
          fromDate: '2026-01-01',
          toDate: '2026-02-01',
          category: 'Materials',
          projectId: 'p1',
          ledgerId: 'l1',
          subLedger: 'S1',
          page: 3,
          limit: 40,
        },
      );
      expect(result.total).toBe(0);
    });

    it('getExpenseAnalytics forwards date filters', async () => {
      mockFinanceService.getExpenseAnalytics.mockResolvedValue({
        totalSpent: 1000,
      });

      const result = await controller.getExpenseAnalytics(
        { user: { userId: 'u1' } } as any,
        '2026-01-01',
        '2026-01-31',
      );

      expect(mockFinanceService.getExpenseAnalytics).toHaveBeenCalledWith(
        { userId: 'u1' },
        { fromDate: '2026-01-01', toDate: '2026-01-31' },
      );
      expect(result.totalSpent).toBe(1000);
    });

    it('getMyPendingApprovals delegates to service', async () => {
      mockFinanceService.getMyPendingApprovals.mockResolvedValue([]);

      const result = await controller.getMyPendingApprovals({
        user: { userId: 'u1' },
      } as any);

      expect(mockFinanceService.getMyPendingApprovals).toHaveBeenCalledWith({
        userId: 'u1',
      });
      expect(result).toEqual([]);
    });

    it('getSpendingSummary delegates to service', async () => {
      mockFinanceService.getSpendingSummary.mockResolvedValue({
        approvedSpent: 500,
      });

      const result = await controller.getSpendingSummary(
        { user: { userId: 'u1' } } as any,
        'p1',
      );

      expect(mockFinanceService.getSpendingSummary).toHaveBeenCalledWith('p1', {
        userId: 'u1',
      });
      expect(result.approvedSpent).toBe(500);
    });

    it('getBulkSpendingSummary splits and trims comma-separated IDs', async () => {
      mockFinanceService.getBulkSpendingSummary.mockResolvedValue({
        summaries: [{ projectId: 'p1' }, { projectId: 'p2' }],
      });

      const result = await controller.getBulkSpendingSummary(
        { user: { userId: 'u1' } } as any,
        ' p1, p2 ,,',
      );

      expect(mockFinanceService.getBulkSpendingSummary).toHaveBeenCalledWith(
        ['p1', 'p2'],
        { userId: 'u1' },
      );
      expect(result.summaries).toHaveLength(2);
    });

    it('exportExpenses maps query filters and format', async () => {
      mockFinanceService.exportExpenses.mockResolvedValue({
        format: 'csv',
        content: 'a,b,c',
      });

      const result = await controller.exportExpenses(
        { user: { userId: 'u1' } } as any,
        {
          format: 'csv',
          fromDate: '2026-01-01',
          toDate: '2026-02-01',
          projectId: 'p10',
          ledgerId: 'l10',
          subLedger: 'Sub',
        },
      );

      expect(mockFinanceService.exportExpenses).toHaveBeenCalledWith(
        { userId: 'u1' },
        'csv',
        {
          fromDate: '2026-01-01',
          toDate: '2026-02-01',
          projectId: 'p10',
          ledgerId: 'l10',
          subLedger: 'Sub',
        },
      );
      expect(result.format).toBe('csv');
    });
  });
});
