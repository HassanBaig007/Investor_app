import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

describe('Security and Access Control (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let creatorToken: string;
  let outsiderToken: string;
  let outsiderId: string;
  let projectId: string;

  const creatorUser = {
    email: 'security-creator-e2e@splitflow.com',
    username: 'security_creator_e2e',
    password: 'Password123!',
    name: 'Security Creator',
    phone: '+15556660001',
    role: 'investor',
  };

  const outsiderUser = {
    email: 'security-outsider-e2e@splitflow.com',
    username: 'security_outsider_e2e',
    password: 'Password123!',
    name: 'Security Outsider',
    phone: '+15556660002',
    role: 'investor',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
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
        email: { $in: [creatorUser.email, outsiderUser.email] },
      });
      await db
        .collection('projects')
        .deleteMany({ name: 'Security E2E Project' });
      await db.collection('spendings').deleteMany({
        description: 'Security E2E Spending',
      });
    }

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(creatorUser);
    const creatorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: creatorUser.email, password: creatorUser.password });
    creatorToken = creatorLogin.body.access_token;

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(outsiderUser);
    const outsiderLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: outsiderUser.email,
        password: outsiderUser.password,
      });
    outsiderToken = outsiderLogin.body.access_token;
    outsiderId = outsiderLogin.body.user.id;

    const projectRes = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        name: 'Security E2E Project',
        description: 'Project for access-control tests',
        type: 'real_estate',
        targetAmount: 1000000,
        minInvestment: 10000,
        riskLevel: 'medium',
      });
    projectId = projectRes.body._id;
  });

  afterAll(async () => {
    const db = connection.db;
    if (db) {
      await db.collection('users').deleteMany({
        email: { $in: [creatorUser.email, outsiderUser.email] },
      });
      await db
        .collection('projects')
        .deleteMany({ name: 'Security E2E Project' });
      await db.collection('spendings').deleteMany({
        description: 'Security E2E Spending',
      });
    }
    await app.close();
  });

  it('rejects access to protected route without JWT', async () => {
    await request(app.getHttpServer()).get('/api/projects').expect(401);
  });

  it('rejects tampered JWT', async () => {
    await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);
  });

  it('prevents outsider from reading a project they are not part of', async () => {
    await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);
  });

  it('prevents outsider from inviting users to project', async () => {
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/invites`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ userId: outsiderId, role: 'active' })
      .expect(403);
  });

  it('prevents outsider from adding spending on project', async () => {
    await request(app.getHttpServer())
      .post('/api/finance/spendings')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({
        projectId,
        description: 'Security E2E Spending',
        category: 'Product',
        materialType: 'Hardware',
        amount: 1000,
      })
      .expect(403);
  });

  it('blocks self-registration role escalation to super_admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'security-role-escalation-e2e@splitflow.com',
        username: 'security_role_escalation_e2e',
        password: 'Password123!',
        name: 'Escalation Attempt',
        phone: '+15556660003',
        role: 'super_admin',
      })
      .expect(201);

    expect(response.body.role).toBe('investor');

    await connection.db
      ?.collection('users')
      .deleteMany({ email: 'security-role-escalation-e2e@splitflow.com' });
  });
});
