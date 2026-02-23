import { Injectable } from '@nestjs/common';

@Injectable()
export class LegalService {
  getPrivacyPolicy() {
    return {
      id: 'privacy-policy',
      title: 'Privacy Policy',
      version: '1.0.0',
      lastUpdated: '2026-02-16',
      effectiveDate: '2026-02-16',
      contentUrl: 'https://splitflow.app/privacy-policy',
    };
  }

  getTermsOfService() {
    return {
      id: 'terms-of-service',
      title: 'Terms of Service',
      version: '1.0.0',
      lastUpdated: '2026-02-16',
      effectiveDate: '2026-02-16',
      contentUrl: 'https://splitflow.app/terms-of-service',
    };
  }
}
