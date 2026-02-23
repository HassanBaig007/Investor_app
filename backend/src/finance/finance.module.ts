import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import {
  Spending,
  SpendingSchema,
  Ledger,
  LedgerSchema,
} from './schemas/finance.schema';
import { ProjectsModule } from '../projects/projects.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Spending.name, schema: SpendingSchema },
      { name: Ledger.name, schema: LedgerSchema },
    ]),
    ProjectsModule,
    NotificationsModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
