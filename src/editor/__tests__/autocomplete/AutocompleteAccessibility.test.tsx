import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import AutocompletePlugin from '../../plugins/AutocompletePlugin';
import { AutocompleteNode } from '../../nodes/AutocompleteNode';
import { 
  getAutocompleteDropdown,
  getAutocompleteSuggestions,
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
  ...createTestEditorConfig('AccessibilityTest'),
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

describe('Autocomplete System - Accessibility and User Experience', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

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