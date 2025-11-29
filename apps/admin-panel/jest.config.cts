module.exports = {
  displayName: 'admin-panel',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/admin-panel',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',  // Integration tests require full application context
  ],
};
