// Jest setup file for testing configuration
import '@testing-library/jest-dom';

// Mock console methods to reduce noise in test output while keeping important logs
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Override console methods to show test-related logs but suppress React warnings
console.log = (...args) => {
  const message = args.join(' ');
  // Only show logs that contain test-related keywords
  if (message.includes('===') || message.includes('Step:') || message.includes('Result:') || message.includes('🧪') || message.includes('✅') || message.includes('❌')) {
    originalLog(...args);
  }
};

console.error = (...args) => {
  const message = args.join(' ');
  // Suppress known React warnings but show actual errors
  if (!message.includes('Warning: ReactDOM.render is deprecated') && 
      !message.includes('Warning: React.createFactory is deprecated')) {
    originalError(...args);
  }
};

console.warn = (...args) => {
  const message = args.join(' ');
  // Suppress most warnings except test-related ones
  if (message.includes('Test') || message.includes('test')) {
    originalWarn(...args);
  }
};

// Global test utilities
global.testHelper = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockTimers: () => {
    jest.useFakeTimers();
    return {
      advance: (ms) => jest.advanceTimersByTime(ms),
      restore: () => jest.useRealTimers(),
    };
  },
  
  log: (message) => originalLog(`🧪 Test: ${message}`),
  
  expectWithLog: (actual, expected, testName) => {
    originalLog(`🔍 ${testName}: Expecting "${actual}" to equal "${expected}"`);
    return expect(actual).toBe(expected);
  }
};

// Enhanced matchers for better test output
expect.extend({
  toBeVisibleInDOM(received) {
    const pass = received && received.style.display !== 'none' && received.style.visibility !== 'hidden';
    if (pass) {
      return {
        message: () => `expected element not to be visible in DOM`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to be visible in DOM`,
        pass: false,
      };
    }
  },
});
