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
import AutocompletePlugin from '../../plugins/AutocompletePlugin';
import { AutocompleteNode, $createAutocompleteNode, $isAutocompleteNode } from '../../nodes/AutocompleteNode';
import { 
  insertTextIntoEditor,
  insertAutocompleteNodeIntoEditor,
  isAutocompleteActive,
  waitForDOMUpdate,
  getEditorTextContent,
} from '../../utils/__tests__/testUtils';
import { 
  mockGlobalBrainHook,
  createTestEditorConfig 
} from '../../utils/__tests__/testHelpers/autocompleteTestFixtures';

// Mock the useGlobalBrain hook
jest.mock("../../../hooks/useGlobalBrain", () => ({
  useGlobalBrain: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
    suggestions: [
      { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
      { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
      { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
    ],
    getFilteredSuggestions: jest.fn(),
    getSuggestionsByType: jest.fn(),
    getRandomSuggestions: jest.fn(),
    submitNewIdea: jest.fn(),
    totalItems: 3
  }))
}));

const editorConfig = {
  ...createTestEditorConfig('EdgeCaseIntegrationTest'),
  nodes: [AutocompleteNode],
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

describe('Autocomplete System - Complex Edge Case Scenarios', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

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