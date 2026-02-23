import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from './../src/app.module';

describe('Security Hardening (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let investorToken: string;
  let refreshToken: string;
  let investorId: string;

  const investorUser = {
    email: 'security-hardening-investor-e2e@splitflow.com',
    username: 'security_hardening_investor_e2e',
    password: 'Password123!',
    name: 'Security Hardening Investor',
    phone: '+15557770001',
    role: 'investor',
  };
  const whitelistUserEmail = 'security-hardening-whitelist-e2e@splitflow.com';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(helmet());
    app.use(json({ limit: '1mb' }));
    app.use(urlencoded({ extended: true, limit: '1mb' }));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    connection = await moduleFixture.get(getConnectionToken());
    const db = connection.db;
    if (db) {
      await db.collection('users').deleteMany({
        email: { $in: [investorUser.email, whitelistUserEmail] },
      });
    }

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(investorUser);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: investorUser.email, password: investorUser.password })
      .expect(201);

    investorToken = loginRes.body.access_token;
    refreshToken = loginRes.body.refresh_token;
    investorId = loginRes.body.user.id;
  });

  afterAll(async () => {
    await connection.db
      ?.collection('users')
      .deleteMany({ email: { $in: [investorUser.email, whitelistUserEmail] } });
    await app.close();
  });

  it('rejects non-whitelisted fields on registration payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: whitelistUserEmail,
        username: 'security_hardening_whitelist_e2e',
        password: 'Password123!',
        name: 'Security Whitelist User',
        phone: '+15557770009',
        role: 'investor',
        unexpectedField: 'blocked',
      })
      .expect(400);

    expect(String(res.body?.message || '')).toContain('should not exist');
  });

  it('rejects NoSQL injection-shaped login identifier payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: { $ne: null },
        password: investorUser.password,
      });

    expect([400, 401]).toContain(res.status);
    expect(res.status).toBeLessThan(500);
  });

  it('prevents role escalation via profile update payload tampering', async () => {
    const updateRes = await request(app.getHttpServer())
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({
        name: 'Investor Renamed',
        role: 'admin',
        passwordHash: 'tampered',
        refreshTokenHash: 'tampered',
      })
      .expect(200);

    expect(updateRes.body).toHaveProperty('_id', investorId);
    expect(updateRes.body).toHaveProperty('role', 'investor');
    expect(updateRes.body.passwordHash).toBeUndefined();
    expect(updateRes.body.refreshTokenHash).not.toEqual('tampered');
  });

  it('blocks investor role from privileged /users directory endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${investorToken}`)
      .expect(403);
  });

  it('enforces body-size limits for oversized JSON payloads', async () => {
    const oversizedName = `A${'x'.repeat(1024 * 1024 + 5)}`;
    await request(app.getHttpServer())
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ name: oversizedName })
      .expect(413);
  });

  it('invalidates refresh token after logout', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${investorToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('rate-limits repeated login attempts to reduce brute-force risk', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: investorUser.email,
          password: 'WrongPassword!',
        });
      statuses.push(res.status);
    }

    expect(statuses[statuses.length - 1]).toBe(429);
    expect(statuses.every((status) => status >= 400 && status < 500)).toBe(
      true,
    );
  });
});
