import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService, MongooseModule],
})
export class NotificationsModule {}
