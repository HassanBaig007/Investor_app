import { LegalService } from './legal.service';

describe('LegalService', () => {
  let service: LegalService;

  beforeEach(() => {
    service = new LegalService();
  });

  it('returns privacy policy metadata', () => {
    const result = service.getPrivacyPolicy();

    expect(result).toEqual(
      expect.objectContaining({
        id: 'privacy-policy',
        title: 'Privacy Policy',
        version: '1.0.0',
      }),
    );
  });

  it('returns terms of service metadata', () => {
    const result = service.getTermsOfService();

    expect(result).toEqual(
      expect.objectContaining({
        id: 'terms-of-service',
        title: 'Terms of Service',
        version: '1.0.0',
      }),
    );
  });
});
