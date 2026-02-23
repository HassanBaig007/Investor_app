import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateMarketNewsItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  trend?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
