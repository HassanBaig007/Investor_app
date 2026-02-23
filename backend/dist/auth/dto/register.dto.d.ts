import { UserRole } from '../../users/schemas/user.schema';
export declare class RegisterDto {
    email: string;
    password: string;
    name: string;
    username?: string;
    phone?: string;
    role: UserRole;
    kycVerified?: boolean;
}
