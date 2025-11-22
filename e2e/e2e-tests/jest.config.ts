export default {
  displayName: 'e2e-tests',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/e2e/e2e-tests',
  testMatch: ['**/src/**/*.e2e-spec.ts'],
  testTimeout: 60000, // E2E tests may take longer
  bail: 1, // Stop on first failure
  verbose: true,
};
