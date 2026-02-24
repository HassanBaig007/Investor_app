describe('Native Auth Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('shows the login shell on app launch', async () => {
    await expect(element(by.text('SplitFlow'))).toBeVisible();
    await expect(element(by.text('Sign In'))).toBeVisible();
  });

  it('navigates to sign up and can return to login', async () => {
    await element(by.text('Sign Up')).tap();
    await expect(element(by.text('Create Account'))).toBeVisible();
    await device.pressBack();
    await expect(element(by.text('SplitFlow'))).toBeVisible();
  });

  it('supports toggling between user/admin modes on login screen', async () => {
    await element(by.text('Admin')).tap();
    await expect(element(by.text('Admin Login'))).toBeVisible();
    await element(by.text('User')).tap();
    await expect(element(by.text('Sign In'))).toBeVisible();
  });
});
