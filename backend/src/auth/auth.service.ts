import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();
  private readonly appleJwks = createRemoteJWKSet(
    new URL('https://appleid.apple.com/auth/keys'),
  );

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private getAccessToken(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign(
      { email: user.email, sub: user.id, role: user.role },
      { expiresIn: '60m' },
    );
  }

  private getRefreshToken(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign(
      { email: user.email, sub: user.id, role: user.role, type: 'refresh' },
      { expiresIn: '7d' },
    );
  }

  private async persistRefreshTokenHash(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt();
    const refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    await this.usersService.setRefreshTokenHash(userId, refreshTokenHash);
  }

  async validateUser(identifier: string, pass: string): Promise<any> {
    const user = await this.usersService.findByIdentifier(identifier);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const result = user.toObject() as Record<string, any>;
      delete result.passwordHash;
      return result;
    }
    return null;
  }

  private sanitizeName(name?: string, fallback = 'User'): string {
    const value = String(name || '').trim();
    if (value.length >= 2) return value.slice(0, 50);
    return fallback;
  }

  private sanitizeUsername(source: string): string {
    const cleaned = String(source || '')
      .toLowerCase()
      .replaceAll(/[^a-z0-9_.-]/g, '')
      .replaceAll(/\.{2,}/g, '.')
      .replaceAll(/-{2,}/g, '-');
    const base = cleaned || `user${Date.now()}`;
    return base.slice(0, 30);
  }

  private async upsertSocialUser(params: {
    provider: 'google' | 'apple';
    sub: string;
    email?: string;
    name?: string;
  }) {
    const providerField =
      params.provider === 'google' ? 'googleSub' : 'appleSub';
    const normalizedEmail = String(params.email || '')
      .trim()
      .toLowerCase();

    let user = await this.usersService.findBySocialSub(
      params.provider,
      params.sub,
    );
    if (!user && normalizedEmail) {
      user = await this.usersService.findOne(normalizedEmail);
    }

    if (user) {
      const patch: Record<string, any> = {
        [providerField]: params.sub,
        authProvider: params.provider,
      };
      if (!user.name && params.name) {
        patch.name = this.sanitizeName(params.name, 'User Account');
      }
      await this.usersService.update(String(user._id), patch);
      const refreshed = await this.usersService.findById(String(user._id));
      if (!refreshed) throw new UnauthorizedException('Unable to load user');
      return refreshed;
    }

    if (!normalizedEmail) {
      throw new BadRequestException(
        'Email is required for first-time social login',
      );
    }

    const generatedPassword = `S0c!al_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const userNameSource =
      normalizedEmail.split('@')[0] || params.name || 'user';

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

  async loginWithGoogle(idToken: string) {
    const googleAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean) as string[];

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: googleAudiences.length > 0 ? googleAudiences : undefined,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Invalid Google token payload');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const user = await this.upsertSocialUser({
      provider: 'google',
      sub: payload.sub,
      email: payload.email,
      name: payload.name || undefined,
    });

    return this.login(user);
  }

  async loginWithApple(
    idToken: string,
    profile?: { email?: string; name?: string },
  ) {
    const expectedAudience =
      process.env.APPLE_SERVICE_ID ||
      process.env.APPLE_BUNDLE_ID ||
      process.env.EXPO_APPLE_CLIENT_ID;

    const verifyOptions: Record<string, any> = {
      issuer: 'https://appleid.apple.com',
    };
    if (expectedAudience) {
      verifyOptions.audience = expectedAudience;
    }

    const { payload } = await jwtVerify(
      idToken,
      this.appleJwks,
      verifyOptions as any,
    );
    const appleSub = String(payload?.sub || '');
    if (!appleSub) {
      throw new UnauthorizedException('Invalid Apple token payload');
    }

    const email =
      (typeof payload?.email === 'string' ? payload.email : profile?.email) ||
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

  async login(user: any) {
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

  async refreshTokens(refreshToken: string) {
    let payload: { sub: string; email: string; role: string; type?: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload?.sub || payload?.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session not found');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
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

  async logout(userId: string) {
    await this.usersService.clearRefreshTokenHash(userId);
    return { success: true };
  }

  async register(registerDto: any) {
    // SECURITY: Prevent role escalation — only allow self-assignable roles
    const allowedSelfRoles = ['guest', 'investor'];
    if (registerDto.role && !allowedSelfRoles.includes(registerDto.role)) {
      registerDto.role = 'investor'; // Force to safe default
    }

    // SECURITY: Block disposable email domains (single source: UsersService.getAppConfig)
    const disposableDomains = this.usersService
      .getAppConfig()
      .disposableEmailDomains.map((domain) => String(domain).toLowerCase());
    const emailDomain = (registerDto.email || '').split('@')[1]?.toLowerCase();
    if (emailDomain && disposableDomains.includes(emailDomain)) {
      throw new UnauthorizedException(
        'Temporary or disposable email addresses are not allowed',
      );
    }

    // Check for duplicate email
    const existing = await this.usersService.findOne(registerDto.email);
    if (existing) {
      throw new UnauthorizedException(
        'An account with this email already exists',
      );
    }

    const user = await this.usersService.create(registerDto);
    const safe = user.toObject() as Record<string, any>;
    delete safe.passwordHash;
    return {
      id: safe._id,
      ...safe,
      _id: safe._id,
    };
  }

  async changePassword(userId: string, current: string, newPass: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(current, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Current password incorrect');

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(newPass, salt);

    user.passwordHash = hash;
    await user.save();
    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    const result = user.toObject() as Record<string, any>;
    delete result.passwordHash;
    return {
      id: result._id,
      ...result,
      _id: result._id,
    };
  }
}
