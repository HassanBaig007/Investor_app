import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { PrivacyInterceptor } from './privacy.interceptor';
import { PrivacyService } from './privacy.service';

describe('PrivacyInterceptor', () => {
  let interceptor: PrivacyInterceptor;
  let privacyService: { getVisibleInvestorData: jest.Mock };

  const makeContext = (user: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  const makeNext = (data: any) => {
    const handle = jest.fn(() => of(data));
    return { next: { handle } as unknown as CallHandler, handle };
  };

  beforeEach(() => {
    privacyService = {
      getVisibleInvestorData: jest.fn((item) => item),
    };
    interceptor = new PrivacyInterceptor(
      privacyService as unknown as PrivacyService,
    );
  });

  it('passes through untouched when route is public (no user)', async () => {
    const payload = { ok: true };
    const { next, handle } = makeNext(payload);

    const result = await lastValueFrom(
      interceptor.intercept(makeContext(undefined), next),
    );

    expect(result).toBe(payload);
    expect(handle).toHaveBeenCalledTimes(1);
    expect(privacyService.getVisibleInvestorData).not.toHaveBeenCalled();
  });

  it('masks investor objects recursively for authenticated users', async () => {
    privacyService.getVisibleInvestorData.mockReturnValue({
      id: 'i1',
      name: 'Masked Investor',
      isAnonymous: true,
    });

    const payload = {
      project: {
        investors: [
          {
            id: 'i1',
            role: 'investor',
            projectId: 'p1',
            privacySettings: { p1: { isAnonymous: true } },
          },
        ],
      },
      metadata: { generatedAt: new Date() },
    };

    const result = await lastValueFrom(
      interceptor.intercept(
        makeContext({ userId: 'viewer1', role: 'investor' }),
        makeNext(payload).next,
      ),
    );

    expect(privacyService.getVisibleInvestorData).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'i1' }),
      'p1',
      'viewer1',
      false,
    );
    expect(result.project.investors[0]).toEqual({
      id: 'i1',
      name: 'Masked Investor',
      isAnonymous: true,
    });
  });

  it('converts model-like objects using toObject before masking', async () => {
    privacyService.getVisibleInvestorData.mockReturnValue({
      id: 'i2',
      name: 'Masked via toObject',
    });

    const mongooseLike = {
      toObject: () => ({
        investor: {
          id: 'i2',
          role: 'investor',
          projectId: 'p2',
          privacySettings: { p2: { isAnonymous: true } },
        },
      }),
    };

    const result = await lastValueFrom(
      interceptor.intercept(
        makeContext({ userId: 'viewer2', role: 'admin' }),
        makeNext(mongooseLike).next,
      ),
    );

    expect(privacyService.getVisibleInvestorData).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'i2' }),
      'p2',
      'viewer2',
      true,
    );
    expect(result.investor.name).toBe('Masked via toObject');
  });

  it('logs and returns original data if masking throws', async () => {
    const payload = {
      role: 'investor',
      id: 'i3',
      projectId: 'p3',
      privacySettings: { p3: { isAnonymous: true } },
    };
    privacyService.getVisibleInvestorData.mockImplementation(() => {
      throw new Error('mask failure');
    });
    const loggerSpy = jest.spyOn((interceptor as any).logger, 'error');

    const result = await lastValueFrom(
      interceptor.intercept(
        makeContext({ userId: 'viewer3', role: 'project_admin' }),
        makeNext(payload).next,
      ),
    );

    expect(loggerSpy).toHaveBeenCalled();
    expect(result).toBe(payload);
  });
});
