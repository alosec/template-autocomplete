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
  getSelectedSuggestion,
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
  ...createTestEditorConfig('KeyboardNavigationTest'),
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

describe('AutocompletePlugin - Keyboard Navigation Stress Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

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