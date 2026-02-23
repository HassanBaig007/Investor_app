import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

describe('FinanceController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;
  let investorToken: string;
  let adminId: string;
  let investorId: string;
  let projectId: string;
  let spendingId: string;
  let spendingIdForRejection: string;

  const adminUser = {
    email: 'finance-admin-e2e@splitflow.com',
    username: 'finance_admin_user',
    password: 'Password123!',
    name: 'Finance Admin',
    phone: '+15553333333',
    role: 'investor', // Gets converted to project admin upon project creation
  };

  const investorUser = {
    email: 'finance-investor-e2e@splitflow.com',
    username: 'finance_investor_user',
    password: 'Password123!',
    name: 'Finance Investor',
    phone: '+15554444444',
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

    // Clean slate
    if (db) {
      await db
        .collection('users')
        .deleteMany({ email: { $in: [adminUser.email, investorUser.email] } });
      await db
        .collection('projects')
        .deleteMany({ name: 'Finance E2E Project' });
      await db
        .collection('spendings')
        .deleteMany({ vendor: 'E2E Vendor Corp' });
    }

    // 1. Register & Login Admin
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(adminUser);
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.access_token;
    adminId = adminLogin.body.user.id;

    // 2. Register & Login Investor
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

    // 3. Create Project & Capture ID
    const projectRes = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Finance E2E Project',
        description: 'Project for finance E2E tests',
        type: 'real_estate',
        targetAmount: 2000000,
        minInvestment: 100000,
        riskLevel: 'low',
      });
    projectId = projectRes.body._id;

    // 4. Invite & Add Investor to Project (Force Active)
    // Note: Actual logic might require acceptance, but we can force it in DB for testing
    // or just accept it normally.
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/invites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: investorId, role: 'investor' });

    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/invites/accept`)
      .set('Authorization', `Bearer ${investorToken}`);

    // Update role to active so they can vote (assuming that's how investors vote)
    if (db) {
      await db
        .collection('projects')
        .updateOne({ _id: new Types.ObjectId(projectId) }, {
          $push: {
            investors: {
              user: new Types.ObjectId(investorId),
              role: 'active',
              investedAmount: 500000,
            },
          },
        } as any);

      // Also add Admin as active investor so Admin can vote to reject
      await db
        .collection('projects')
        .updateOne({ _id: new Types.ObjectId(projectId) }, {
          $push: {
            investors: {
              user: new Types.ObjectId(adminId),
              role: 'active',
              investedAmount: 500000,
            },
          },
        } as any);
    }
  });

  afterAll(async () => {
    const db = connection.db;
    if (db) {
      await db
        .collection('users')
        .deleteMany({ email: { $in: [adminUser.email, investorUser.email] } });
      await db
        .collection('projects')
        .deleteMany({ name: 'Finance E2E Project' });
      await db
        .collection('spendings')
        .deleteMany({ vendor: 'E2E Vendor Corp' });
    }
    await app.close();
  });

  it('/api/finance/spendings (POST) - Create Spending Request', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/finance/spendings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId,
        description: 'E2E Server Purchase',
        category: 'Product',
        materialType: 'Hardware',
        amount: 15000,
        date: new Date().toISOString(),
        investmentType: 'self',
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('description', 'E2E Server Purchase');
    expect(res.body).toHaveProperty('status', 'pending');
    spendingId = res.body._id;
  });

  it('/api/finance/spendings (GET) - List Spendings', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/finance/spendings?projectId=${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((s: any) => s._id === spendingId)).toBe(true);
  });

  it('/api/finance/spendings/:id/vote (POST) - Investor Approves Spending', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/finance/spendings/${spendingId}/vote`)
      .set('Authorization', `Bearer ${investorToken}`)
      .send({ vote: 'approved' })
      .expect(201); // Standard NestJS POST is 201

    expect(res.body).toHaveProperty('approvals');
  });

  it('/api/finance/spendings/:id/vote (POST) - Admin Approves Spending (Redundant)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/finance/spendings/${spendingId}/vote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vote: 'approved' })
      .expect(400); // Because it might already be fully approved or user already voted (if investor and admin are same test)

    expect(res.body).toHaveProperty('message');
  });

  it('/api/finance/spendings (POST) - Create another Spending Request for rejection', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/finance/spendings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId,
        description: 'E2E Office Supplies',
        category: 'Service',
        paidTo: { person: 'Office Clerk', place: 'Store' },
        amount: 500,
        date: new Date().toISOString(),
        investmentType: 'self',
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('description', 'E2E Office Supplies');
    expect(res.body).toHaveProperty('status', 'pending');
    spendingIdForRejection = res.body._id;
  });

  it('/api/finance/spendings/:id/vote (POST) - Admin Rejects Spending', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/finance/spendings/${spendingIdForRejection}/vote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vote: 'rejected' })
      .expect(201);

    // Admin rejection typically overrides immediately or registers negative vote.
    expect(res.body).toHaveProperty('status', 'rejected');
    expect(res.body).toHaveProperty('approvals');
  });
});
