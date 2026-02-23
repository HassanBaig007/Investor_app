"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const google_auth_library_1 = require("google-auth-library");
const jose_1 = require("jose");
let AuthService = class AuthService {
    usersService;
    jwtService;
    googleClient = new google_auth_library_1.OAuth2Client();
    appleJwks = (0, jose_1.createRemoteJWKSet)(new URL('https://appleid.apple.com/auth/keys'));
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
    }
    getAccessToken(user) {
        return this.jwtService.sign({ email: user.email, sub: user.id, role: user.role }, { expiresIn: '60m' });
    }
    getRefreshToken(user) {
        return this.jwtService.sign({ email: user.email, sub: user.id, role: user.role, type: 'refresh' }, { expiresIn: '7d' });
    }
    async persistRefreshTokenHash(userId, refreshToken) {
        const salt = await bcrypt.genSalt();
        const refreshTokenHash = await bcrypt.hash(refreshToken, salt);
        await this.usersService.setRefreshTokenHash(userId, refreshTokenHash);
    }
    async validateUser(identifier, pass) {
        const user = await this.usersService.findByIdentifier(identifier);
        if (user && (await bcrypt.compare(pass, user.passwordHash))) {
            const result = user.toObject();
            delete result.passwordHash;
            return result;
        }
        return null;
    }
    sanitizeName(name, fallback = 'User') {
        const value = String(name || '').trim();
        if (value.length >= 2)
            return value.slice(0, 50);
        return fallback;
    }
    sanitizeUsername(source) {
        const cleaned = String(source || '')
            .toLowerCase()
            .replaceAll(/[^a-z0-9_.-]/g, '')
            .replaceAll(/\.{2,}/g, '.')
            .replaceAll(/-{2,}/g, '-');
        const base = cleaned || `user${Date.now()}`;
        return base.slice(0, 30);
    }
    async upsertSocialUser(params) {
        const providerField = params.provider === 'google' ? 'googleSub' : 'appleSub';
        const normalizedEmail = String(params.email || '')
            .trim()
            .toLowerCase();
        let user = await this.usersService.findBySocialSub(params.provider, params.sub);
        if (!user && normalizedEmail) {
            user = await this.usersService.findOne(normalizedEmail);
        }
        if (user) {
            const patch = {
                [providerField]: params.sub,
                authProvider: params.provider,
            };
            if (!user.name && params.name) {
                patch.name = this.sanitizeName(params.name, 'User Account');
            }
            await this.usersService.update(String(user._id), patch);
            const refreshed = await this.usersService.findById(String(user._id));
            if (!refreshed)
                throw new common_1.UnauthorizedException('Unable to load user');
            return refreshed;
        }
        if (!normalizedEmail) {
            throw new common_1.BadRequestException('Email is required for first-time social login');
        }
        const generatedPassword = `S0c!al_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const userNameSource = normalizedEmail.split('@')[0] || params.name || 'user';
        return this.usersService.create({
            email: normalizedEmail,
            name: this.sanitizeName(params.name, 'User Account'),
            username: this.sanitizeUsername(userNameSource),
            password: generatedPassword,
            role: 'investor',
            authProvider: params.provider,
            [providerField]: params.sub,
        });
    }
    async loginWithGoogle(idToken) {
        const googleAudiences = [
            process.env.GOOGLE_CLIENT_ID,
            process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
            process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        ].filter(Boolean);
        const ticket = await this.googleClient.verifyIdToken({
            idToken,
            audience: googleAudiences.length > 0 ? googleAudiences : undefined,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload?.email) {
            throw new common_1.UnauthorizedException('Invalid Google token payload');
        }
        if (payload.email_verified === false) {
            throw new common_1.UnauthorizedException('Google email is not verified');
        }
        const user = await this.upsertSocialUser({
            provider: 'google',
            sub: payload.sub,
            email: payload.email,
            name: payload.name || undefined,
        });
        return this.login(user);
    }
    async loginWithApple(idToken, profile) {
        const expectedAudience = process.env.APPLE_SERVICE_ID ||
            process.env.APPLE_BUNDLE_ID ||
            process.env.EXPO_APPLE_CLIENT_ID;
        const verifyOptions = {
            issuer: 'https://appleid.apple.com',
        };
        if (expectedAudience) {
            verifyOptions.audience = expectedAudience;
        }
        const { payload } = await (0, jose_1.jwtVerify)(idToken, this.appleJwks, verifyOptions);
        const appleSub = String(payload?.sub || '');
        if (!appleSub) {
            throw new common_1.UnauthorizedException('Invalid Apple token payload');
        }
        const email = (typeof payload?.email === 'string' ? payload.email : profile?.email) ||
            '';
        const name = profile?.name || 'User Account';
        const user = await this.upsertSocialUser({
            provider: 'apple',
            sub: appleSub,
            email,
            name,
        });
        return this.login(user);
    }
    async login(user) {
        const userId = String(user._id || user.id);
        const tokenUser = {
            id: userId,
            email: user.email,
            role: user.role,
        };
        const accessToken = this.getAccessToken(tokenUser);
        const refreshToken = this.getRefreshToken(tokenUser);
        await this.persistRefreshTokenHash(userId, refreshToken);
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: userId,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }
    async refreshTokens(refreshToken) {
        let payload;
        try {
            payload = this.jwtService.verify(refreshToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (!payload?.sub || payload?.type !== 'refresh') {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const user = await this.usersService.findById(payload.sub);
        if (!user || !user.refreshTokenHash) {
            throw new common_1.UnauthorizedException('Session not found');
        }
        const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!isRefreshTokenValid) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const tokenUser = {
            id: String(user._id),
            email: user.email,
            role: user.role,
        };
        const newAccessToken = this.getAccessToken(tokenUser);
        const newRefreshToken = this.getRefreshToken(tokenUser);
        await this.persistRefreshTokenHash(tokenUser.id, newRefreshToken);
        return {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
        };
    }
    async logout(userId) {
        await this.usersService.clearRefreshTokenHash(userId);
        return { success: true };
    }
    async register(registerDto) {
        const allowedSelfRoles = ['guest', 'investor'];
        if (registerDto.role && !allowedSelfRoles.includes(registerDto.role)) {
            registerDto.role = 'investor';
        }
        const disposableDomains = this.usersService
            .getAppConfig()
            .disposableEmailDomains.map((domain) => String(domain).toLowerCase());
        const emailDomain = (registerDto.email || '').split('@')[1]?.toLowerCase();
        if (emailDomain && disposableDomains.includes(emailDomain)) {
            throw new common_1.UnauthorizedException('Temporary or disposable email addresses are not allowed');
        }
        const existing = await this.usersService.findOne(registerDto.email);
        if (existing) {
            throw new common_1.UnauthorizedException('An account with this email already exists');
        }
        const user = await this.usersService.create(registerDto);
        const safe = user.toObject();
        delete safe.passwordHash;
        return {
            id: safe._id,
            ...safe,
            _id: safe._id,
        };
    }
    async changePassword(userId, current, newPass) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        const isMatch = await bcrypt.compare(current, user.passwordHash);
        if (!isMatch)
            throw new common_1.UnauthorizedException('Current password incorrect');
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(newPass, salt);
        user.passwordHash = hash;
        await user.save();
        return { success: true };
    }
    async getProfile(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        const result = user.toObject();
        delete result.passwordHash;
        return {
            id: result._id,
            ...result,
            _id: result._id,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map