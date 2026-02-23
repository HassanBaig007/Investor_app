import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Spending, SpendingSchema } from '../finance/schemas/finance.schema';
import {
  ModificationRequest,
  ModificationRequestSchema,
} from '../modifications/schemas/modification-request.schema';
import {
  Notification,
  NotificationSchema,
} from '../notifications/schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Spending.name, schema: SpendingSchema },
      { name: ModificationRequest.name, schema: ModificationRequestSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export for AuthModule
})
export class UsersModule {}
