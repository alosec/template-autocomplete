import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { $getRoot, $createParagraphNode } from 'lexical';
import { act } from '@testing-library/react';
import { AutocompleteNode } from '../../../nodes/AutocompleteNode';
import AutocompletePlugin from '../../AutocompletePlugin';
import { 
  getAutocompleteSuggestions,
  isAutocompleteActive,
  waitForDOMUpdate,
  insertTextIntoEditor,
  measurePerformance,
} from '../../../utils/__tests__/testUtils';
import { 
  mockGlobalBrainHook,
  createTestEditorConfig 
} from '../../../utils/__tests__/testHelpers/autocompleteTestFixtures';
import {
  whitespaceCases,
  performanceTestData
} from '../../../utils/__tests__/testHelpers/adversarialTestData';

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
  ...createTestEditorConfig('MatchStringDetectionTest'),
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

describe('AutocompletePlugin - Match String Detection Edge Cases', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

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

    const longText = performanceTestData.longString;
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

    for (const testCase of whitespaceCases.slice(0, 6)) { // Exclude newline cases
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