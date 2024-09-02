/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@/(.*)$': ['<rootDir>/$1'],
  },
  modulePathIgnorePatterns: ["playwright"],
  transform: {
    "^.+\\.[jt]sx$": ["babel-jest", {configFile: './babel.config.testing.js'}],
  },
  testMatch: ["**/*.test.tsx", "**/*.test.ts",
    "!**/api.test.ts",
  ],
  testPathIgnorePatterns: ['api-tests/.*']
};
