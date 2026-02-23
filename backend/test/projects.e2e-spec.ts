import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;
  let investorToken: string;
  let investorId: string;
  let projectId: string;

  const adminUser = {
    email: 'project-admin-e2e@splitflow.com',
    username: 'project_admin_user',
    password: 'Password123!',
    name: 'Project Admin',
    phone: '+15551111111',
    role: 'investor',
  };

  const investorUser = {
    email: 'project-investor-e2e@splitflow.com',
    username: 'project_investor_user',
    password: 'Password123!',
    name: 'Project Investor',
    phone: '+15552222222',
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
      await db
        .collection('users')
        .deleteMany({ email: { $in: [adminUser.email, investorUser.email] } });
      await db.collection('projects').deleteMany({ name: 'E2E Test Project' });
    }

    // Register & Login Admin
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(adminUser);
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.access_token;

    // Register & Login Investor
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(investorUser);
    const investorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: investorUser.email,
        password: investorUser.password,
      });
    investorToken = investorLogin.body.access_token;
    investorId = investorLogin.body.user.id;
  });

  afterAll(async () => {
    const db = connection.db;
    if (db) {
      await db
        .collection('users')
        .deleteMany({ email: { $in: [adminUser.email, investorUser.email] } });
      await db.collection('projects').deleteMany({ name: 'E2E Test Project' });
    }
    await app.close();
  });

  it('/api/projects (POST) - Create Project', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Test Project',
        description: 'An E2E test project',
        type: 'real_estate',
        targetAmount: 1000000,
        minInvestment: 50000,
        riskLevel: 'medium',
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('name', 'E2E Test Project');
    expect(res.body.createdBy).toBeDefined();
    projectId = res.body._id;
  });

  it('/api/projects (GET) - List Projects', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((p: any) => p._id === projectId)).toBe(true);
  });

  it('/api/projects/:id (GET) - Get Single Project', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('_id', projectId);
    expect(res.body).toHaveProperty('name', 'E2E Test Project');
  });

  it('/api/projects/:id (PUT) - Update Project', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Updated description',
      })
      .expect(200);

    expect(res.body).toHaveProperty('description', 'Updated description');
  });

  it('/api/projects/:id/invites (POST) - Invite Member', async () => {
    // Admin invites the investor to the project
    const res = await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/invites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: investorId,
        role: 'investor',
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id', projectId);
    expect(Array.isArray(res.body.pendingInvitations)).toBe(true);
    expect(res.body.pendingInvitations.length).toBeGreaterThan(0);
  });

  it('/api/projects/:id/invites/accept (POST) - Accept Invitation', async () => {
    // Investor accepts the invitation
    const res = await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/invites/accept`)
      .set('Authorization', `Bearer ${investorToken}`)
      .expect(201); // Standard NestJS POST return code

    expect(res.body).toHaveProperty('_id', projectId);
    expect(Array.isArray(res.body.investors)).toBe(true);
    expect(
      res.body.investors.some(
        (inv: any) => inv.user._id === investorId || inv.user === investorId,
      ),
    ).toBe(true);
  });
});
