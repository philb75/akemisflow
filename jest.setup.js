// Jest setup file

// Mock environment variables for tests
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NODE_ENV = 'test'

// Suppress console errors and warnings in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
    // Keep log for debugging when needed
    log: console.log,
  }
}