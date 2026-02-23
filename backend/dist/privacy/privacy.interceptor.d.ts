import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrivacyService } from './privacy.service';
export declare class PrivacyInterceptor implements NestInterceptor {
    private readonly privacyService;
    private readonly logger;
    constructor(privacyService: PrivacyService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private shouldStopTraversal;
    private toPlainData;
    private shouldRecurseObject;
    private maskObjectFields;
    private deepMask;
    private maskIfInvestor;
}
