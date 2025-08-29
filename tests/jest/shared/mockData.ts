import { AutocompleteItem } from '../../../src/types/GlobalBrainTypes';

// Simple test suggestions
export const testSuggestions: AutocompleteItem[] = [
  { text: 'hello', type: 'item', description: 'Simple greeting' },
  { text: 'world', type: 'item', description: 'Planet Earth' },
  { text: 'test', type: 'item', description: 'Testing item' },
];

// Complex test suggestions
export const complexSuggestions: AutocompleteItem[] = [
  { text: 'Claude\'s Investigations', type: 'item', description: 'Research projects' },
  { text: 'Urban Planning', type: 'item', description: 'City design' },
  { text: 'hello world example', type: 'item', description: 'Programming basics' },
];

// Edge case test data
export const edgeCaseSuggestions: AutocompleteItem[] = [
  { text: '>>>>', type: 'item', description: 'Arrow symbols' },
  { text: '<<<<', type: 'item', description: 'Left arrows' },
  { text: 'café', type: 'item', description: 'Unicode text' },
  { text: '🚀', type: 'item', description: 'Emoji rocket' },
  { text: '!@#$%', type: 'item', description: 'Special chars' },
];

// Empty data for testing
export const emptySuggestions: AutocompleteItem[] = [];

// Large dataset for performance testing
export const largeSuggestions: AutocompleteItem[] = Array.from({ length: 1000 }, (_, i) => ({
  text: `item${i}`,
  type: 'item' as const,
  description: `Test item number ${i}`,
}));