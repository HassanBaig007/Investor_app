import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let accessToken: string;
  let refreshToken: string;

  const testUser = {
    email: 'e2e-auth-test@splitflow.com',
    password: 'MockPassword123!',
    name: 'Mock AuthTester',
    username: 'e2eauthtester',
    phone: '+15550000000',
    role: 'investor', // default role
  };

  beforeAll(async () => {
    // We intentionally do not mock Mongoose here. This is a real integration test.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    // Apply validation pipe matching our main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Obtain DB connection to clean up state before tests
    connection = await moduleFixture.get(getConnectionToken());

    // Cleanup prior test users if they exist
    const db = connection.db;
    if (db) {
      await db.collection('users').deleteMany({ email: testUser.email });
      await db.collection('users').deleteMany({ username: testUser.username });
    }
  });

  afterAll(async () => {
    // Final cleanup
    const db = connection.db;
    if (db) {
      await db.collection('users').deleteMany({ email: testUser.email });
    }
    await app.close();
  });

  it('/api/auth/register (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', testUser.email);
    expect(res.body).toHaveProperty('name', testUser.name);
    // password should not be returned
    expect(res.body.password).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('/api/auth/login (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: testUser.email,
        password: testUser.password,
      })
      .expect(201); // Standard NestJS POST return code

    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    expect(res.body.user).toHaveProperty('email', testUser.email);

    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('/api/auth/me (GET) - Success', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('email', testUser.email);
    expect(res.body).toHaveProperty('name', testUser.name);
  });

  it('/api/auth/me (GET) - Unauthorized without token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('/api/auth/refresh (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${accessToken}`) // Refresh route uses JwtAuthGuard
      .send({
        refreshToken: refreshToken,
      })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');

    // Update tokens for logout
    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('/api/auth/logout (POST)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201); // 201 Created because it is a POST
  });

  it('/api/auth/refresh (POST) - Fails after logout', async () => {
    // After logout, the refresh token should be invalidated in the database
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        refreshToken: refreshToken,
      })
      .expect(401); // Unauthorized because refresh token hash is wiped
  });
});
