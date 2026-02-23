import { PartialType } from '@nestjs/mapped-types';
import { CreateModificationDto } from './create-modification.dto';

export class UpdateModificationDto extends PartialType(CreateModificationDto) {}
