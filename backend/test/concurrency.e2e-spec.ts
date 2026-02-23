import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from './../src/app.module';

describe('Finance Vote Concurrency (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let creatorToken: string;
  let investorAToken: string;
  let investorBToken: string;
  let investorAId: string;
  let investorBId: string;
  let projectId: string;
  let spendingId: string;

  const creatorUser = {
    email: 'concurrency-creator-e2e@splitflow.com',
    username: 'concurrency_creator_e2e',
    password: 'Password123!',
    name: 'Concurrency Creator',
    phone: '+15559990001',
    role: 'investor',
  };

  const investorAUser = {
    email: 'concurrency-investor-a-e2e@splitflow.com',
    username: 'concurrency_investor_a_e2e',
    password: 'Password123!',
    name: 'Concurrency Investor A',
    phone: '+15559990002',
    role: 'investor',
  };

  const investorBUser = {
    email: 'concurrency-investor-b-e2e@splitflow.com',
    username: 'concurrency_investor_b_e2e',
    password: 'Password123!',
    name: 'Concurrency Investor B',
    phone: '+15559990003',
    role: 'investor',
  };

  const projectName = 'Concurrency E2E Project';
  const spendingDescription = 'Concurrency E2E Spending';

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
        email: {
          $in: [creatorUser.email, investorAUser.email, investorBUser.email],
        },
      });
      await db.collection('projects').deleteMany({ name: projectName });
      await db
        .collection('spendings')
        .deleteMany({ description: spendingDescription });
    }

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(creatorUser);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(investorAUser);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(investorBUser);

    const creatorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: creatorUser.email, password: creatorUser.password })
      .expect(201);
    creatorToken = creatorLogin.body.access_token;

    const investorALogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: investorAUser.email,
        password: investorAUser.password,
      })
      .expect(201);
    investorAToken = investorALogin.body.access_token;
    investorAId = investorALogin.body.user.id;

    const investorBLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: investorBUser.email,
        password: investorBUser.password,
      })
      .expect(201);
    investorBToken = investorBLogin.body.access_token;
    investorBId = investorBLogin.body.user.id;

    const projectRes = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        name: projectName,
        description: 'Project for vote concurrency checks',
        type: 'real_estate',
        targetAmount: 600000,
        minInvestment: 10000,
        riskLevel: 'medium',
      })
      .expect(201);
    projectId = projectRes.body._id;

    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/invites`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ userId: investorAId, role: 'active' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/invites`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ userId: investorBId, role: 'active' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/invites/accept`)
      .set('Authorization', `Bearer ${investorAToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/invites/accept`)
      .set('Authorization', `Bearer ${investorBToken}`)
      .expect(201);

    const spendingRes = await request(app.getHttpServer())
      .post('/api/finance/spendings')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        projectId,
        description: spendingDescription,
        category: 'Product',
        materialType: 'Cement',
        amount: 1800,
      })
      .expect(201);

    spendingId = spendingRes.body.id || spendingRes.body._id;
  });

  afterAll(async () => {
    const db = connection.db;
    if (db) {
      await db.collection('users').deleteMany({
        email: {
          $in: [creatorUser.email, investorAUser.email, investorBUser.email],
        },
      });
      await db.collection('projects').deleteMany({ name: projectName });
      await db
        .collection('spendings')
        .deleteMany({ description: spendingDescription });
    }
    await app.close();
  });

  const getTargetSpending = async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/finance/spendings')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ projectId })
      .expect(200);
    const spendings = listRes.body as any[];
    return spendings.find((item) => (item.id || item._id) === spendingId);
  };

  const extractApprovalUserIds = (spending: any): string[] => {
    const approvals = spending?.approvals || {};
    return Object.entries(approvals)
      .map(([key, value]) => String((value as any)?.user || key))
      .filter(Boolean);
  };

  it('handles near-simultaneous votes without server errors and converges to approved', async () => {
    const voteResponses = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/finance/spendings/${spendingId}/vote`)
        .set('Authorization', `Bearer ${investorAToken}`)
        .send({ vote: 'approved' }),
      request(app.getHttpServer())
        .post(`/api/finance/spendings/${spendingId}/vote`)
        .set('Authorization', `Bearer ${investorBToken}`)
        .send({ vote: 'approved' }),
    ]);

    expect(voteResponses.every((res) => res.status < 500)).toBe(true);

    let spending = await getTargetSpending();
    let approvalUserIds = extractApprovalUserIds(spending);

    for (const voter of [investorAId, investorBId]) {
      if (!approvalUserIds.includes(voter)) {
        const token = voter === investorAId ? investorAToken : investorBToken;
        await request(app.getHttpServer())
          .post(`/api/finance/spendings/${spendingId}/vote`)
          .set('Authorization', `Bearer ${token}`)
          .send({ vote: 'approved' })
          .expect(201);
      }
    }

    spending = await getTargetSpending();
    approvalUserIds = extractApprovalUserIds(spending);

    expect(approvalUserIds).toContain(investorAId);
    expect(approvalUserIds).toContain(investorBId);
    expect(spending.status).toBe('approved');
  });
});
