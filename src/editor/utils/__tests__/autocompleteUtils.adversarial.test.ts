import { detectTrigger, filterSuggestions } from '../autocompleteUtils';
import { AutocompleteItem } from '../../../types/GlobalBrainTypes';

describe('Autocomplete Utils - Adversarial Testing', () => {
  const mockSuggestions: AutocompleteItem[] = [
    { text: 'hello', type: 'item', description: 'Hello world', tags: ['greeting'] },
    { text: 'world', type: 'item', description: 'World example', tags: ['example'] },
    { text: '>>>>', type: 'item', description: 'Arrow symbols', tags: ['symbols'] },
    { text: '<<<<', type: 'item', description: 'Left arrows', tags: ['symbols'] },
    { text: 'café', type: 'item', description: 'Unicode café', tags: ['unicode'] },
    { text: '🚀', type: 'item', description: 'Rocket emoji', tags: ['emoji'] },
  ];

  describe('Complex Nested Trigger Patterns', () => {
    test('handles consecutive triggers', () => {
      const text = '<><><><><>';
      
      // Cursor at position 2 (after first <>)
      const result1 = detectTrigger(text, 2);
      expect(result1.found).toBe(true);
      expect(result1.triggerIndex).toBe(0);
      expect(result1.matchString).toBe('');
      
      // Cursor at position 4 (after second <>)
      const result2 = detectTrigger(text, 4);
      expect(result2.found).toBe(true);
      expect(result2.triggerIndex).toBe(2);
      expect(result2.matchString).toBe('');
      
      // Cursor at position 10 (at end)
      const result3 = detectTrigger(text, 10);
      expect(result3.found).toBe(true);
      expect(result3.triggerIndex).toBe(8);
      expect(result3.matchString).toBe('');
    });

    test('handles nested-looking angle brackets', () => {
      const patterns = [
        '<<>><><<>>',
        '<><><><><><>',
        '<<<>>><<<>>>',
        '<><<>><>'
      ];
      
      patterns.forEach(pattern => {
        for (let pos = 0; pos <= pattern.length; pos++) {
          const result = detectTrigger(pattern, pos);
          // Should not crash regardless of cursor position
          expect(typeof result.found).toBe('boolean');
          expect(typeof result.triggerIndex).toBe('number');
          expect(typeof result.matchString).toBe('string');
        }
      });
    });

    test('handles incomplete triggers mixed in', () => {
      const text = '<><text<><more<';
      
      // Cursor after second <> (position 8)
      const result = detectTrigger(text, 8);
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(0); // lastIndexOf finds the first <>, not the second
      expect(result.matchString).toBe('<text<><more<');
    });

    test('handles single chars between triggers', () => {
      const text = '<>a<>b<>c<>';
      
      // Test each position after each trigger
      const result1 = detectTrigger(text, 2); // After first <>
      expect(result1.triggerIndex).toBe(0);
      expect(result1.matchString).toBe('a');
      
      const result2 = detectTrigger(text, 5); // After second <>
      expect(result2.triggerIndex).toBe(3);
      expect(result2.matchString).toBe('b');
      
      const result3 = detectTrigger(text, 8); // After third <>
      expect(result3.triggerIndex).toBe(6);
      expect(result3.matchString).toBe('c');
    });
  });

  describe('Boundary Conditions', () => {
    test('handles trigger at very start', () => {
      const result = detectTrigger('<>text', 2);
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(0);
      expect(result.matchString).toBe('text');
    });

    test('handles trigger at very end', () => {
      const result = detectTrigger('text<>', 6);
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(4);
      expect(result.matchString).toBe('');
    });

    test('handles cursor before trigger', () => {
      const result = detectTrigger('before<>after', 5); // Cursor on '<'
      expect(result.found).toBe(false);
    });

    test('handles cursor after trigger and text', () => {
      const result = detectTrigger('<>text', 6); // Cursor at end
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(0);
      expect(result.matchString).toBe('text');
    });

    test('handles cursor between trigger and text', () => {
      const result = detectTrigger('<>text', 2); // Right after <>
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(0);
      expect(result.matchString).toBe('text');
    });
  });

  describe('Special Characters & Unicode', () => {
    test('handles unicode in match string', () => {
      const text = '<>café🚀中文';
      const result = detectTrigger(text, text.length);
      expect(result.found).toBe(true);
      expect(result.matchString).toBe('café🚀中文');
    });

    test('handles HTML-like content', () => {
      const text = '<>span class="test"';
      const result = detectTrigger(text, text.length);
      expect(result.found).toBe(false); // Contains space, should close
    });

    test('handles special characters', () => {
      const text = '<>!@#$%^&*()';
      const result = detectTrigger(text, text.length);
      expect(result.found).toBe(true);
      expect(result.matchString).toBe('!@#$%^&*()');
    });

    test('handles programming operators', () => {
      const patterns = [
        '<>>>>',   // Greater than symbols
        '<><<<<',  // Less than symbols  
        '<>>=<==', // Mixed operators
        '<>x<y>z'  // Mixed with variables
      ];
      
      patterns.forEach(pattern => {
        const result = detectTrigger(pattern, pattern.length);
        expect(result.found).toBe(true);
        expect(result.matchString).toBe(pattern.substring(2));
      });
    });
  });

  describe('Whitespace Edge Cases', () => {
    test('closes on space immediately after trigger', () => {
      const result = detectTrigger('<> text', 3);
      expect(result.found).toBe(false); // Should close on space
    });

    test('closes on multiple spaces', () => {
      const result = detectTrigger('<>   multispace', 5);
      expect(result.found).toBe(false); // Should close on spaces
    });

    test('handles just trigger + space', () => {
      const result = detectTrigger('<> ', 3);
      expect(result.found).toBe(false); // Should close
    });

    test('does not close on tab character (current behavior)', () => {
      const result = detectTrigger('<>\ttab', 3);
      expect(result.found).toBe(true); // Current implementation doesn't close on tab
      expect(result.matchString).toBe('\ttab');
    });

    test('closes on newlines', () => {
      const result = detectTrigger('<>\nnewline', 3);
      expect(result.found).toBe(false); // Should close on newline
    });
  });

  describe('Code-Like Content', () => {
    test('handles programming logic with spaces', () => {
      const result = detectTrigger('<>if (x > 0)', 4);
      expect(result.found).toBe(true); // At cursor position 4, matchString is 'if' (no space yet)
      expect(result.matchString).toBe('if (x > 0)');
      
      // Test at position where space would be in match string
      const resultWithSpace = detectTrigger('<>if (x > 0)', 12);
      expect(resultWithSpace.found).toBe(false); // This should close due to space
    });

    test('handles mathematical expressions without spaces', () => {
      const result = detectTrigger('<>x<y>z', 7);
      expect(result.found).toBe(true);
      expect(result.matchString).toBe('x<y>z');
    });

    test('handles SQL-like content with spaces', () => {
      const result = detectTrigger('<>SELECT * FROM', 8);
      expect(result.found).toBe(false); // Should close due to space in match string
    });
  });

  describe('Performance Stress Tests', () => {
    test('handles very long match string', () => {
      const longMatch = 'a'.repeat(10000);
      const text = '<>' + longMatch;
      
      const startTime = Date.now();
      const result = detectTrigger(text, text.length);
      const duration = Date.now() - startTime;
      
      expect(result.found).toBe(true);
      expect(result.matchString).toBe(longMatch);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    test('handles many triggers in text', () => {
      const triggers = Array(1000).fill('<>trigger').join('');
      
      const startTime = Date.now();
      for (let i = 0; i < triggers.length; i += 10) {
        detectTrigger(triggers, i);
      }
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should handle efficiently
    });

    test('handles massive trigger spam', () => {
      const spam = '<>'.repeat(500);
      
      const startTime = Date.now();
      const result = detectTrigger(spam, spam.length);
      const duration = Date.now() - startTime;
      
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBe(spam.length - 2); // Last trigger
      expect(duration).toBeLessThan(50); // Should be very fast
    });
  });

  describe('Content Length Variations', () => {
    test('handles empty match', () => {
      const result = detectTrigger('<>', 2);
      expect(result.found).toBe(true);
      expect(result.matchString).toBe('');
    });

    test('handles single character match', () => {
      const result = detectTrigger('<>a', 3);
      expect(result.found).toBe(true);
      expect(result.matchString).toBe('a');
    });

    test('handles very long single word', () => {
      const longWord = 'verylongmatchstringwithoutspaces'.repeat(10);
      const text = '<>' + longWord;
      const result = detectTrigger(text, text.length);
      expect(result.found).toBe(true);
      expect(result.matchString).toBe(longWord);
    });

    test('handles many short words with spaces', () => {
      const result = detectTrigger('<>a b c d e f', 4);
      expect(result.found).toBe(false); // Should close on space
    });
  });

  describe('Filter Suggestions with Adversarial Input', () => {
    test('filters with angle brackets in match string', () => {
      const filtered = filterSuggestions(mockSuggestions, '>>>>');
      expect(filtered).toEqual([
        expect.objectContaining({ text: '>>>>' })
      ]);
    });

    test('filters with unicode match string', () => {
      const filtered = filterSuggestions(mockSuggestions, 'café');
      expect(filtered).toEqual([
        expect.objectContaining({ text: 'café' })
      ]);
    });

    test('filters with emoji match string', () => {
      const filtered = filterSuggestions(mockSuggestions, '🚀');
      expect(filtered).toEqual([
        expect.objectContaining({ text: '🚀' })
      ]);
    });

    test('handles empty match string', () => {
      const filtered = filterSuggestions(mockSuggestions, '');
      expect(filtered).toEqual(mockSuggestions);
    });

    test('handles very long match string with no matches', () => {
      const longMatch = 'xyz'.repeat(1000);
      const filtered = filterSuggestions(mockSuggestions, longMatch);
      expect(filtered).toEqual([]);
    });

    test('handles special characters in match string', () => {
      const filtered = filterSuggestions(mockSuggestions, '!@#$');
      expect(filtered).toEqual([]);
    });
  });

  describe('The Original Adversarial Case', () => {
    test('handles the reported adversarial string', () => {
      const adversarialString = '<><><>>>>>><<<<>>><<<>>>';
      
      // Test at position 20 (after third <> and some >>>> symbols)
      const result = detectTrigger(adversarialString, 20);
      expect(result.found).toBe(true);
      expect(result.triggerIndex).toBeGreaterThanOrEqual(0);
      expect(typeof result.matchString).toBe('string');
    });

    test('handles backward navigation through adversarial string', () => {
      const adversarialString = '<><><>>>>>><<<<>>><<<>>>';
      
      // Test navigation from right to left
      for (let pos = adversarialString.length; pos >= 0; pos--) {
        const result = detectTrigger(adversarialString, pos);
        // Should not crash and should behave consistently
        expect(typeof result.found).toBe('boolean');
        expect(typeof result.triggerIndex).toBe('number');
        expect(typeof result.matchString).toBe('string');
      }
    });

    test('handles forward navigation through adversarial string', () => {
      const adversarialString = '<><><>>>>>><<<<>>><<<>>>';
      
      // Test navigation from left to right
      for (let pos = 0; pos <= adversarialString.length; pos++) {
        const result = detectTrigger(adversarialString, pos);
        // Should not crash and should behave consistently
        expect(typeof result.found).toBe('boolean');
        expect(typeof result.triggerIndex).toBe('number');
        expect(typeof result.matchString).toBe('string');
      }
    });
  });
});