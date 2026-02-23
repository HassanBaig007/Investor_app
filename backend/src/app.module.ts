import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrivacyModule } from './privacy/privacy.module';
import { ProjectsModule } from './projects/projects.module';
import { FinanceModule } from './finance/finance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { ModificationsModule } from './modifications/modifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { InvestmentsModule } from './investments/investments.module';
import { LegalModule } from './legal/legal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    // Rate limiting — 60 requests per 60 seconds per IP (global)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    UsersModule,
    AuthModule,
    PrivacyModule,
    ProjectsModule,
    FinanceModule,
    NotificationsModule,
    AdminModule,
    ModificationsModule,
    UploadsModule,
    AnnouncementsModule,
    InvestmentsModule,
    LegalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply throttler globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
