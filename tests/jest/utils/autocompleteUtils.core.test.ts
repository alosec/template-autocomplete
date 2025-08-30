import { detectTrigger, filterSuggestions } from '../../../src/editor/utils/autocompleteUtils';
import { testSuggestions, complexSuggestions } from '../shared/mockData';
import { TestLogger } from '../../shared/testHelpers';

describe('Autocomplete Utils - Core Functions', () => {
  describe('detectTrigger', () => {
    it('detects simple trigger at end of text', () => {
      const logger = new TestLogger('detectTrigger - simple trigger').start(
        'Verify basic trigger detection at end of text'
      );
      
      logger.step('Testing detectTrigger with text: "Hello <>world" at position 13');
      const result = detectTrigger('Hello <>world', 13);
      
      logger.result(`Found: ${result.found}, TriggerIndex: ${result.triggerIndex}, MatchString: "${result.matchString}"`);
      
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(6);
      expect(result.matchString).toBe('world');
      
      logger.success('Simple trigger detection working correctly');
    });

    it('detects trigger with empty match', () => {
      const logger = new TestLogger('detectTrigger - empty match').start(
        'Verify trigger detection when no text follows trigger'
      );
      
      logger.step('Testing detectTrigger with text: "Hello <>" at position 8');
      const result = detectTrigger('Hello <>', 8);
      
      logger.result(`Found: ${result.found}, TriggerIndex: ${result.triggerIndex}, MatchString: "${result.matchString}"`);
      
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(6);
      expect(result.matchString).toBe('');
      
      logger.success('Empty match trigger detection working correctly');
    });

    it('returns false when no trigger found', () => {
      const logger = new TestLogger('detectTrigger - no trigger').start(
        'Verify function returns false when no trigger present'
      );
      
      logger.step('Testing detectTrigger with text: "Hello world" at position 5');
      const result = detectTrigger('Hello world', 5);
      
      logger.result(`Found: ${result.found}`);
      
      expect(result.found).toBe(false);
      
      logger.success('No trigger detection working correctly');
    });

    it('finds most recent trigger', () => {
      const logger = new TestLogger('detectTrigger - multiple triggers').start(
        'Verify function finds the most recent trigger when multiple exist'
      );
      
      logger.step('Testing detectTrigger with text: "<>first<>second" at position 15');
      const result = detectTrigger('<>first<>second', 15);
      
      logger.result(`Found: ${result.found}, TriggerIndex: ${result.triggerIndex}, MatchString: "${result.matchString}"`);
      
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(7);
      expect(result.matchString).toBe('second');
      
      logger.success('Multiple trigger detection working correctly');
    });
  });

  describe('filterSuggestions', () => {
    it('filters suggestions by match string', () => {
      const logger = new TestLogger('filterSuggestions - basic filtering').start(
        'Verify suggestions are filtered based on match string'
      );
      
      logger.step('Filtering suggestions with match string "Cl"');
      const result = filterSuggestions(testSuggestions, 'Cl');
      
      logger.result(`Found ${result.length} matching suggestions: ${result.map(s => s.text).join(', ')}`);
      
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Claude');
      
      logger.success('Basic suggestion filtering working correctly');
    });

    it('returns all suggestions when match string is empty', () => {
      const logger = new TestLogger('filterSuggestions - empty match').start(
        'Verify all suggestions returned when match string is empty'
      );
      
      logger.step('Filtering suggestions with empty match string');
      const result = filterSuggestions(testSuggestions, '');
      
      logger.result(`Found ${result.length} total suggestions`);
      
      expect(result).toHaveLength(testSuggestions.length);
      expect(result).toEqual(testSuggestions);
      
      logger.success('Empty match filtering working correctly');
    });

    it('is case insensitive', () => {
      const logger = new TestLogger('filterSuggestions - case insensitive').start(
        'Verify filtering is case insensitive'
      );
      
      logger.step('Testing case insensitive filtering with "CLAUDE" and "claude"');
      const upperResult = filterSuggestions(testSuggestions, 'CLAUDE');
      const lowerResult = filterSuggestions(testSuggestions, 'claude');
      
      logger.result(`Uppercase match: ${upperResult.length}, Lowercase match: ${lowerResult.length}`);
      
      expect(upperResult).toHaveLength(1);
      expect(lowerResult).toHaveLength(1);
      expect(upperResult[0].text).toBe(lowerResult[0].text);
      
      logger.success('Case insensitive filtering working correctly');
    });

    it('handles complex suggestions with special characters', () => {
      const logger = new TestLogger('filterSuggestions - special characters').start(
        'Verify filtering works with special characters and complex text'
      );
      
      logger.step('Filtering complex suggestions with special characters');
      const result = filterSuggestions(complexSuggestions, 'Special');
      
      logger.result(`Found ${result.length} matching complex suggestions`);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].text).toContain('Special chars');
      
      logger.success('Complex suggestion filtering working correctly');
    });
  });
});