import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'identifier', passReqToCallback: true });
  }

  async validate(req: Request, identifier: string, pass: string): Promise<any> {
    const body = (req?.body || {}) as Record<string, unknown>;
    const candidates: unknown[] = [
      identifier,
      body.identifier,
      body.email,
      body.username,
      body.phone,
    ];

    const stringCandidate = candidates.find(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    );
    const primitiveCandidate = candidates.find(
      (value) => typeof value === 'number' || typeof value === 'boolean',
    );

    const resolvedIdentifier = (
      stringCandidate ??
      (primitiveCandidate === undefined ? '' : String(primitiveCandidate))
    ).trim();

    const user = await this.authService.validateUser(resolvedIdentifier, pass);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
