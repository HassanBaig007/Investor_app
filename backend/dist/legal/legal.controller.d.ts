import { LegalService } from './legal.service';
export declare class LegalController {
    private readonly legalService;
    constructor(legalService: LegalService);
    getPrivacyPolicy(): {
        id: string;
        title: string;
        version: string;
        lastUpdated: string;
        effectiveDate: string;
        contentUrl: string;
    };
    getTerms(): {
        id: string;
        title: string;
        version: string;
        lastUpdated: string;
        effectiveDate: string;
        contentUrl: string;
    };
}
