import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { $getRoot, $createTextNode } from 'lexical';
import { act } from '@testing-library/react';
import { AutocompleteNode } from '../../../nodes/AutocompleteNode';
import AutocompletePlugin from '../../AutocompletePlugin';
import { 
  getAutocompleteSuggestions,
  isAutocompleteActive,
  waitForDOMUpdate,
  insertTextIntoEditor,
  getEditorTextContent,
  simulateRapidInteraction,
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
  ...createTestEditorConfig('SelectionInsertionTest'),
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

describe('AutocompletePlugin - Selection and Insertion Edge Cases', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

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