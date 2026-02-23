import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SocialLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
