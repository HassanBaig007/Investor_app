import { IsIn, IsString } from 'class-validator';

export class VoteSpendingDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  vote!: 'approved' | 'rejected';
}