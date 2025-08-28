import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { AutocompleteNode } from '../../../nodes/AutocompleteNode';
import AutocompletePlugin from '../../AutocompletePlugin';
import { 
  getAutocompleteSuggestions,
  isAutocompleteActive,
  waitForDOMUpdate,
  insertTextIntoEditor,
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
  ...createTestEditorConfig('SuggestionFilteringTest'),
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

describe('AutocompletePlugin - Suggestion Filtering and Updates', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

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