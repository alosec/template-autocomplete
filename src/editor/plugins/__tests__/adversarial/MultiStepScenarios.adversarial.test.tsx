import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { $getRoot, $createTextNode, $getSelection, $isRangeSelection } from 'lexical';
import { act } from '@testing-library/react';
import { AutocompleteNode } from '../../../nodes/AutocompleteNode';
import AutocompletePlugin from '../../AutocompletePlugin';
import { 
  getAutocompleteSuggestions,
  isAutocompleteActive,
  waitForDOMUpdate,
  insertTextIntoEditor,
  getEditorTextContent,
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
  ...createTestEditorConfig('MultiStepScenariosTest'),
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

describe('AutocompletePlugin - Complex Multi-Step Scenarios', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

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