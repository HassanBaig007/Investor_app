module.exports = {
  testTimeout: 180000,
  testMatch: ['**/*.e2e.js'],
  maxWorkers: 1,
  reporters: ['detox/runners/jest/reporter'],
  testRunner: 'jest-circus/runner',
  setupFilesAfterEnv: ['./init.js'],
  verbose: true,
};
