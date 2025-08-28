import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { 
  $getRoot, 
  $createTextNode, 
  $getSelection, 
  $isRangeSelection, 
  $createParagraphNode,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND
} from 'lexical';
import { act } from '@testing-library/react';
import AutocompletePlugin from '../AutocompletePlugin';
import { AutocompleteNode, $isAutocompleteNode } from '../../nodes/AutocompleteNode';
import { 
  insertTextIntoEditor,
  createComplexTriggerScenario,
  getAutocompleteDropdown,
  getAutocompleteSuggestions,
  getSelectedSuggestion,
  isAutocompleteActive,
  waitForDOMUpdate,
  measurePerformance,
  simulateRapidInteraction,
  moveCursorTo,
  getEditorTextContent,
} from '../../utils/__tests__/testUtils';

// Mock the useGlobalBrain hook
jest.mock('../../../hooks/useGlobalBrain', () => ({
  useGlobalBrain: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
    suggestions: [
      { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
      { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
      { text: "Quantum computing applications", type: 'item', description: "Future computing paradigms", tags: ['quantum', 'computing'], source: 'global-brain-generic', priority: 'high' },
      { text: "café", type: 'item', description: "Unicode test", tags: ['unicode'], source: 'global-brain-generic', priority: 'low' },
      { text: "🚀", type: 'item', description: "Emoji test", tags: ['emoji'], source: 'global-brain-generic', priority: 'low' },
      { text: ">>>>", type: 'item', description: "Special chars", tags: ['symbols'], source: 'global-brain-generic', priority: 'low' },
      { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
    ],
    getFilteredSuggestions: jest.fn((query = '') => {
      const allSuggestions = [
        { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
        { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
        { text: "Quantum computing applications", type: 'item', description: "Future computing paradigms", tags: ['quantum', 'computing'], source: 'global-brain-generic', priority: 'high' },
        { text: "café", type: 'item', description: "Unicode test", tags: ['unicode'], source: 'global-brain-generic', priority: 'low' },
        { text: "🚀", type: 'item', description: "Emoji test", tags: ['emoji'], source: 'global-brain-generic', priority: 'low' },
        { text: ">>>>", type: 'item', description: "Special chars", tags: ['symbols'], source: 'global-brain-generic', priority: 'low' },
        { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
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
    totalItems: 7
  }))
}));

const editorConfig = {
  namespace: 'TestEditor',
  nodes: [AutocompleteNode],
  onError: (error: Error) => {
    throw error;
  },
  theme: {},
};

const TestEditor: React.FC = () => (
  <LexicalComposer initialConfig={editorConfig}>
    <PlainTextPlugin
      contentEditable={<ContentEditable data-testid="editor" />}
      placeholder={<div>Start writing...</div>}
      ErrorBoundary={LexicalErrorBoundary}
    />
    <AutocompletePlugin />
  </LexicalComposer>
);

describe('AutocompletePlugin - Adversarial Integration Testing', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Complex Trigger Pattern Edge Cases', () => {
    test('handles consecutive triggers at different cursor positions', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await createComplexTriggerScenario(lexicalEditorInstance, 'consecutive');

      // Test trigger activation at each position
      const triggerText = '<><><><><>';
      
      for (let pos = 2; pos <= triggerText.length; pos += 2) {
        await moveCursorTo(lexicalEditorInstance, pos);
        await waitForDOMUpdate(50);

        if (pos % 2 === 0) { // After each complete trigger
          await waitFor(() => {
            expect(isAutocompleteActive()).toBe(true);
          });
        }
      }
    });

    test('handles nested angle bracket patterns without crashing', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      const nestedPatterns = [
        '<<>><><<>>',
        '<<<>>><<<>>>',
        '<><><><><><>',
        '<><<>><>',
        '><><><><'
      ];

      for (const pattern of nestedPatterns) {
        await insertTextIntoEditor(lexicalEditorInstance, pattern);
        
        // Test cursor positions throughout the pattern
        for (let pos = 0; pos <= pattern.length; pos++) {
          await moveCursorTo(lexicalEditorInstance, pos);
          await waitForDOMUpdate(10);
          
          // Should not crash regardless of position
          expect(editor).toBeInTheDocument();
        }

        // Clear for next pattern
        await act(async () => {
          lexicalEditorInstance.update(() => {
            $getRoot().clear();
            $getRoot().append($createParagraphNode());
          });
        });
      }
    });

    test('handles the adversarial string from specification', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      const adversarialString = '<><><>>>>>><<<<>>><<<>>>';
      
      await insertTextIntoEditor(lexicalEditorInstance, adversarialString);

      // Test navigation through the entire string
      for (let pos = 0; pos <= adversarialString.length; pos++) {
        await moveCursorTo(lexicalEditorInstance, pos);
        await waitForDOMUpdate(5);
        
        // Should handle all positions without crashing
        expect(editor.textContent).toContain(adversarialString);
      }

      // Test backward navigation
      for (let pos = adversarialString.length; pos >= 0; pos--) {
        await moveCursorTo(lexicalEditorInstance, pos);
        await waitForDOMUpdate(5);
        
        // Should handle all positions without crashing
        expect(editor.textContent).toContain(adversarialString);
      }
    });

    test('handles triggers with special characters and unicode', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      const specialCases = [
        '<>émoji🚀中文',
        '<>!@#$%^&*()',
        '<>tab\ttab',
        '<>quote"quote',
        '<>apostrophe\'apostrophe',
        '<>backslash\\backslash',
        '<>angle<bracket>',
        '<>multiple    spaces',
        '<>mixed123ABC!@#'
      ];

      for (const testCase of specialCases) {
        await insertTextIntoEditor(lexicalEditorInstance, testCase);
        
        // Should trigger autocomplete
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(true);
        });

        // Should show suggestions without crashing
        const suggestions = getAutocompleteSuggestions();
        expect(suggestions.length).toBeGreaterThan(0);

        // Clear for next test
        await act(async () => {
          lexicalEditorInstance.update(() => {
            $getRoot().clear();
            $getRoot().append($createParagraphNode());
          });
        });
        
        await waitForDOMUpdate(50);
      }
    });
  });

  describe('Match String Detection Edge Cases', () => {
    test('handles newlines correctly (should close autocomplete)', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>test');
      
      // Should have autocomplete active
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Add newline - should close autocomplete
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      await waitForDOMUpdate(100);
      
      // Autocomplete should be closed
      expect(isAutocompleteActive()).toBe(false);
    });

    test('handles very long match strings without performance issues', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      const longText = 'a'.repeat(5000);
      const triggerWithLongText = '<>' + longText;

      const duration = await measurePerformance(async () => {
        await insertTextIntoEditor(lexicalEditorInstance, triggerWithLongText);
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(true);
        }, { timeout: 2000 });
      });

      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);

      // Should show fallback suggestion for very long strings
      const suggestions = getAutocompleteSuggestions();
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].textContent).toContain(longText.substring(0, 50));
    });

    test('handles whitespace edge cases in match strings', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      const whitespaceTests = [
        '<> space-at-start',
        '<>  multiple-spaces',
        '<>\ttab-character',
        '<>   \t  mixed-whitespace',
        '<> trailing-space ',
        '<>middle space here'
      ];

      for (const testCase of whitespaceTests) {
        await insertTextIntoEditor(lexicalEditorInstance, testCase);
        
        // Should handle whitespace gracefully
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(true);
        });

        const suggestions = getAutocompleteSuggestions();
        expect(suggestions.length).toBeGreaterThan(0);

        // Clear for next test
        await act(async () => {
          lexicalEditorInstance.update(() => {
            $getRoot().clear();
            $getRoot().append($createParagraphNode());
          });
        });
      }
    });

    test('handles boundary conditions at document start/end', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // Test at document start
      await insertTextIntoEditor(lexicalEditorInstance, '<>at-start');
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Clear and test at document end with content
      await insertTextIntoEditor(lexicalEditorInstance, 'content here <>at-end');
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Test edge case with just trigger
      await insertTextIntoEditor(lexicalEditorInstance, '<>');
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });
    });
  });

  describe('Suggestion Filtering and Updates', () => {
    test('updates suggestions dynamically as user types', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>');

      // Should show all suggestions initially
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      let suggestions = getAutocompleteSuggestions();
      const initialCount = suggestions.length;
      expect(initialCount).toBeGreaterThan(1);

      // Type more characters to filter
      await insertTextIntoEditor(lexicalEditorInstance, '<>urban');
      
      await waitFor(() => {
        const filteredSuggestions = getAutocompleteSuggestions();
        expect(filteredSuggestions.length).toBeLessThan(initialCount);
        expect(filteredSuggestions[0].textContent).toContain('Urban');
      });
    });

    test('handles rapid filtering without race conditions', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Rapidly change the match string
      const filterSequence = ['a', 'ab', 'abc', 'ab', 'a', ''];
      
      for (const filter of filterSequence) {
        await insertTextIntoEditor(lexicalEditorInstance, '<>' + filter);
        await waitForDOMUpdate(10);
      }

      // Should still be active and stable
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      const finalSuggestions = getAutocompleteSuggestions();
      expect(finalSuggestions.length).toBeGreaterThan(0);
    });

    test('shows fallback suggestions when no matches found', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // Use a search term that definitely won't match anything
      const unmatchableText = 'xyznomatchespossible123456';
      await insertTextIntoEditor(lexicalEditorInstance, '<>' + unmatchableText);

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Should show fallback suggestion
      const suggestions = getAutocompleteSuggestions();
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].textContent).toContain(unmatchableText);
    });
  });

  describe('Keyboard Navigation Stress Tests', () => {
    test('handles rapid arrow key navigation', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>test');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Rapidly press arrow keys
      const arrowSequence = Array(20).fill(0).map((_, i) => i % 2 === 0 ? 'ArrowDown' : 'ArrowUp');
      
      for (const arrow of arrowSequence) {
        fireEvent.keyDown(editor, { key: arrow, code: arrow });
        await waitForDOMUpdate(5);
      }

      // Should still be active and responsive
      expect(isAutocompleteActive()).toBe(true);
      const selectedSuggestion = getSelectedSuggestion();
      expect(selectedSuggestion).toBeTruthy();
    });

    test('handles navigation boundaries correctly', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>test');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      const suggestions = getAutocompleteSuggestions();
      const suggestionCount = suggestions.length;

      // Navigate to bottom
      for (let i = 0; i < suggestionCount + 5; i++) {
        fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
        await waitForDOMUpdate(5);
      }

      let selectedSuggestion = getSelectedSuggestion();
      expect(selectedSuggestion).toBeTruthy();

      // Navigate to top
      for (let i = 0; i < suggestionCount + 5; i++) {
        fireEvent.keyDown(editor, { key: 'ArrowUp', code: 'ArrowUp' });
        await waitForDOMUpdate(5);
      }

      selectedSuggestion = getSelectedSuggestion();
      expect(selectedSuggestion).toBeTruthy();
    });

    test('handles mixed keyboard and mouse interactions', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>hello');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Navigate with keyboard
      fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
      await waitForDOMUpdate(50);

      // Then interact with mouse
      const suggestions = getAutocompleteSuggestions();
      if (suggestions.length > 1) {
        fireEvent.mouseOver(suggestions[1]);
        await waitForDOMUpdate(50);
        
        // Both interactions should work smoothly
        expect(suggestions[1].classList.contains('selected')).toBe(true);
      }

      // Back to keyboard
      fireEvent.keyDown(editor, { key: 'ArrowUp', code: 'ArrowUp' });
      await waitForDOMUpdate(50);
      
      expect(isAutocompleteActive()).toBe(true);
    });
  });

  describe('Selection and Insertion Edge Cases', () => {
    test('handles Enter key selection at various states', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>hello');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Navigate to specific suggestion
      fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
      await waitForDOMUpdate(50);

      // Select with Enter
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      // Should have inserted autocomplete node
      const content = getEditorTextContent(lexicalEditorInstance);
      expect(content.length).toBeGreaterThan(0);
      expect(content).not.toBe('<>hello');
    });

    test('handles Tab key selection', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>world');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Select with Tab
      fireEvent.keyDown(editor, { key: 'Tab', code: 'Tab' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      // Should have inserted autocomplete node
      const content = getEditorTextContent(lexicalEditorInstance);
      expect(content.length).toBeGreaterThan(0);
    });

    test('handles selection with empty suggestion list', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // Start with valid trigger, then modify to invalid
      await insertTextIntoEditor(lexicalEditorInstance, '<>');
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Clear the match string programmatically to simulate edge case
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const textNode = paragraph.getFirstChild();
            if (textNode) {
              textNode.setTextContent('invalid_trigger');
            }
          }
        });
      });

      await waitForDOMUpdate(100);

      // Try to select with Enter when no suggestions
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      // Should handle gracefully
      expect(editor).toBeInTheDocument();
    });

    test('handles mouse click selection during rapid typing', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Simulate rapid typing while clicking
      const rapidActions = ['type', 'type', 'type'];
      const typingData = ['a', 'b', 'c'];

      // Start rapid interaction
      const rapidPromise = simulateRapidInteraction(lexicalEditorInstance, rapidActions, typingData);

      // Click on suggestion during typing
      await waitForDOMUpdate(20);
      const suggestions = getAutocompleteSuggestions();
      if (suggestions.length > 0) {
        fireEvent.click(suggestions[0]);
      }

      await rapidPromise;

      // Should handle the interaction gracefully
      await waitForDOMUpdate(100);
      expect(editor).toBeInTheDocument();
    });
  });

  describe('Complex Multi-Step Scenarios', () => {
    test('handles autocomplete within autocomplete (nested interaction)', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // First autocomplete
      await insertTextIntoEditor(lexicalEditorInstance, '<>hello');
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      // Add space and trigger second autocomplete
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            paragraph.append($createTextNode(' <>world'));
            
            // Position cursor at end
            const lastNode = paragraph.getLastChild();
            if (lastNode) {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                lastNode.select(lastNode.getTextContent().length, lastNode.getTextContent().length);
              }
            }
          }
        });
      });

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Should handle second autocomplete correctly
      const suggestions = getAutocompleteSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('handles undo/redo operations with autocomplete nodes', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      
      // Insert some autocomplete content
      await insertTextIntoEditor(lexicalEditorInstance, '<>test');
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      const contentAfterInsert = getEditorTextContent(lexicalEditorInstance);
      expect(contentAfterInsert).not.toBe('<>test');

      // Simulate undo
      fireEvent.keyDown(editor, { key: 'z', ctrlKey: true });
      await waitForDOMUpdate(100);

      // Simulate redo
      fireEvent.keyDown(editor, { key: 'y', ctrlKey: true });
      await waitForDOMUpdate(100);

      // Should maintain consistency
      expect(editor).toBeInTheDocument();
    });

    test('handles editor blur/focus during active autocomplete', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>focus');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Blur the editor
      fireEvent.blur(editor);
      await waitForDOMUpdate(100);

      // Focus back
      fireEvent.focus(editor);
      await user.click(editor);
      await waitForDOMUpdate(100);

      // Should handle focus changes gracefully
      expect(editor).toBeInTheDocument();
    });

    test('handles rapid escape key presses during stress conditions', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>escape');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Rapidly press escape multiple times while interacting
      const escapeSequence = Array(10).fill('Escape');
      
      for (const key of escapeSequence) {
        fireEvent.keyDown(editor, { key, code: key });
        
        // Add some other interactions
        fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
        await waitForDOMUpdate(5);
      }

      // Should eventually close and be stable
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      // Should be able to reopen
      await act(async () => {
        fireEvent.input(editor, { data: '<>reopen' });
      });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      }, { timeout: 2000 });
    });
  });

  describe('Performance and Memory Edge Cases', () => {
    test('handles massive suggestion lists without performance degradation', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      
      // Trigger with empty match to get all suggestions
      const duration = await measurePerformance(async () => {
        await insertTextIntoEditor(lexicalEditorInstance, '<>');
        
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(true);
        });
      });

      expect(duration).toBeLessThan(200); // Should be very fast

      // Navigation should also be fast
      const navigationDuration = await measurePerformance(async () => {
        for (let i = 0; i < 10; i++) {
          fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
          await waitForDOMUpdate(1);
        }
      });

      expect(navigationDuration).toBeLessThan(100);
    });

    test('handles component unmounting during active autocomplete', async () => {
      const { unmount } = render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      await insertTextIntoEditor(lexicalEditorInstance, '<>unmount');

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Unmount while active - should not cause memory leaks
      expect(() => unmount()).not.toThrow();
    });

    test('maintains performance with multiple rapid trigger/untrigger cycles', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      const duration = await measurePerformance(async () => {
        for (let i = 0; i < 50; i++) {
          // Trigger
          await insertTextIntoEditor(lexicalEditorInstance, '<>cycle' + i);
          
          // Brief wait
          await waitForDOMUpdate(5);
          
          // Clear
          await act(async () => {
            lexicalEditorInstance.update(() => {
              $getRoot().clear();
              $getRoot().append($createParagraphNode());
            });
          });
        }
      });

      // Should complete all cycles in reasonable time
      expect(duration).toBeLessThan(3000);
    });
  });
});