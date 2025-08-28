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

// Mock DOM Selection.modify() method that JSDOM doesn't implement
global.Selection.prototype.modify = jest.fn(function(alter, direction, granularity) {
  // Basic implementation for test scenarios
  // alter: 'move' | 'extend'
  // direction: 'forward' | 'backward' | 'left' | 'right'  
  // granularity: 'character' | 'word' | 'lineboundary'
  
  if (!this.rangeCount) return;
  
  const range = this.getRangeAt(0);
  if (!range) return;
  
  // For backspace tests, we mainly need to handle backward character movement
  if (alter === 'move' && direction === 'backward' && granularity === 'character') {
    try {
      // Move the selection one character backward
      if (range.startOffset > 0) {
        range.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
        range.setEnd(range.startContainer, range.startOffset);
      } else if (range.startContainer.previousSibling) {
        // Try to move to previous sibling node
        const prevNode = range.startContainer.previousSibling;
        if (prevNode.nodeType === Node.TEXT_NODE) {
          range.setStart(prevNode, prevNode.textContent.length);
          range.setEnd(prevNode, prevNode.textContent.length);
        }
      }
    } catch (e) {
      // Ignore range errors in test environment
    }
  }
  
  // Handle other common cases for extend
  if (alter === 'extend' && direction === 'backward' && granularity === 'character') {
    try {
      if (range.startOffset > 0) {
        range.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
      }
    } catch (e) {
      // Ignore range errors in test environment
    }
  }
});

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
