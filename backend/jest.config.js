module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/config/logger.js'
    ],
    coverageReporters: ['text', 'text-summary', 'lcov'],
    testTimeout: 10000,
    setupFiles: ['<rootDir>/tests/setup.js'],
    verbose: true
};
