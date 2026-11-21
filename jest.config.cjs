module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: {
      target: 'ES2023', module: 'CommonJS', types: ['node', 'jest'],
      strict: true, esModuleInterop: true, skipLibCheck: true,
    } }],
  },
};
