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
import { AutocompleteNode, $createAutocompleteNode, $isAutocompleteNode } from '../../AutocompleteNode';
import AutocompletePlugin from '../../../plugins/AutocompletePlugin';
import { 
  insertAutocompleteNodeIntoEditor, 
  getEditorTextContent, 
  waitForDOMUpdate,
} from '../../../utils/__tests__/testUtils';
import { 
  mockGlobalBrainHook,
  createTestEditorConfig 
} from '../../../utils/__tests__/testHelpers/autocompleteTestFixtures';

// Mock the useGlobalBrain hook
jest.mock("../../../../hooks/useGlobalBrain", () => ({
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
  ...createTestEditorConfig('BackspaceBehaviorTest'),
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

describe('AutocompleteNode - Backspace Behavior - The Critical Edge Case', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  test('removes entire autocomplete node with single backspace from outside', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Insert autocomplete node with cursor positioned after it
    await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, 'Text ', 'AutocompleteNode', '');

    let initialContent = getEditorTextContent(lexicalEditorInstance);
    expect(initialContent).toBe('Text AutocompleteNode');

    // Position cursor right after autocomplete node
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            // Position cursor at end (after autocomplete node)
            const lastNode = paragraph.getLastChild();
            if (lastNode) {
              lastNode.select(lastNode.getTextContent().length, lastNode.getTextContent().length);
            }
          }
        }
      });
    });

    // Execute backspace command
    await act(async () => {
      lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
    });

    // STRONG ASSERTION: Autocomplete node should be completely removed with one backspace
    // This is per the specification: "Entirely removable with one backspace key press"
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).toBe('Text ');
    expect(finalContent).not.toContain('AutocompleteNode');
  });

  test('THE CRITICAL BUG: typing attempt changes subsequent backspace behavior', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Insert autocomplete node
    await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, 'Before ', 'CriticalNode', '');

    // STEP 1: First, test normal backspace behavior
    let initialContent = getEditorTextContent(lexicalEditorInstance);
    expect(initialContent).toBe('Before CriticalNode');

    // STEP 2: Attempt to type in autocomplete node (this should trigger the bug)
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          const autocompleteNode = paragraph.getChildren().find($isAutocompleteNode);
          if (autocompleteNode) {
            // Try to position cursor inside autocomplete node
            autocompleteNode.select(5, 5);
          }
        }
      });
    });

    // Attempt to type (should be blocked but might change internal state)
    fireEvent.input(editor, { data: 'BLOCKED_TEXT' });
    await waitForDOMUpdate(50);

    // Content should still be the same (typing was blocked)
    let contentAfterTypingAttempt = getEditorTextContent(lexicalEditorInstance);
    expect(contentAfterTypingAttempt).toBe('Before CriticalNode');
    expect(contentAfterTypingAttempt).not.toContain('BLOCKED_TEXT');

    // STEP 3: Now position cursor after autocomplete node and try backspace
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          // Position cursor at the very end
          const lastChild = paragraph.getLastChild();
          if (lastChild) {
            const length = lastChild.getTextContent().length;
            lastChild.select(length, length);
          }
        }
      });
    });

    // Execute backspace - THIS IS WHERE THE BUG SHOULD MANIFEST
    // If the bug exists, backspace might not work properly after typing attempt
    await act(async () => {
      lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
    });

    // CRITICAL TEST: Verify that backspace still works correctly
    // The autocomplete node should be completely removed in one backspace
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).toBe('Before ');
    expect(finalContent).not.toContain('CriticalNode');
  });

  test('backspace from beginning of text node removes previous autocomplete node', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Insert autocomplete node followed by text node
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const textBefore = $createTextNode('Start ');
        const autocompleteNode = $createAutocompleteNode('MiddleNode');
        const textAfter = $createTextNode(' End');
        
        paragraph.append(textBefore);
        paragraph.append(autocompleteNode);
        paragraph.append(textAfter);
        root.clear();
        root.append(paragraph);

        // Position cursor at beginning of "End" text
        textAfter.select(0, 0);
      });
    });

    let initialContent = getEditorTextContent(lexicalEditorInstance);
    expect(initialContent).toBe('Start MiddleNode End');

    // Execute backspace from beginning of text node
    await act(async () => {
      lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
    });

    // Autocomplete node should be removed
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).toBe('Start  End');
    expect(finalContent).not.toContain('MiddleNode');
  });

  test('handles multiple consecutive autocomplete nodes with backspace', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Insert multiple consecutive autocomplete nodes
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        paragraph.append($createAutocompleteNode('First'));
        paragraph.append($createAutocompleteNode('Second'));
        paragraph.append($createAutocompleteNode('Third'));
        paragraph.append($createTextNode(''));
        root.clear();
        root.append(paragraph);

        // Position cursor at end
        const lastNode = paragraph.getLastChild();
        if (lastNode) {
          lastNode.select(0, 0);
        }
      });
    });

    let initialContent = getEditorTextContent(lexicalEditorInstance);
    expect(initialContent).toBe('FirstSecondThird');

    // First backspace should remove "Third"
    await act(async () => {
      lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
    });

    let contentAfterFirst = getEditorTextContent(lexicalEditorInstance);
    expect(contentAfterFirst).toBe('FirstSecond');

    // Second backspace should remove "Second"
    await act(async () => {
      lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
    });

    let contentAfterSecond = getEditorTextContent(lexicalEditorInstance);
    expect(contentAfterSecond).toBe('First');

    // Third backspace should remove "First"
    await act(async () => {
      lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
    });

    let finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).toBe('');
  });
});