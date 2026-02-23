jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

describe('Nest module files', () => {
  it('loads all module classes', async () => {
    const { AppModule } = await import('./app.module');
    const { AdminModule } = await import('./admin/admin.module');
    const { AnnouncementsModule } =
      await import('./announcements/announcements.module');
    const { AuthModule } = await import('./auth/auth.module');
    const { FinanceModule } = await import('./finance/finance.module');
    const { InvestmentsModule } =
      await import('./investments/investments.module');
    const { LegalModule } = await import('./legal/legal.module');
    const { ModificationsModule } =
      await import('./modifications/modifications.module');
    const { NotificationsModule } =
      await import('./notifications/notifications.module');
    const { PrivacyModule } = await import('./privacy/privacy.module');
    const { ProjectsModule } = await import('./projects/projects.module');
    const { UploadsModule } = await import('./uploads/uploads.module');
    const { UsersModule } = await import('./users/users.module');

    expect(AppModule).toBeDefined();
    expect(AdminModule).toBeDefined();
    expect(AnnouncementsModule).toBeDefined();
    expect(AuthModule).toBeDefined();
    expect(FinanceModule).toBeDefined();
    expect(InvestmentsModule).toBeDefined();
    expect(LegalModule).toBeDefined();
    expect(ModificationsModule).toBeDefined();
    expect(NotificationsModule).toBeDefined();
    expect(PrivacyModule).toBeDefined();
    expect(ProjectsModule).toBeDefined();
    expect(UploadsModule).toBeDefined();
    expect(UsersModule).toBeDefined();
  });
});
