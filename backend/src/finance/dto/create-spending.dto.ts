import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class PaidToDto {
  @IsString()
  @IsNotEmpty()
  person!: string;

  @IsString()
  @IsNotEmpty()
  place!: string;
}

export class CreateSpendingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['Service', 'Product'])
  category!: string;

  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @ValidateIf((dto: CreateSpendingDto) => dto.category === 'Service')
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => PaidToDto)
  paidTo?: PaidToDto;

  @ValidateIf((dto: CreateSpendingDto) => dto.category === 'Product')
  @IsString()
  @IsNotEmpty()
  materialType?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  ledgerId?: string;

  @IsOptional()
  @IsString()
  subLedger?: string;

  @ValidateIf((dto: CreateSpendingDto) => dto.investmentType === 'other')
  @IsString()
  @IsNotEmpty()
  fundedBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['self', 'other'])
  investmentType?: string;
}
