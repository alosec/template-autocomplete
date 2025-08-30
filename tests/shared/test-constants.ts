// Shared constants used across Jest and Playwright tests

export const AUTOCOMPLETE_TRIGGER = '<>';

export const TEST_SUGGESTIONS = [
  { text: 'Claude', value: 'Claude' },
  { text: 'Urban Planning', value: 'Urban Planning' },
  { text: 'hello world', value: 'hello world' },
  { text: 'JavaScript', value: 'JavaScript' },
  { text: 'TypeScript', value: 'TypeScript' },
];

export const COMPLEX_SUGGESTIONS = [
  { text: 'Multi-word suggestion with spaces', value: 'Multi-word suggestion with spaces' },
  { text: 'Suggestion with "quotes"', value: 'Suggestion with "quotes"' },
  { text: 'Special chars: @#$%', value: 'Special chars: @#$%' },
  { text: '🎉 Emoji suggestion', value: '🎉 Emoji suggestion' },
];

export const SELECTORS = {
  editor: '[contenteditable]',
  dropdown: '.autocomplete-dropdown',
  dropdownItem: '.autocomplete-item',
  autocompleteNode: '[data-lexical-autocomplete="true"]',
} as const;

export const TIMEOUTS = {
  short: 100,
  medium: 500,
  long: 1000,
  veryLong: 3000,
} as const;

export const TEST_TEXT_SAMPLES = {
  simple: 'Hello world',
  withTrigger: 'Hello <>world',
  multipleTriggers: 'First <>one and second <>two',
  longText: 'This is a very long piece of text that contains multiple words and should test various scenarios with autocomplete functionality including edge cases',
} as const;