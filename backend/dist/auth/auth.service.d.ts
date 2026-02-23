import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly googleClient;
    private readonly appleJwks;
    constructor(usersService: UsersService, jwtService: JwtService);
    private getAccessToken;
    private getRefreshToken;
    private persistRefreshTokenHash;
    validateUser(identifier: string, pass: string): Promise<any>;
    private sanitizeName;
    private sanitizeUsername;
    private upsertSocialUser;
    loginWithGoogle(idToken: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            name: any;
            email: any;
            role: any;
        };
    }>;
    loginWithApple(idToken: string, profile?: {
        email?: string;
        name?: string;
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
    login(user: any): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            name: any;
            email: any;
            role: any;
        };
    }>;
    refreshTokens(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(userId: string): Promise<{
        success: boolean;
    }>;
    register(registerDto: any): Promise<{
        _id: any;
        id: any;
    }>;
    changePassword(userId: string, current: string, newPass: string): Promise<{
        success: boolean;
    }>;
    getProfile(userId: string): Promise<{
        _id: any;
        id: any;
    }>;
}
