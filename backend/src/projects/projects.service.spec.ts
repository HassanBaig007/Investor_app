import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: any; // using any to access private methods for pure logic testing

  beforeEach(async () => {
    // Mock dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken('Project'), useValue: {} },
        { provide: getModelToken('MarketPrice'), useValue: {} },
        { provide: getModelToken('MarketNewsItem'), useValue: {} },
        { provide: getModelToken('User'), useValue: {} },
        { provide: getModelToken('Notification'), useValue: {} },
        { provide: getModelToken('Spending'), useValue: {} },
        { provide: getModelToken('Ledger'), useValue: {} },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // Pure Logic Helpers
  // ═══════════════════════════════════════════════════════════════════
  describe('getRefId', () => {
    it('should extract string from ObjectId-like objects', () => {
      expect(service.getRefId({ _id: '123' })).toBe('123');
      expect(service.getRefId({ id: '456' })).toBe('456');
    });

    it('should return string as-is', () => {
      expect(service.getRefId('789')).toBe('789');
    });

    it('should return empty string for falsy values', () => {
      expect(service.getRefId(null)).toBe('');
      expect(service.getRefId(undefined)).toBe('');
    });
  });

  describe('isPrivilegedRole', () => {
    it.each([
      ['admin', true],
      ['project_admin', true],
      ['super_admin', true],
      ['investor', false],
      ['guest', false],
      [null, false],
      ['', false],
    ])('role %s -> privileged: %s', (role, expected) => {
      expect(service.isPrivilegedRole(role)).toBe(expected);
    });
  });

  describe('getActorContext', () => {
    it('should extract userId and role', () => {
      const user = { userId: 'u1', role: 'admin' };
      expect(service.getActorContext(user)).toEqual(user);
    });

    it('should handle null actors', () => {
      expect(service.getActorContext(null)).toEqual({
        userId: '',
        role: undefined,
      });
      expect(service.getActorContext(undefined)).toEqual({
        userId: '',
        role: undefined,
      });
    });
  });

  describe('isProjectMember', () => {
    const project = {
      createdBy: 'u1',
      investors: [{ user: 'u2' }, { user: 'u3' }],
    };

    it('should return true for creator', () => {
      expect(service.isProjectMember(project, 'u1')).toBe(true);
    });

    it('should return true for investors', () => {
      expect(service.isProjectMember(project, 'u2')).toBe(true);
      expect(service.isProjectMember(project, 'u3')).toBe(true);
    });

    it('should return false for others', () => {
      expect(service.isProjectMember(project, 'u4')).toBe(false);
    });
  });

  describe('assertCanManageMembers', () => {
    const project = { createdBy: 'u1' };

    it('should not throw for creator', () => {
      expect(() =>
        service.assertCanManageMembers(project, {
          userId: 'u1',
          role: 'investor',
        }),
      ).not.toThrow();
    });

    it('should not throw for admin', () => {
      expect(() =>
        service.assertCanManageMembers(project, {
          userId: 'u2',
          role: 'admin',
        }),
      ).not.toThrow();
    });

    it('should throw ForbiddenException for others', () => {
      expect(() =>
        service.assertCanManageMembers(project, {
          userId: 'u2',
          role: 'investor',
        }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('CSV escaping', () => {
    it.each([
      ['abc', 'abc'],
      ['"quote"', '"""quote"""'],
      ['a,b,c', '"a,b,c"'],
      ['line1\nline2', '"line1\nline2"'],
      [100, '100'],
      [true, 'true'],
      [null, ''],
    ])('escapeCsvCell edge cases: %p -> %s', (input, expected) => {
      expect(service.escapeCsvCell(input)).toBe(expected);
    });
  });

  describe('filename generation', () => {
    it('should sanitize names for files', () => {
      const name = "John's Project @ 2024!";
      const res = service.buildProjectExportFileName(name, 'csv');
      expect(res).toMatch(
        /^splitflow_john-s-project-2024_details_\d{4}-\d{2}-\d{2}\.csv$/,
      );
    });

    it('should fallback to project if name is empty', () => {
      expect(service.buildProjectExportFileName('', 'xlsx')).toContain(
        'splitflow_project_details',
      );
    });
  });

  describe('VALID_TRANSITIONS exhaustive', () => {
    it.each([
      ['pending', 'funding', true],
      ['pending', 'completed', true],
      ['pending', 'active', false],
      ['funding', 'active', true],
      ['funding', 'completed', true],
      ['funding', 'pending', false],
      ['active', 'completed', true],
      ['active', 'funding', false],
      ['completed', 'active', false],
    ])('transition %s -> %s should be %s', (from, to, allowed) => {
      const valid = service.VALID_TRANSITIONS[from] || [];
      expect(valid.includes(to)).toBe(allowed);
    });
  });

  describe('exportProjectDetails data-driven', () => {
    it.each(
      Array.from({ length: 30 }, (_, i) => [
        i % 2 === 0 ? 'csv' : 'xlsx',
        i, // number of spendings
      ]),
    )('export format %s with %i spendings', async (format, count) => {
      const project = { _id: 'p1', name: 'P', investors: [], createdBy: 'u1' };
      jest.spyOn(service, 'findOne').mockResolvedValue(project);

      // Mock models
      service.ledgerModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      service.spendingModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockResolvedValue(
            new Array(count).fill({ amount: 100, status: 'approved' }),
          ),
      });

      const res = await service.exportProjectDetails(
        'p1',
        { userId: 'u1' },
        format,
      );
      expect(res.format).toBe(format);
      if (format === 'csv') {
        expect(res.content).toContain('SplitFlow Project Details Export');
      }
    });

    it('throws error for unsupported format', async () => {
      await expect(
        service.exportProjectDetails('p1', {}, 'pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Actor Context & Membership stress', () => {
    it.each(
      Array.from({ length: 15 }, (_, i) => [
        {
          userId: `u${i}`,
          id: `id${i}`,
          role: i % 2 === 0 ? 'admin' : 'investor',
        },
      ]),
    )('actor context for case %j', (user) => {
      const res = service.getActorContext(user);
      expect(res.userId).toBeDefined();
      expect(res.role).toBe(user.role);
    });

    it.each(
      Array.from({ length: 15 }, (_, i) => [
        { createdBy: 'u1', investors: [{ user: `u${i}` }] },
        `u${i}`,
        true,
      ]),
    )('membership check case #%#', (project, uid, expected) => {
      expect(service.isProjectMember(project, uid)).toBe(expected);
    });
  });
});
