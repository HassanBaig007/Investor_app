import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { ProjectAnalyticsService } from './project-analytics.service';
import { ProjectsController } from './projects.controller';
import { Project, ProjectSchema } from './schemas/project.schema';
import { MarketPrice, MarketPriceSchema } from './schemas/market-price.schema';
import {
  MarketNewsItem,
  MarketNewsItemSchema,
} from './schemas/market-news-item.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  Spending,
  SpendingSchema,
  Ledger,
  LedgerSchema,
} from '../finance/schemas/finance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
      { name: MarketPrice.name, schema: MarketPriceSchema },
      { name: MarketNewsItem.name, schema: MarketNewsItemSchema },
      { name: Spending.name, schema: SpendingSchema },
      { name: Ledger.name, schema: LedgerSchema },
    ]),
    NotificationsModule,
  ],
  providers: [ProjectsService, ProjectAnalyticsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
