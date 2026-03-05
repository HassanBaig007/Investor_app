import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class VoteModificationDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  vote!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}