// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock DOM APIs that JSDOM doesn't support
global.Range.prototype.getBoundingClientRect = jest.fn(() => ({
  bottom: 120,
  height: 20,
  left: 100,
  right: 200,
  top: 100,
  width: 100,
  x: 100,
  y: 100,
  toJSON: () => {}
}));

global.HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
  bottom: 600,
  height: 600,
  left: 0,
  right: 800,
  top: 0,
  width: 800,
  x: 0,
  y: 0,
  toJSON: () => {}
}));

global.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock fetch for global-brain-autocomplete.json
const mockGlobalBrainData = {
  metadata: {
    version: "test-1.0",
    lastUpdated: new Date().toISOString(),
    totalItems: 10,
    extractionStats: {
      totalItems: 10,
      validItems: 10,
      skippedItems: 0,
      averageTextLength: 25
    }
  },
  suggestions: [
    { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
    { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
    { text: "Quantum computing applications", type: 'item', description: "Future computing paradigms", tags: ['quantum', 'computing'], source: 'global-brain-generic', priority: 'high' },
    { text: "café", type: 'item', description: "Unicode test", tags: ['unicode'], source: 'global-brain-generic', priority: 'low' },
    { text: "🚀", type: 'item', description: "Emoji test", tags: ['emoji'], source: 'global-brain-generic', priority: 'low' },
    { text: ">>>>", type: 'item', description: "Special chars", tags: ['symbols'], source: 'global-brain-generic', priority: 'low' },
    { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
    { text: "test<>brackets", type: 'item', description: "Angle bracket test", tags: ['test'], source: 'global-brain-generic', priority: 'low' },
    { text: "very long suggestion text that exceeds normal length", type: 'item', description: "Long text test", tags: ['long'], source: 'global-brain-generic', priority: 'low' },
    { text: "!@#$%^&*()", type: 'item', description: "Special characters", tags: ['special'], source: 'global-brain-generic', priority: 'low' }
  ]
};

global.fetch = jest.fn((url) => {
  if (url.includes('global-brain-autocomplete.json')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockGlobalBrainData),
    });
  }
  return Promise.reject(new Error('Unmocked fetch URL: ' + url));
});

// Ensure fetch is restored after each test
beforeEach(() => {
  global.fetch.mockClear();
});
