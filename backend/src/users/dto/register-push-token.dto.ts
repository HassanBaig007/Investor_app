import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pushToken?: string;
}
