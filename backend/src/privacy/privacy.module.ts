import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrivacyService } from './privacy.service';
import { PrivacyInterceptor } from './privacy.interceptor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [
    PrivacyService,
    PrivacyInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: PrivacyInterceptor,
    },
  ],
  exports: [PrivacyService, PrivacyInterceptor],
})
export class PrivacyModule {}
