// Shared test constants used across Jest and Playwright tests

export const AUTOCOMPLETE_TRIGGER = '<>';

export const MOCK_SUGGESTIONS = [
  { 
    text: "Claude's Investigations", 
    type: 'item', 
    description: "AI research projects", 
    tags: ['ai', 'research'], 
    source: 'global-brain-generic', 
    priority: 'high' 
  },
  { 
    text: "Urban vertical farming networks", 
    type: 'item', 
    description: "Sustainable agriculture", 
    tags: ['farming', 'sustainability'], 
    source: 'global-brain-generic', 
    priority: 'medium' 
  },
  { 
    text: "hello world", 
    type: 'item', 
    description: "Basic greeting", 
    tags: ['greeting'], 
    source: 'global-brain-generic', 
    priority: 'medium' 
  },
] as const;

export const TEST_SELECTORS = {
  EDITOR: '[contenteditable]',
  AUTOCOMPLETE_DROPDOWN: '.autocomplete-dropdown',
  SUGGESTION_ITEM: '.suggestion-item',
} as const;

export const TEST_DELAYS = {
  SHORT: 50,
  MEDIUM: 100,
  LONG: 500,
} as const;