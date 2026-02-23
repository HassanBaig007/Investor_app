import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from './../src/app.module';

describe('Security Token Lifecycle + Account Protection (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  const lifecycleUser = {
    email: 'security-lifecycle-investor-e2e@splitflow.com',
    username: 'security_lifecycle_investor_e2e',
    password: 'Password123!',
    name: 'Security Lifecycle Investor',
    phone: '+15558889001',
    role: 'investor',
  };

  const disposableEmailUser = {
    email: 'security-disposable-e2e@mailinator.com',
    username: 'security_disposable_e2e',
    password: 'Password123!',
    name: 'Disposable Attempt',
    phone: '+15558889002',
    role: 'investor',
  };

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

    await connection.db?.collection('users').deleteMany({
      $or: [
        { email: { $in: [lifecycleUser.email, disposableEmailUser.email] } },
        {
          username: {
            $in: [lifecycleUser.username, disposableEmailUser.username],
          },
        },
      ],
    });

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(lifecycleUser)
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: lifecycleUser.email,
        password: lifecycleUser.password,
      })
      .expect(201);

    accessToken = loginRes.body.access_token;
    refreshToken = loginRes.body.refresh_token;
    userId = loginRes.body.user.id;
  });

  afterAll(async () => {
    await connection.db?.collection('users').deleteMany({
      $or: [
        { email: { $in: [lifecycleUser.email, disposableEmailUser.email] } },
        {
          username: {
            $in: [lifecycleUser.username, disposableEmailUser.username],
          },
        },
        { _id: userId },
      ],
    });
    await app.close();
  });

  it('rejects disposable email registration domains', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(disposableEmailUser)
      .expect(401);

    expect(String(res.body?.message || '').toLowerCase()).toContain(
      'disposable',
    );
  });

  it('returns hardening headers from helmet middleware', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);

    expect(
      String(res.headers['x-content-type-options'] || '').toLowerCase(),
    ).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('issues a fresh token pair on refresh without server errors', async () => {
    const oldRefresh = refreshToken;
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshToken })
      .expect(201);

    expect(refreshed.body).toHaveProperty('access_token');
    expect(refreshed.body).toHaveProperty('refresh_token');
    expect(refreshed.body.refresh_token).not.toBe(oldRefresh);

    accessToken = refreshed.body.access_token;
    refreshToken = refreshed.body.refresh_token;

    const reused = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect((response) => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      });

    expect([201, 401]).toContain(reused.status);
  });

  it('rejects access token misuse on refresh endpoint', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: accessToken })
      .expect(401);
  });

  it('keeps credential secrets out of export-data profile payload', async () => {
    const exportRes = await request(app.getHttpServer())
      .get('/api/users/export-data')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(exportRes.body?.userData?.profile?.passwordHash).toBeUndefined();
  });

  it('requires correct password before account deletion', async () => {
    await request(app.getHttpServer())
      .delete('/api/users/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'WrongPassword!' })
      .expect(400);
  });

  it('invalidates refresh token after explicit logout', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('deletes account and blocks subsequent credential login', async () => {
    await request(app.getHttpServer())
      .delete('/api/users/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: lifecycleUser.password })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ deleted: true });
      });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: lifecycleUser.email,
        password: lifecycleUser.password,
      })
      .expect(401);
  });
});
