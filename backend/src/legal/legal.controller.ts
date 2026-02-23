import { Controller, Get } from '@nestjs/common';
import { LegalService } from './legal.service';

@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('privacy-policy')
  getPrivacyPolicy() {
    return this.legalService.getPrivacyPolicy();
  }

  @Get('terms')
  getTerms() {
    return this.legalService.getTermsOfService();
  }
}
