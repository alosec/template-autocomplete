/**
 * Adversarial test data and edge case scenarios
 */

// The original adversarial string from the specification  
export const ADVERSARIAL_STRING = '<><><>>>>>><<<<>>><<<>>>';

// Complex nested trigger patterns
export const nestedTriggerPatterns = [
  '<<>><><<>>',
  '<<<>>><<<>>>',
  '<><><><><><>',
  '<><<>><>',
  '><><><><',
  '<><text<><more<',
  '<>a<>b<>c<>',
];

// Malformed trigger patterns
export const malformedTriggers = [
  '<<>>',
  '<><',
  '><>',
  '<<<>>>',
  '<',
  '>',
  '<>',
  '><',
];

// Special character test cases
export const specialCharacterCases = [
  '<>émoji🚀中文',
  '<>!@#$%^&*()',
  '<>tab\ttab',
  '<>quote"quote',
  '<>apostrophe\'apostrophe',
  '<>backslash\\backslash',
  '<>angle<bracket>',
  '<>multiple    spaces',
  '<>mixed123ABC!@#',
];

// Unicode and emoji test cases
export const unicodeCases = [
  '<>café',
  '<>🚀',
  '<>中文测试',
  '<>עברית',
  '<>العربية',
  '<>Ñiño',
  '<>Москва',
];

// Whitespace edge cases
export const whitespaceCases = [
  '<> space-at-start',
  '<>  multiple-spaces',
  '<>\ttab-character', 
  '<>   \t  mixed-whitespace',
  '<> trailing-space ',
  '<>middle space here',
  '<>\nnewline-character',
  '<>\r\nwindows-newline',
];

// Programming/code-like content
export const codeLikeCases = [
  '<>if (x > 0)',
  '<>SELECT * FROM',
  '<>function test()',
  '<>const x = 5',
  '<>class MyClass {',
  '<>import React from',
  '<>export default',
  '<>x<y>z',
];

// Performance stress test data
export const performanceTestData = {
  longString: 'a'.repeat(10000),
  manyTriggers: '<>trigger'.repeat(1000),
  massiveTriggerSpam: '<>'.repeat(500),
  rapidSequence: Array(100).fill(0).map((_, i) => `<>item${i}`),
};

// Boundary condition test cases
export const boundaryCases = [
  { text: '<>text', cursor: 6, description: 'trigger at start' },
  { text: 'text<>', cursor: 6, description: 'trigger at end' },
  { text: 'before<>after', cursor: 5, description: 'cursor on trigger start' },
  { text: '<>text', cursor: 2, description: 'cursor right after trigger' },
  { text: '<>', cursor: 2, description: 'empty match string' },
  { text: '<>a', cursor: 3, description: 'single character match' },
];

// Multi-line content scenarios  
export const multiLineCases = [
  'Line 1\n<>trigger on line 2',
  '<>trigger\n\nwith empty line after',
  'Start\n<>middle\nEnd',
  '<>first\nsecond<>third\nfourth',
];

// Large content scenarios
export const largeCases = {
  largeDocument: 'Large content '.repeat(1000),
  manyAutocompleteNodes: Array(50).fill(0).map((_, i) => `AutoNode${i}`),
  mixedLargeContent: ['Text', 'AutocompleteNode', ' more text '].join('').repeat(100),
};

// Error-inducing scenarios
export const errorInducingCases = [
  '', // empty string
  null,
  undefined,
  '<>', // just trigger
  '><', // reversed trigger
  Array(10000).fill('<>').join(''), // massive repetition
  '\0\0\0', // null characters
  String.fromCharCode(0), // null character
];

// Cursor position test matrix for adversarial string
export const getAdversarialCursorPositions = (text: string = ADVERSARIAL_STRING) => {
  const positions = [];
  for (let i = 0; i <= text.length; i++) {
    positions.push({
      position: i,
      character: i < text.length ? text[i] : 'END',
      context: text.substring(Math.max(0, i - 3), i + 3)
    });
  }
  return positions;
};

// Test scenario builder
export const createTestScenario = (
  name: string,
  text: string,
  cursorPosition: number,
  expectedTriggerFound: boolean,
  expectedMatchString?: string
) => ({
  name,
  text,
  cursorPosition,
  expected: {
    found: expectedTriggerFound,
    matchString: expectedMatchString
  }
});