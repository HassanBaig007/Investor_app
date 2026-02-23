import { PrivacyService } from './privacy.service';

describe('PrivacyService', () => {
  let service: PrivacyService;

  beforeEach(() => {
    service = new PrivacyService();
  });

  it('returns full data for self viewer', () => {
    const investor = { id: 'u1', name: 'Alice', totalInvested: 1000 };

    const result = service.getVisibleInvestorData(investor, 'p1', 'u1', false);

    expect(result.isSelf).toBe(true);
    expect(result.visibilityLevel).toBe('full');
    expect(result.name).toBe('Alice');
  });

  it('returns admin visibility for anonymous investor when viewer is admin', () => {
    const investor = {
      id: 'u2',
      name: 'Bob',
      privacySettings: { p1: { isAnonymous: true } },
    };

    const result = service.getVisibleInvestorData(
      investor,
      'p1',
      'viewer',
      true,
    );

    expect(result.isAnonymous).toBe(true);
    expect(result.visibilityLevel).toBe('admin');
    expect(result.name).toBe('Bob');
  });

  it('masks anonymous investor for co-investor and hides amount when configured', () => {
    const investor = {
      _id: 'u3',
      name: 'Carol',
      totalInvested: 2500,
      privacySettings: {
        p1: {
          isAnonymous: true,
          displayName: 'Stealth',
          showInvestmentAmount: false,
        },
      },
    };

    const result = service.getVisibleInvestorData(
      investor,
      'p1',
      'another-user',
      false,
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'u3',
        name: 'Stealth',
        isAnonymous: true,
        visibilityLevel: 'anonymous',
        totalInvested: null,
      }),
    );
  });

  it('keeps investment amount visible when anonymous setting allows it', () => {
    const investor = {
      _id: 'u4',
      totalInvested: 999,
      privacySettings: {
        p1: { isAnonymous: true, showInvestmentAmount: true },
      },
    };

    const result = service.getVisibleInvestorData(
      investor,
      'p1',
      'viewer',
      false,
    );

    expect(result.totalInvested).toBe(999);
    expect(result.name).toBe('Anonymous Investor');
  });

  it('returns full data for non-anonymous co-investor', () => {
    const investor = {
      _id: { toString: () => 'u5' },
      name: 'Dana',
      privacySettings: { p1: { isAnonymous: false } },
    };

    const result = service.getVisibleInvestorData(
      investor,
      'p1',
      'viewer',
      false,
    );

    expect(result.isAnonymous).toBe(false);
    expect(result.visibilityLevel).toBe('full');
    expect(result.name).toBe('Dana');
  });
});
