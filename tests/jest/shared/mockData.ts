// Mock data specifically for Jest unit tests

export const testSuggestions = [
  { text: 'Claude', value: 'Claude' },
  { text: 'Urban Planning', value: 'Urban Planning' },
  { text: 'hello world', value: 'hello world' },
  { text: 'JavaScript', value: 'JavaScript' },
];

export const complexSuggestions = [
  { text: 'Multi-word suggestion', value: 'Multi-word suggestion' },
  { text: 'Special chars: @#$%^&*()', value: 'Special chars: @#$%^&*()' },
  { text: 'Emoji test 🚀🎉', value: 'Emoji test 🚀🎉' },
  { text: 'Very long suggestion that tests text wrapping and edge cases in the autocomplete system', value: 'Very long suggestion that tests text wrapping and edge cases in the autocomplete system' },
];

export const edgeCaseSuggestions = [
  { text: '', value: '' },
  { text: ' ', value: ' ' },
  { text: '   spaces   ', value: '   spaces   ' },
  { text: '\n\t', value: '\n\t' },
  { text: 'null', value: 'null' },
  { text: 'undefined', value: 'undefined' },
];

export const performanceTestData = Array.from({ length: 1000 }, (_, i) => ({
  text: `Performance test item ${i}`,
  value: `performance-item-${i}`,
}));

export const mockEditorState = {
  text: 'Sample editor content',
  cursor: 0,
  selection: { start: 0, end: 0 },
};

export const mockAutocompleteState = {
  isOpen: false,
  suggestions: testSuggestions,
  selectedIndex: -1,
  triggerIndex: -1,
  matchString: '',
};