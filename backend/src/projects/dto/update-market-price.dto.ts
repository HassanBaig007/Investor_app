import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateMarketPriceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  trend?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  positive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
