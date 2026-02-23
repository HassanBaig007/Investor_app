import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { SocialLoginDto } from './dto/social-login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(req: {
        user: {
            userId: string;
            email: string;
            role: string;
        };
    }): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            name: any;
            email: any;
            role: any;
        };
    }>;
    register(registerDto: RegisterDto): Promise<{
        _id: any;
        id: any;
    }>;
    googleLogin(dto: SocialLoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            name: any;
            email: any;
            role: any;
        };
    }>;
    appleLogin(dto: SocialLoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            name: any;
            email: any;
            role: any;
        };
    }>;
    getProfile(req: {
        user: {
            userId: string;
        };
    }): Promise<Record<string, unknown>>;
    logout(req: {
        user: {
            userId: string;
        };
    }): Promise<{
        success: boolean;
    }>;
    refresh(body: {
        refreshToken?: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    getMyPermissions(req: {
        user: {
            userId: string;
            role: string;
        };
    }): {
        role: string;
        permissions: string[];
    };
}
