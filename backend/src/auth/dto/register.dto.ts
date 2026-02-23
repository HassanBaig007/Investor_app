import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsIn,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from '../../users/schemas/user.schema';

// Only these roles can be self-assigned during registration
const SELF_ASSIGNABLE_ROLES = [UserRole.GUEST, UserRole.INVESTOR];

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsNotEmpty()
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*()_+\-={}';:"\\|,.<>?]/, {
    message: 'Password must contain at least one special character',
  })
  password: string;

  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z]+(?:\s[a-zA-Z]+)+$/, {
    message: 'Please enter your full name (first and last name, letters only)',
  })
  name: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsEnum(UserRole)
  @IsIn(SELF_ASSIGNABLE_ROLES)
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  kycVerified?: boolean;
}
