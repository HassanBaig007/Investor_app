import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  targetAmount: number;

  @IsNumber()
  @Min(0)
  minInvestment: number;

  @IsString()
  @IsNotEmpty()
  riskLevel: string;

  @IsString()
  @IsOptional()
  returnRate?: string;

  @IsString()
  @IsOptional()
  duration?: string;
}
