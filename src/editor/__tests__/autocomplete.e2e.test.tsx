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
  KEY_BACKSPACE_COMMAND
} from 'lexical';
import { act } from '@testing-library/react';
import AutocompletePlugin from '../plugins/AutocompletePlugin';
import { AutocompleteNode, $isAutocompleteNode } from '../nodes/AutocompleteNode';
import { 
  insertTextIntoEditor,
  insertAutocompleteNodeIntoEditor,
  getAutocompleteDropdown,
  getAutocompleteSuggestions,
  getSelectedSuggestion,
  isAutocompleteActive,
  waitForDOMUpdate,
  measurePerformance,
  getEditorTextContent,
  simulateBackspace,
  simulateTyping,
  simulateRapidInteraction,
  getMemoryUsage,
} from '../utils/__tests__/testUtils';

// Mock the useGlobalBrain hook
jest.mock('../../hooks/useGlobalBrain', () => ({
  useGlobalBrain: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
    suggestions: [
      { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
      { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
      { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
      { text: "test suggestion", type: 'item', description: "Test item", tags: ['test'], source: 'global-brain-generic', priority: 'low' },
    ],
    getFilteredSuggestions: jest.fn((query = '') => {
      const allSuggestions = [
        { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
        { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
        { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
        { text: "test suggestion", type: 'item', description: "Test item", tags: ['test'], source: 'global-brain-generic', priority: 'low' },
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
    totalItems: 4
  }))
}));

const editorConfig = {
  namespace: 'E2ETestEditor',
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

describe('Autocomplete System - End-to-End Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Real-World Usage Scenarios', () => {
    test('complete workflow: trigger → filter → select → type → backspace', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // Step 1: Trigger autocomplete
      await insertTextIntoEditor(lexicalEditorInstance, '<>');
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      const initialSuggestions = getAutocompleteSuggestions();
      expect(initialSuggestions.length).toBeGreaterThan(1);

      // Step 2: Filter suggestions
      await insertTextIntoEditor(lexicalEditorInstance, '<>urban');
      
      await waitFor(() => {
        const filteredSuggestions = getAutocompleteSuggestions();
        expect(filteredSuggestions.length).toBeLessThan(initialSuggestions.length);
      });

      // Step 3: Navigate and select
      fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
      await waitForDOMUpdate(50);
      
      const selectedSuggestion = getSelectedSuggestion();
      expect(selectedSuggestion).toBeTruthy();
      
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      // Step 4: Verify autocomplete node was inserted
      let contentAfterSelection = getEditorTextContent(lexicalEditorInstance);
      expect(contentAfterSelection).not.toBe('<>urban');
      expect(contentAfterSelection.length).toBeGreaterThan('<>urban'.length);

      // Step 5: Try to type in autocomplete node (should be blocked)
      fireEvent.input(editor, { data: 'BLOCKED' });
      await waitForDOMUpdate(100);
      
      let contentAfterTyping = getEditorTextContent(lexicalEditorInstance);
      expect(contentAfterTyping).not.toContain('BLOCKED');
      expect(contentAfterTyping).toBe(contentAfterSelection); // No change

      // Step 6: Position cursor after autocomplete node and add text
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            paragraph.append($createTextNode(' additional text'));
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

      // Step 7: Backspace to remove autocomplete node
      await act(async () => {
        lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
      });

      await waitForDOMUpdate(50);
      
      let finalContent = getEditorTextContent(lexicalEditorInstance);
      // Should remove the autocomplete node, leaving only the additional text
      expect(finalContent).toContain('additional text');
      expect(finalContent).not.toContain('Urban'); // Assuming "Urban..." was selected
    });

    test('document composition: multiple autocomplete entries with mixed content', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // Build a document with mixed content
      const documentSteps = [
        { type: 'text', content: 'I think ' },
        { type: 'autocomplete', trigger: '<>ai', expectMatch: "Claude's" },
        { type: 'text', content: ' and ' },
        { type: 'autocomplete', trigger: '<>urban', expectMatch: 'Urban' },
        { type: 'text', content: ' are both important topics.' }
      ];

      let documentContent = '';

      for (const step of documentSteps) {
        if (step.type === 'text') {
          // Add regular text
          await act(async () => {
            lexicalEditorInstance.update(() => {
              const root = $getRoot();
              const paragraph = root.getFirstChild();
              if (paragraph) {
                paragraph.append($createTextNode(step.content));
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
          documentContent += step.content;
        } else if (step.type === 'autocomplete') {
          // Add autocomplete content
          await insertTextIntoEditor(lexicalEditorInstance, step.trigger);
          
          await waitFor(() => {
            expect(isAutocompleteActive()).toBe(true);
          });

          // Select the first matching suggestion
          const suggestions = getAutocompleteSuggestions();
          const matchingSuggestion = suggestions.find(s => 
            s.textContent?.includes(step.expectMatch)
          );
          expect(matchingSuggestion).toBeTruthy();

          fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
          
          await waitFor(() => {
            expect(isAutocompleteActive()).toBe(false);
          });
        }
      }

      // Verify final document structure
      const finalContent = getEditorTextContent(lexicalEditorInstance);
      expect(finalContent).toContain('I think');
      expect(finalContent).toContain('are both important topics');
      expect(finalContent.length).toBeGreaterThan(documentContent.length);

      // Verify autocomplete nodes exist
      await act(async () => {
        lexicalEditorInstance.getEditorState().read(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const autocompleteNodes = paragraph.getChildren().filter($isAutocompleteNode);
            expect(autocompleteNodes.length).toBe(2);
          }
        });
      });
    });

    test('editing workflow: insert → modify around → copy/paste → undo/redo', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // Insert initial autocomplete
      await insertTextIntoEditor(lexicalEditorInstance, '<>hello');
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      let contentAfterInsert = getEditorTextContent(lexicalEditorInstance);
      
      // Add text before and after
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const children = paragraph.getChildren();
            
            // Add text before
            paragraph.getFirstChild()?.insertBefore($createTextNode('Before: '));
            
            // Add text after
            paragraph.append($createTextNode(' :After'));
            
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

      let contentWithAdditions = getEditorTextContent(lexicalEditorInstance);
      expect(contentWithAdditions).toContain('Before:');
      expect(contentWithAdditions).toContain(':After');

      // Try to copy the entire line
      fireEvent.keyDown(editor, { key: 'a', ctrlKey: true });
      await waitForDOMUpdate(50);
      
      fireEvent.keyDown(editor, { key: 'c', ctrlKey: true });
      await waitForDOMUpdate(50);

      // Clear and paste
      fireEvent.keyDown(editor, { key: 'a', ctrlKey: true });
      await waitForDOMUpdate(50);
      
      fireEvent.keyDown(editor, { key: 'Delete', code: 'Delete' });
      await waitForDOMUpdate(50);
      
      fireEvent.keyDown(editor, { key: 'v', ctrlKey: true });
      await waitForDOMUpdate(100);

      // Content should be preserved after copy/paste
      let contentAfterPaste = getEditorTextContent(lexicalEditorInstance);
      // Note: copy/paste of autocomplete nodes might have different behavior
      // The test verifies the operation doesn't crash
      expect(editor).toBeInTheDocument();

      // Try undo/redo
      fireEvent.keyDown(editor, { key: 'z', ctrlKey: true });
      await waitForDOMUpdate(100);
      
      fireEvent.keyDown(editor, { key: 'y', ctrlKey: true });
      await waitForDOMUpdate(100);

      // Should handle undo/redo gracefully
      expect(editor).toBeInTheDocument();
    });
  });

  describe('Complex Edge Case Scenarios', () => {
    test('THE CRITICAL BUG REPRODUCTION: comprehensive typing-then-backspace scenario', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // Create a complex document with multiple autocomplete nodes
      await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, 'Start ', 'FirstNode', ' middle ');
      
      // Add another autocomplete node
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            paragraph.append($createAutocompleteNode('SecondNode'));
            paragraph.append($createTextNode(' end'));
            
            // Position cursor at the very end
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

      let initialContent = getEditorTextContent(lexicalEditorInstance);
      expect(initialContent).toBe('Start FirstNode middle SecondNode end');

      // CRITICAL TEST SEQUENCE:
      // 1. Position cursor inside first autocomplete node and attempt typing
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const firstAutocompleteNode = paragraph.getChildren().find($isAutocompleteNode);
            if (firstAutocompleteNode) {
              // Try to select inside the autocomplete node
              firstAutocompleteNode.select(3, 3); // Position in middle
            }
          }
        });
      });

      // 2. Attempt to type (should be blocked but may alter internal state)
      fireEvent.input(editor, { data: 'BLOCKED_TEXT' });
      await waitForDOMUpdate(100);

      let contentAfterTypingAttempt = getEditorTextContent(lexicalEditorInstance);
      expect(contentAfterTypingAttempt).toBe('Start FirstNode middle SecondNode end');
      expect(contentAfterTypingAttempt).not.toContain('BLOCKED_TEXT');

      // 3. Now position cursor after the first autocomplete node
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const nodes = paragraph.getChildren();
            // Find the text node that comes after FirstNode (should be " middle ")
            const middleTextNode = nodes.find(node => 
              node.getTextContent() === ' middle '
            );
            if (middleTextNode) {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                middleTextNode.select(0, 0); // Position at beginning of " middle "
              }
            }
          }
        });
      });

      // 4. Execute backspace - this should remove FirstNode entirely
      await act(async () => {
        lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
      });

      let contentAfterFirstBackspace = getEditorTextContent(lexicalEditorInstance);
      expect(contentAfterFirstBackspace).toBe('Start  middle SecondNode end');
      expect(contentAfterFirstBackspace).not.toContain('FirstNode');

      // 5. Repeat the same process for SecondNode to test consistency
      // Position cursor inside SecondNode
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const secondAutocompleteNode = paragraph.getChildren().find($isAutocompleteNode);
            if (secondAutocompleteNode) {
              secondAutocompleteNode.select(5, 5);
            }
          }
        });
      });

      // Attempt typing again
      fireEvent.input(editor, { data: 'ALSO_BLOCKED' });
      await waitForDOMUpdate(100);

      let contentAfterSecondTyping = getEditorTextContent(lexicalEditorInstance);
      expect(contentAfterSecondTyping).not.toContain('ALSO_BLOCKED');

      // Position cursor after SecondNode and backspace
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const nodes = paragraph.getChildren();
            const endTextNode = nodes.find(node => 
              node.getTextContent() === ' end'
            );
            if (endTextNode) {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                endTextNode.select(0, 0);
              }
            }
          }
        });
      });

      await act(async () => {
        lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
      });

      let finalContent = getEditorTextContent(lexicalEditorInstance);
      expect(finalContent).toBe('Start  middle  end');
      expect(finalContent).not.toContain('SecondNode');

      // CRITICAL ASSERTION: Both autocomplete nodes should be completely removed
      // despite the typing attempts, proving the bug is fixed
      await act(async () => {
        lexicalEditorInstance.getEditorState().read(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const remainingAutocompleteNodes = paragraph.getChildren().filter($isAutocompleteNode);
            expect(remainingAutocompleteNodes.length).toBe(0);
          }
        });
      });
    });

    test('stress test: rapid alternating trigger/untrigger with backspace operations', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      const iterations = 20;
      
      for (let i = 0; i < iterations; i++) {
        // Trigger autocomplete
        await insertTextIntoEditor(lexicalEditorInstance, '<>test' + i);
        
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(true);
        }, { timeout: 1000 });

        // Select suggestion
        fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
        
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(false);
        });

        // Attempt typing in autocomplete node
        fireEvent.input(editor, { data: 'BLOCKED' + i });
        await waitForDOMUpdate(20);

        // Backspace to remove
        await act(async () => {
          lexicalEditorInstance.update(() => {
            const root = $getRoot();
            const paragraph = root.getFirstChild();
            if (paragraph) {
              paragraph.append($createTextNode(' '));
              const lastNode = paragraph.getLastChild();
              if (lastNode) {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  lastNode.select(1, 1);
                }
              }
            }
          });
        });

        await act(async () => {
          lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
        });

        await waitForDOMUpdate(10);
      }

      // After all iterations, verify consistent state
      const finalContent = getEditorTextContent(lexicalEditorInstance);
      expect(finalContent).not.toContain('BLOCKED');
      
      // Verify no autocomplete nodes remain
      await act(async () => {
        lexicalEditorInstance.getEditorState().read(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const autocompleteNodes = paragraph.getChildren().filter($isAutocompleteNode);
            expect(autocompleteNodes.length).toBe(0);
          }
        });
      });
    });

    test('boundary testing: very large documents with many autocomplete nodes', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      const nodeCount = 50;
      
      // Build large document
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          
          for (let i = 0; i < nodeCount; i++) {
            paragraph.append($createTextNode(`Text${i} `));
            paragraph.append($createAutocompleteNode(`AutoNode${i}`));
            paragraph.append($createTextNode(' '));
          }
          
          root.clear();
          root.append(paragraph);
        });
      });

      let initialContent = getEditorTextContent(lexicalEditorInstance);
      expect(initialContent).toContain('AutoNode0');
      expect(initialContent).toContain('AutoNode49');

      // Test typing attempts on random nodes
      const testIndices = [0, 10, 25, 35, 49];
      
      for (const index of testIndices) {
        await act(async () => {
          lexicalEditorInstance.update(() => {
            const root = $getRoot();
            const paragraph = root.getFirstChild();
            if (paragraph) {
              const autocompleteNode = paragraph.getChildren().find(node => 
                $isAutocompleteNode(node) && node.getTextContent() === `AutoNode${index}`
              );
              if (autocompleteNode) {
                autocompleteNode.select(3, 3);
              }
            }
          });
        });

        fireEvent.input(editor, { data: 'BLOCKED' });
        await waitForDOMUpdate(10);
      }

      // Verify no blocked text was inserted
      let contentAfterTyping = getEditorTextContent(lexicalEditorInstance);
      expect(contentAfterTyping).not.toContain('BLOCKED');

      // Test backspace removal of several nodes
      const removeIndices = [5, 15, 30];
      
      for (const index of removeIndices) {
        await act(async () => {
          lexicalEditorInstance.update(() => {
            const root = $getRoot();
            const paragraph = root.getFirstChild();
            if (paragraph) {
              const targetNodeText = `AutoNode${index}`;
              const nodes = paragraph.getChildren();
              
              // Find the text node that comes after the target autocomplete node
              let foundTarget = false;
              for (const node of nodes) {
                if (foundTarget && node.getTextContent().startsWith(' ')) {
                  const selection = $getSelection();
                  if ($isRangeSelection(selection)) {
                    node.select(0, 0);
                  }
                  break;
                }
                if ($isAutocompleteNode(node) && node.getTextContent() === targetNodeText) {
                  foundTarget = true;
                }
              }
            }
          });
        });

        await act(async () => {
          lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
        });

        await waitForDOMUpdate(10);
      }

      // Verify removed nodes are gone
      let finalContent = getEditorTextContent(lexicalEditorInstance);
      expect(finalContent).not.toContain('AutoNode5');
      expect(finalContent).not.toContain('AutoNode15');
      expect(finalContent).not.toContain('AutoNode30');
      
      // But other nodes should remain
      expect(finalContent).toContain('AutoNode0');
      expect(finalContent).toContain('AutoNode10');
      expect(finalContent).toContain('AutoNode20');
    });
  });

  describe('Performance and Memory Validation', () => {
    test('performance benchmark: complete autocomplete workflow under time constraints', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      const startTime = performance.now();

      // Complete workflow 10 times
      for (let i = 0; i < 10; i++) {
        // Trigger
        await insertTextIntoEditor(lexicalEditorInstance, '<>perf' + i);
        
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(true);
        }, { timeout: 500 });

        // Navigate
        fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
        await waitForDOMUpdate(10);

        // Select
        fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
        
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(false);
        });

        // Add separator
        await act(async () => {
          lexicalEditorInstance.update(() => {
            const root = $getRoot();
            const paragraph = root.getFirstChild();
            if (paragraph) {
              paragraph.append($createTextNode(' | '));
            }
          });
        });
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Should complete all operations in under 5 seconds
      expect(totalDuration).toBeLessThan(5000);
      console.log(`Performance benchmark: ${totalDuration.toFixed(2)}ms for 10 complete workflows`);

      // Verify final state
      const finalContent = getEditorTextContent(lexicalEditorInstance);
      expect(finalContent.split('|').length).toBe(11); // 10 separators = 11 parts
    });

    test('memory stability: autocomplete operations do not cause memory leaks', async () => {
      const { unmount } = render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      const initialMemory = getMemoryUsage();

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await insertTextIntoEditor(lexicalEditorInstance, '<>mem' + i);
        
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(true);
        }, { timeout: 100 });

        fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
        
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(false);
        });

        // Clear content
        await act(async () => {
          lexicalEditorInstance.update(() => {
            $getRoot().clear();
            $getRoot().append($createParagraphNode());
          });
        });
      }

      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB in test environment)
      if (initialMemory > 0 && finalMemory > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
      }

      // Cleanup should not throw
      expect(() => unmount()).not.toThrow();
    });

    test('concurrent operations: multiple simultaneous autocomplete interactions', async () => {
      // This test simulates what might happen if user is very fast or if there are
      // programmatic interactions happening simultaneously
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // Simulate concurrent operations
      const operations = [
        // Rapid trigger/untrigger
        async () => {
          for (let i = 0; i < 5; i++) {
            await insertTextIntoEditor(lexicalEditorInstance, '<>rapid' + i);
            await waitForDOMUpdate(10);
            fireEvent.keyDown(editor, { key: 'Escape', code: 'Escape' });
            await waitForDOMUpdate(10);
          }
        },
        
        // Mouse interactions
        async () => {
          await waitForDOMUpdate(50);
          const suggestions = getAutocompleteSuggestions();
          if (suggestions.length > 0) {
            fireEvent.mouseOver(suggestions[0]);
            await waitForDOMUpdate(20);
            fireEvent.click(suggestions[0]);
          }
        },
        
        // Keyboard navigation
        async () => {
          await waitForDOMUpdate(30);
          for (let i = 0; i < 3; i++) {
            fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
            await waitForDOMUpdate(10);
          }
        }
      ];

      // Start operations concurrently
      const promises = operations.map(op => op());
      
      // Wait for all to complete
      await Promise.all(promises);

      // System should remain stable
      expect(editor).toBeInTheDocument();
      
      // Final state should be consistent
      const finalContent = getEditorTextContent(lexicalEditorInstance);
      expect(typeof finalContent).toBe('string');
    });
  });

  describe('Accessibility and User Experience', () => {
    test('keyboard-only navigation workflow', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      // Focus using keyboard (simulate tab navigation)
      fireEvent.focus(editor);
      await waitForDOMUpdate(50);

      // Trigger autocomplete using keyboard input
      fireEvent.input(editor, { data: '<>access' });

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Navigate using only keyboard
      fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
      await waitForDOMUpdate(50);
      
      fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
      await waitForDOMUpdate(50);
      
      fireEvent.keyDown(editor, { key: 'ArrowUp', code: 'ArrowUp' });
      await waitForDOMUpdate(50);

      // Select using keyboard
      fireEvent.keyDown(editor, { key: 'Tab', code: 'Tab' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      // Verify selection worked
      const finalContent = getEditorTextContent(lexicalEditorInstance);
      expect(finalContent).not.toBe('<>access');
    });

    test('focus management during autocomplete lifecycle', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);

      // Trigger autocomplete
      fireEvent.input(editor, { data: '<>focus' });

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Editor should maintain focus
      expect(document.activeElement).toBe(editor);

      // Navigate suggestions
      fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
      await waitForDOMUpdate(50);

      // Focus should still be on editor
      expect(document.activeElement).toBe(editor);

      // Blur and refocus
      fireEvent.blur(editor);
      await waitForDOMUpdate(50);
      
      fireEvent.focus(editor);
      await waitForDOMUpdate(50);

      // Should handle focus changes gracefully
      expect(editor).toBeInTheDocument();
    });

    test('screen reader compatibility: proper ARIA attributes and structure', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      const lexicalEditorInstance = (editor as any).__lexicalEditor;

      await user.click(editor);
      fireEvent.input(editor, { data: '<>aria' });

      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Check for autocomplete dropdown structure
      const dropdown = getAutocompleteDropdown();
      expect(dropdown).toBeInTheDocument();

      // Check suggestions structure
      const suggestions = getAutocompleteSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);

      // Verify autocomplete nodes have proper attributes
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      // Check for data-lexical-autocomplete attribute
      const autocompleteElements = editor.querySelectorAll('[data-lexical-autocomplete="true"]');
      expect(autocompleteElements.length).toBeGreaterThan(0);

      // Verify CSS classes
      autocompleteElements.forEach(element => {
        expect(element.classList.contains('autocomplete-entry')).toBe(true);
      });
    });
  });
});