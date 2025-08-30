// Jest-specific testing utilities

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Custom render function for React components
export function renderWithLogging(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
  testName?: string
) {
  if (testName) {
    console.log(`\n🧪 Rendering component for test: ${testName}`);
  }
  
  const result = render(ui, options);
  
  if (testName) {
    console.log(`✅ Component rendered successfully for: ${testName}`);
  }
  
  return result;
}

// Mock console methods for testing
export function mockConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  console.log = jest.fn((...args) => {
    logs.push(args.join(' '));
    originalLog(...args);
  });
  
  console.error = jest.fn((...args) => {
    errors.push(args.join(' '));
    originalError(...args);
  });
  
  console.warn = jest.fn((...args) => {
    warnings.push(args.join(' '));
    originalWarn(...args);
  });
  
  return {
    logs,
    errors,
    warnings,
    restore() {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

// Helper for testing async operations
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

// Mock timer utilities
export function setupMockTimers() {
  jest.useFakeTimers();
  
  return {
    advanceBy(ms: number) {
      jest.advanceTimersByTime(ms);
    },
    advanceToNext() {
      jest.advanceTimersToNextTimer();
    },
    runAll() {
      jest.runAllTimers();
    },
    restore() {
      jest.useRealTimers();
    },
  };
}

// Assertion helpers with logging
export function expectWithLogging<T>(actual: T, testName?: string) {
  if (testName) {
    console.log(`🔍 Asserting condition for: ${testName}`);
    console.log(`   Actual value: ${JSON.stringify(actual)}`);
  }
  
  return expect(actual);
}