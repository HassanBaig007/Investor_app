const mockApp = {
  setGlobalPrefix: jest.fn(),
  use: jest.fn(),
  enableCors: jest.fn(),
  useGlobalPipes: jest.fn(),
  listen: jest.fn().mockResolvedValue(undefined),
};

const mockCreate = jest.fn().mockResolvedValue(mockApp);
const mockHelmet = jest.fn(() => 'helmet-middleware');
const mockJson = jest.fn(() => 'json-middleware');
const mockUrlencoded = jest.fn(() => 'urlencoded-middleware');

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: (...args: any[]) => mockCreate(...args),
  },
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

jest.mock('helmet', () => ({
  __esModule: true,
  default: (...args: any[]) => mockHelmet(...args),
}));

jest.mock('express', () => ({
  json: (...args: any[]) => mockJson(...args),
  urlencoded: (...args: any[]) => mockUrlencoded(...args),
}));

describe('main bootstrap', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockApp.listen.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('boots app and applies middleware/config in development mode', async () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = '4010';
    delete process.env.ALLOWED_ORIGINS;

    await jest.isolateModulesAsync(async () => {
      await import('./main');
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(mockHelmet).toHaveBeenCalledTimes(1);
    expect(mockJson).toHaveBeenCalledWith({ limit: '1mb' });
    expect(mockUrlencoded).toHaveBeenCalledWith({
      extended: true,
      limit: '1mb',
    });
    expect(mockApp.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
      }),
    );
    expect(mockApp.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(mockApp.listen).toHaveBeenCalledWith('4010', '0.0.0.0');
  });

  it('uses comma-separated ALLOWED_ORIGINS when provided', async () => {
    process.env.ALLOWED_ORIGINS = 'https://a.com,https://b.com';

    await jest.isolateModulesAsync(async () => {
      await import('./main');
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockApp.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: ['https://a.com', 'https://b.com'],
      }),
    );
  });

  it('uses production default origin when ALLOWED_ORIGINS is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOWED_ORIGINS;

    await jest.isolateModulesAsync(async () => {
      await import('./main');
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockApp.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: ['https://splitflow.app'],
      }),
    );
  });
});
