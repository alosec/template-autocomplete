import { detectTrigger, filterSuggestions } from '../../../src/editor/utils/autocompleteUtils';
import { testSuggestions, complexSuggestions } from '../shared/mockData';

describe('Autocomplete Utils - Core Functions', () => {
  describe('detectTrigger', () => {
    it('detects simple trigger at end of text', () => {
      const result = detectTrigger('Hello <>world', 13);
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(6);
      expect(result.matchString).toBe('world');
    });

    it('detects trigger with empty match', () => {
      const result = detectTrigger('Hello <>', 8);
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(6);
      expect(result.matchString).toBe('');
    });

    it('returns false when no trigger found', () => {
      const result = detectTrigger('Hello world', 5);
      expect(result.found).toBe(false);
    });

    it('finds most recent trigger', () => {
      const result = detectTrigger('<>first<>second', 15);
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(7);
      expect(result.matchString).toBe('second');
    });
  });

  describe('filterSuggestions', () => {
    it('returns all suggestions for empty match', () => {
      const result = filterSuggestions(testSuggestions, '');
      expect(result).toEqual(testSuggestions);
    });

    it('filters suggestions by text match', () => {
      const result = filterSuggestions(testSuggestions, 'hel');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('hello');
    });

    it('filters suggestions case insensitively', () => {
      const result = filterSuggestions(testSuggestions, 'HEL');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('hello');
    });

    it('creates fallback suggestion when no matches', () => {
      const result = filterSuggestions(testSuggestions, 'xyz');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('xyz');
      expect(result[0].description).toBe('Custom entry: xyz');
    });

    it('handles complex suggestion text', () => {
      const result = filterSuggestions(complexSuggestions, 'Claude');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Claude\'s Investigations');
    });
  });
});