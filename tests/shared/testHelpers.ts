// Common helper functions used across Jest and Playwright tests

export function logTestStart(testName: string, description?: string) {
  console.log(`\n=== ${testName} ===`);
  if (description) {
    console.log(`Purpose: ${description}`);
  }
}

export function logTestStep(step: string, detail?: string) {
  console.log(`Step: ${step}`);
  if (detail) {
    console.log(`  → ${detail}`);
  }
}

export function logTestResult(result: string, expected?: string) {
  console.log(`Result: ${result}`);
  if (expected) {
    console.log(`Expected: ${expected}`);
  }
}

export function createMockSuggestion(text: string, value?: string) {
  return {
    text,
    value: value || text,
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function generateTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class TestLogger {
  private testName: string;
  
  constructor(testName: string) {
    this.testName = testName;
  }
  
  start(description?: string) {
    logTestStart(this.testName, description);
    return this;
  }
  
  step(step: string, detail?: string) {
    logTestStep(step, detail);
    return this;
  }
  
  result(result: string, expected?: string) {
    logTestResult(result, expected);
    return this;
  }
  
  error(error: string) {
    console.error(`❌ Error in ${this.testName}: ${error}`);
    return this;
  }
  
  success(message?: string) {
    console.log(`✅ ${this.testName} completed${message ? ': ' + message : ''}`);
    return this;
  }
}