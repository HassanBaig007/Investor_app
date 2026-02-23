import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from './../src/app.module';

describe('API Contracts (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let accessToken: string;
  let projectId: string;
  let registerResponse: Response;
  let loginResponse: Response;
  let projectResponse: Response;
  let summaryResponse: Response;
  let searchResponse: Response;

  const contractUser = {
    email: 'contracts-e2e-user@splitflow.com',
    username: 'contracts_e2e_user',
    password: 'Password123!',
    name: 'Contract Tester User',
    phone: '+15558880001',
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
      await db.collection('users').deleteMany({ email: contractUser.email });
      await db
        .collection('projects')
        .deleteMany({ name: 'Contracts E2E Project' });
      await db.collection('spendings').deleteMany({
        description: 'Contracts E2E Spending',
      });
    }

    registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(contractUser)
      .expect(201);

    loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: contractUser.email, password: contractUser.password })
      .expect(201);

    accessToken = loginResponse.body.access_token;

    projectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Contracts E2E Project',
        description: 'Project for contract validation',
        type: 'real_estate',
        targetAmount: 450000,
        minInvestment: 5000,
        riskLevel: 'medium',
      })
      .expect(201);

    projectId = projectResponse.body._id;

    await request(app.getHttpServer())
      .post('/api/finance/spendings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        projectId,
        description: 'Contracts E2E Spending',
        category: 'Product',
        materialType: 'Steel',
        amount: 1500,
      })
      .expect(201);

    summaryResponse = await request(app.getHttpServer())
      .get('/api/finance/spending-summary')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ projectId })
      .expect(200);

    searchResponse = await request(app.getHttpServer())
      .get('/api/finance/spendings/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ projectId, search: 'Contracts', page: 1, limit: 10 })
      .expect(200);
  });

  afterAll(async () => {
    const db = connection.db;
    if (db) {
      await db.collection('users').deleteMany({ email: contractUser.email });
      await db
        .collection('projects')
        .deleteMany({ name: 'Contracts E2E Project' });
      await db.collection('spendings').deleteMany({
        description: 'Contracts E2E Spending',
      });
    }
    await app.close();
  });

  it('auth/register contract exposes only safe user fields', () => {
    expect(registerResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        email: contractUser.email,
        name: contractUser.name,
        role: 'investor',
      }),
    );
    expect(registerResponse.body.password).toBeUndefined();
    expect(registerResponse.body.passwordHash).toBeUndefined();
  });

  it('auth/login contract returns token pair and sanitized user', () => {
    expect(loginResponse.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          email: contractUser.email,
          role: 'investor',
        }),
      }),
    );
    expect(loginResponse.body.user.passwordHash).toBeUndefined();
  });

  it('projects/create contract returns project identity and member data', () => {
    expect(projectResponse.body).toEqual(
      expect.objectContaining({
        _id: expect.any(String),
        name: 'Contracts E2E Project',
        type: 'real_estate',
        investors: expect.any(Array),
      }),
    );
  });

  it('finance/spending-summary contract preserves approvedSpent shape', () => {
    expect(summaryResponse.body).toEqual(
      expect.objectContaining({
        projectId,
        projectName: 'Contracts E2E Project',
        totalSpent: expect.any(Number),
        approvedSpent: expect.any(Number),
        pendingSpent: expect.any(Number),
        rejectedSpent: expect.any(Number),
        spendingCount: expect.any(Number),
      }),
    );
  });

  it('finance/spendings/search contract returns paginated response envelope', () => {
    expect(searchResponse.body).toEqual(
      expect.objectContaining({
        spendings: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 10,
        hasMore: expect.any(Boolean),
      }),
    );
    expect(searchResponse.body.spendings.length).toBeGreaterThanOrEqual(1);
  });
});
