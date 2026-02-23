import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import {
  Announcement,
  AnnouncementSchema,
} from './schemas/announcement.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
    ]),
    AuthModule,
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
