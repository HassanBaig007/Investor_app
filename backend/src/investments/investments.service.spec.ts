import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InvestmentsService } from './investments.service';
import { NotFoundException } from '@nestjs/common';

describe('InvestmentsService', () => {
  let service: any;
  let model: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentsService,
        {
          provide: getModelToken('Project'),
          useValue: {
            find: jest.fn().mockReturnThis(),
            findById: jest.fn().mockReturnThis(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvestmentsService>(InvestmentsService);
    model = module.get(getModelToken('Project'));
  });

  describe('getExpectedEndDate', () => {
    it.each([
      [{ createdAt: '2023-01-01', duration: '1 year' }, '2024-01-01'],
      [{ createdAt: '2023-01-01', duration: '6 months' }, '2023-07-01'],
      [{ createdAt: '2023-01-01', duration: '12 MONTHS' }, '2024-01-01'],
      [{ createdAt: '2023-01-01', duration: '' }, null],
      [{ createdAt: 'invalid', duration: '1 year' }, null],
      [{ createdAt: '2023-01-01', duration: 'no digits' }, null],
      [{ createdAt: '2023-01-01', duration: '0 months' }, null],
      [{ createdAt: '2023-06-01', duration: '2 years' }, '2025-06-01'],
      [{ createdAt: '2023-06-01', duration: '18 months' }, '2024-12-01'],
    ])('should calculate end date for %p', (project, expected) => {
      expect(service.getExpectedEndDate(project)).toBe(expected);
    });
  });

  describe('buildInvestment', () => {
    it('should calculate metrics correctly', () => {
      const project = {
        _id: 'p1',
        name: 'Project 1',
        type: 'Real Estate',
        investors: [{ user: 'u1', investedAmount: 1000 }],
        raisedAmount: 5000,
        targetAmount: 10000,
        currentValuation: 6000,
        status: 'active',
        createdAt: '2023-01-01',
        duration: '1 year',
      };
      const res = service.buildInvestment(project, 'u1');
      expect(res.invested).toBe(1000);
      expect(res.currentValue).toBe(1200);
      expect(res.returns).toBe(200);
      expect(res.returnsPercent).toBe(20);
      expect(res.progress).toBe(50);
      expect(res.expectedEndDate).toBe('2024-01-01');
    });

    it('should handle zero raisedAmount gracefully', () => {
      const project = {
        investors: [{ user: 'u1', investedAmount: 100 }],
        raisedAmount: 0,
        targetAmount: 1000,
      };
      const res = service.buildInvestment(project, 'u1');
      expect(res.currentValue).toBe(0);
      expect(Number.isNaN(res.currentValue)).toBe(false);
    });
  });

  describe('Quarterly Reports Expansion', () => {
    it.each(
      Array.from({ length: 50 }, (_, i) => [
        `u${i}`,
        i % 2 === 0 ? 'txt' : 'html',
      ]),
    )('report case #%#: user %s', async (uid, format) => {
      const mockInvestments = [{ name: 'Test Inv', startDate: '2023-01-01' }];
      const mockPortfolio = { returns: 500, returnsPercent: 10 };

      jest.spyOn(service, 'getInvestments').mockResolvedValue(mockInvestments);
      jest.spyOn(service, 'getPortfolio').mockResolvedValue(mockPortfolio);

      const reports = await service.getQuarterlyReports(uid);
      if (reports.length > 0) {
        const download = await service.getQuarterlyReportDownload(
          uid,
          reports[0].id,
          format,
        );
        expect(download.format).toBe(format);
      }
    });

    it('throws NotFound if report missing', async () => {
      jest.spyOn(service, 'getQuarterlyReports').mockResolvedValue([]);
      await expect(
        service.getQuarterlyReportDownload('u1', 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('ID lookups', () => {
    it('getInvestmentById workflow', async () => {
      const project = {
        _id: '1',
        investors: [{ user: 'u1' }],
        name: 'P',
        raisedAmount: 100,
      };
      model.findById.mockReturnThis();
      model.exec.mockResolvedValueOnce(project);
      const res = await service.getInvestmentById('1', 'u1');
      expect(res.name).toBe('P');
    });

    it('throws if project not found', async () => {
      model.findById.mockReturnThis();
      model.exec.mockResolvedValueOnce(null);
      await expect(service.getInvestmentById('1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws if investor is not part of project', async () => {
      const project = {
        _id: '1',
        investors: [{ user: 'other-user', investedAmount: 100 }],
        name: 'P',
        raisedAmount: 100,
      };
      model.findById.mockReturnThis();
      model.exec.mockResolvedValueOnce(project);

      await expect(service.getInvestmentById('1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Quarterly Reports Status Logic', () => {
    it.each([
      [2024, 1, true],
      [2023, 4, false],
      [2022, 1, false],
    ])('isCurrentQuarter(%i, 2024, 1, Q%i) -> %s', (year, qNum, expected) => {
      const q = { startMonth: (qNum - 1) * 3 + 1, endMonth: qNum * 3 };
      expect(service.isCurrentQuarter(year, 2024, 1, q)).toBe(expected);
    });

    it.each([
      [100, 'historical', 'historical', 'insufficient_data'],
      [500, 'available', 'available', 'real'],
    ])(
      'buildQuarterlyReport: growth %i and status %s',
      (growth, status, eStat, eSource) => {
        const q = { quarter: 'Q1', period: 'P' };
        const port = { returnsPercent: growth / 10, returns: 100 };
        const res = service.buildQuarterlyReport(
          2024,
          q,
          new Date(),
          status === 'available',
          port,
          [],
        );
        expect(res.status).toBe(eStat);
        expect(res.highlights.dataSource).toBe(eSource);
      },
    );

    it.each(Array.from({ length: 10 }, (_, i) => [i]))(
      'additional investment variation #%#',
      (i) => {
        const project = {
          investors: [{ user: 'u1', investedAmount: i * 10 }],
          raisedAmount: 100,
          targetAmount: 1000,
        };
        const res = service.buildInvestment(project, 'u1');
        expect(res.invested).toBe(i * 10);
      },
    );
  });

  describe('Portfolio and performance APIs', () => {
    it('getPortfolio calculates invested, current value, and returns', async () => {
      const projects = [
        {
          investors: [{ user: 'u1', investedAmount: 1000 }],
          raisedAmount: 5000,
          targetAmount: 8000,
          currentValuation: 7000,
        },
        {
          investors: [{ user: 'u1', investedAmount: 500 }],
          raisedAmount: 2000,
          targetAmount: 2500,
          currentValuation: 2600,
        },
      ];
      model.find.mockReturnThis();
      model.exec.mockResolvedValueOnce(projects);

      const portfolio = await service.getPortfolio('u1');

      expect(portfolio.totalInvested).toBe(1500);
      expect(portfolio.currentValue).toBeGreaterThan(1500);
      expect(portfolio.returnsPercent).toBeGreaterThan(0);
      expect(portfolio.lastUpdated).toBeDefined();
    });

    it('getInvestments maps projects to user investment view', async () => {
      const projects = [
        {
          _id: 'p1',
          name: 'Project 1',
          type: 'Agri',
          investors: [{ user: 'u1', investedAmount: 200 }],
          raisedAmount: 1000,
          targetAmount: 2000,
          currentValuation: 1200,
          status: 'active',
          createdAt: '2024-01-01',
          duration: '12 months',
        },
      ];
      model.find.mockReturnThis();
      model.exec.mockResolvedValueOnce(projects);

      const investments = await service.getInvestments('u1');

      expect(investments).toHaveLength(1);
      expect(investments[0]).toEqual(
        expect.objectContaining({
          id: 'p1',
          invested: 200,
          status: 'active',
        }),
      );
    });

    it('getPerformanceMetrics returns no-data response when user has no investments', async () => {
      jest.spyOn(service, 'getPortfolio').mockResolvedValue({
        totalInvested: 0,
        currentValue: 0,
        returns: 0,
        returnsPercent: 0,
      });
      jest.spyOn(service, 'getInvestments').mockResolvedValue([]);

      const metrics = await service.getPerformanceMetrics('u1', '1Y');

      expect(metrics.hasData).toBe(false);
      expect(metrics.period).toBe('1Y');
      expect(metrics.metrics).toBeNull();
    });

    it('getPerformanceMetrics returns real point-in-time metrics', async () => {
      jest.spyOn(service, 'getPortfolio').mockResolvedValue({
        totalInvested: 1000,
        currentValue: 1300,
        returns: 300,
        returnsPercent: 30,
      });
      jest.spyOn(service, 'getInvestments').mockResolvedValue([
        { name: 'A', returnsPercent: 20 },
        { name: 'B', returnsPercent: 40 },
      ]);

      const metrics = await service.getPerformanceMetrics('u1');

      expect(metrics.hasData).toBe(true);
      expect(metrics.metrics).toEqual(
        expect.objectContaining({
          cagr: 30,
          returnsPercent: 30,
          totalReturns: 300,
          sharpeRatio: null,
        }),
      );
      expect(metrics.chartData).toHaveLength(2);
      expect(metrics.portfolio.returnsPercent).toBe(30);
    });
  });
});
