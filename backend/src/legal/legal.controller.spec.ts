import { Test, TestingModule } from '@nestjs/testing';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

describe('LegalController', () => {
  let controller: LegalController;
  let legalService: {
    getPrivacyPolicy: jest.Mock;
    getTermsOfService: jest.Mock;
  };

  beforeEach(async () => {
    legalService = {
      getPrivacyPolicy: jest.fn().mockReturnValue({ id: 'privacy-policy' }),
      getTermsOfService: jest.fn().mockReturnValue({ id: 'terms-of-service' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalController],
      providers: [{ provide: LegalService, useValue: legalService }],
    }).compile();

    controller = module.get<LegalController>(LegalController);
  });

  it('delegates privacy policy route to service', () => {
    const result = controller.getPrivacyPolicy();

    expect(legalService.getPrivacyPolicy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'privacy-policy' });
  });

  it('delegates terms route to service', () => {
    const result = controller.getTerms();

    expect(legalService.getTermsOfService).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'terms-of-service' });
  });
});
