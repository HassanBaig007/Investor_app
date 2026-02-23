import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    AuthModule,
  ],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
