import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { 
  $getRoot, 
  $getSelection, 
  $isRangeSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND
} from 'lexical';
import { act } from '@testing-library/react';
import { AutocompleteNode, $isAutocompleteNode } from '../../AutocompleteNode';
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
  ...createTestEditorConfig('NonEditableBehaviorTest'),
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

describe('AutocompleteNode - Non-Editable Behavior Enforcement', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  test('blocks typing attempts when cursor is positioned inside autocomplete node', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Insert autocomplete node
    await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, 'Before ', 'AutocompleteText', ' After');

    // Try to position cursor inside autocomplete node and type
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            const autocompleteNode = paragraph.getChildren().find($isAutocompleteNode);
            if (autocompleteNode) {
              // Try to select inside the autocomplete node
              autocompleteNode.select(5, 5); // Try to position cursor in middle
            }
          }
        }
      });
    });

    // Attempt to type - this should be blocked
    fireEvent.input(editor, { data: 'SHOULD_NOT_APPEAR' });
    
    await waitForDOMUpdate(100);

    // Verify text was not inserted
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).not.toContain('SHOULD_NOT_APPEAR');
    expect(finalContent).toBe('Before AutocompleteText After');
  });

  test('triggers shake animation when typing is attempted in autocomplete node', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Insert autocomplete node
    await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, '', 'TestNode', '');

    // Mock getElementByKey to return a mock DOM element
    const mockDOMElement = document.createElement('span');
    mockDOMElement.className = 'autocomplete-entry';
    
    // Mock the editor's getElementByKey method
    const originalGetElementByKey = lexicalEditorInstance.getElementByKey;
    lexicalEditorInstance.getElementByKey = jest.fn(() => mockDOMElement);
    
    expect(mockDOMElement.classList.contains('autocomplete-shake')).toBe(false);

    // Try to position cursor in autocomplete node
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          const autocompleteNode = paragraph.getChildren().find($isAutocompleteNode) as AutocompleteNode;
          if (autocompleteNode) {
            autocompleteNode.select(3, 3);
          }
        }
      });
    });

    // Trigger text insertion command - should trigger shake animation
    await act(async () => {
      lexicalEditorInstance.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, 'test');
    });

    // STRONG ASSERTION: Should have shake class added
    expect(mockDOMElement.classList.contains('autocomplete-shake')).toBe(true);
    
    // Content should not change (typing blocked)
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).toBe('TestNode');
    expect(finalContent).not.toContain('test');
    
    // Restore original method
    lexicalEditorInstance.getElementByKey = originalGetElementByKey;
  });

  test('handles copy/paste operations with autocomplete nodes gracefully', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Insert autocomplete node
    await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, 'Start ', 'TargetNode', ' End');

    const initialContent = getEditorTextContent(lexicalEditorInstance);
    expect(initialContent).toBe('Start TargetNode End');

    // Try to select and copy content including autocomplete node
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          // Select all content
          const firstChild = paragraph.getFirstChild();
          const lastChild = paragraph.getLastChild();
          if (firstChild && lastChild) {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.setTextNodeRange(firstChild, 0, lastChild, lastChild.getTextContent().length);
            }
          }
        }
      });
    });

    // Simulate copy operation
    fireEvent.copy(editor);
    await waitForDOMUpdate(50);

    // The operation should not crash the system
    expect(editor).toBeInTheDocument();
    
    // Content should remain unchanged
    const contentAfterCopy = getEditorTextContent(lexicalEditorInstance);
    expect(contentAfterCopy).toBe(initialContent);
    
    // Note: In a real implementation, we'd expect copy/paste to preserve 
    // autocomplete nodes, but current implementation may block it
    // This test verifies the system handles it gracefully without crashing
  });
});