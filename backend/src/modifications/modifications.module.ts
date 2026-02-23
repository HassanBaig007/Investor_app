import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModificationsService } from './modifications.service';
import { ModificationsController } from './modifications.controller';
import {
  ModificationRequest,
  ModificationRequestSchema,
} from './schemas/modification-request.schema';
import { ProjectsModule } from '../projects/projects.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ModificationRequest.name, schema: ModificationRequestSchema },
    ]),
    ProjectsModule,
    NotificationsModule,
  ],
  controllers: [ModificationsController],
  providers: [ModificationsService],
})
export class ModificationsModule {}
