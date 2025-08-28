import { AutocompleteItem } from '../../../../types/GlobalBrainTypes';

// Mock Global Brain Hook Data
export const mockGlobalBrainHook = () => ({
  useGlobalBrain: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
    suggestions: [
      { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
      { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
      { text: "Quantum computing applications", type: 'item', description: "Future computing paradigms", tags: ['quantum', 'computing'], source: 'global-brain-generic', priority: 'high' },
      { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
      { text: "test suggestion", type: 'item', description: "Test item", tags: ['test'], source: 'global-brain-generic', priority: 'low' },
      { text: "café", type: 'item', description: "Unicode test", tags: ['unicode'], source: 'global-brain-generic', priority: 'low' },
      { text: "🚀", type: 'item', description: "Emoji test", tags: ['emoji'], source: 'global-brain-generic', priority: 'low' },
      { text: ">>>>", type: 'item', description: "Special chars", tags: ['symbols'], source: 'global-brain-generic', priority: 'low' },
    ],
    getFilteredSuggestions: jest.fn((query = '') => {
      const allSuggestions = [
        { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
        { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
        { text: "Quantum computing applications", type: 'item', description: "Future computing paradigms", tags: ['quantum', 'computing'], source: 'global-brain-generic', priority: 'high' },
        { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
        { text: "test suggestion", type: 'item', description: "Test item", tags: ['test'], source: 'global-brain-generic', priority: 'low' },
        { text: "café", type: 'item', description: "Unicode test", tags: ['unicode'], source: 'global-brain-generic', priority: 'low' },
        { text: "🚀", type: 'item', description: "Emoji test", tags: ['emoji'], source: 'global-brain-generic', priority: 'low' },
        { text: ">>>>", type: 'item', description: "Special chars", tags: ['symbols'], source: 'global-brain-generic', priority: 'low' },
      ];
      if (!query.trim()) return allSuggestions;
      const queryLower = query.toLowerCase();
      const filtered = allSuggestions.filter(item => item.text.toLowerCase().includes(queryLower));
      return filtered.length > 0 ? filtered : [{
        text: query,
        type: 'item',
        description: `Custom entry: ${query}`,
        source: 'global-brain-generic',
        tags: ['custom'],
        priority: 'low'
      }];
    }),
    getSuggestionsByType: jest.fn(),
    getRandomSuggestions: jest.fn(),
    submitNewIdea: jest.fn(),
    totalItems: 8
  }))
});

// Standard Lexical Editor Configuration
export const createTestEditorConfig = (namespace: string = 'TestEditor') => ({
  namespace,
  nodes: [],  // Will be filled in by individual tests with AutocompleteNode
  onError: (error: Error) => {
    throw error;
  },
  theme: {},
});

// Common Autocomplete Suggestions for Testing
export const mockAutocompleteItems: AutocompleteItem[] = [
  { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
  { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
  { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
  { text: "café", type: 'item', description: "Unicode test", tags: ['unicode'], source: 'global-brain-generic', priority: 'low' },
  { text: "🚀", type: 'item', description: "Emoji test", tags: ['emoji'], source: 'global-brain-generic', priority: 'low' },
  { text: ">>>>", type: 'item', description: "Special chars", tags: ['symbols'], source: 'global-brain-generic', priority: 'low' },
];

// Test Document Content Samples  
export const testDocuments = {
  simple: 'Simple test content',
  withTrigger: 'Content with <>trigger',
  multiLine: 'Line 1\nLine 2\n\nLine 4',
  withUnicode: 'Unicode test: café 🚀 中文',
  withSpecialChars: 'Special: !@#$%^&*()',
  large: 'Large content '.repeat(100),
  adversarial: '<><><>>>>>><<<<>>><<<>>>',
};

// Common Adversarial Test Patterns
export const adversarialPatterns = {
  nestedAngles: ['<<>><><<>>', '<<<>>><<<>>>', '<><><><><><>', '<><<>><>'],
  consecutiveTriggers: '<><><><><>',
  malformedTriggers: ['<<>>', '<><', '><>', '<<<>>>'],
  specialCharacters: ['<>émoji🚀中文', '<>!@#$%^&*()', '<>tab\ttab', '<>quote"quote'],
  longContent: '<>' + 'a'.repeat(5000),
  rapidSequence: Array(20).fill('<>trigger').join(''),
};