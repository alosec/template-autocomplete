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
  isAutocompleteActive,
  waitForDOMUpdate,
  insertTextIntoEditor,
} from '../../../utils/__tests__/testUtils';
import { 
  mockGlobalBrainHook,
  createTestEditorConfig 
} from '../../../utils/__tests__/testHelpers/autocompleteTestFixtures';
import {
  measurePerformance,
  performanceThresholds
} from '../../../utils/__tests__/testHelpers/performanceTestHelpers';

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
  ...createTestEditorConfig('PerformanceMemoryTest'),
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

describe('AutocompletePlugin - Performance and Memory Edge Cases', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  test('handles massive suggestion lists without performance degradation', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);
    
    // Trigger with empty match to get all suggestions
    const duration = await measurePerformance(async () => {
      await insertTextIntoEditor(lexicalEditorInstance, '<>');
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });
    });

    expect(duration).toBeLessThan(performanceThresholds.suggestionFiltering);

    // Navigation should also be fast
    const navigationDuration = await measurePerformance(async () => {
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
        await waitForDOMUpdate(1);
      }
    });

    expect(navigationDuration).toBeLessThan(performanceThresholds.navigationCycle * 10);
  });

  test('handles component unmounting during active autocomplete', async () => {
    const { unmount } = render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);
    await insertTextIntoEditor(lexicalEditorInstance, '<>unmount');

    await waitFor(() => {
      expect(isAutocompleteActive()).toBe(true);
    });

    // Unmount while active - should not cause memory leaks
    expect(() => unmount()).not.toThrow();
  });

  test('maintains performance with multiple rapid trigger/untrigger cycles', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);

    const duration = await measurePerformance(async () => {
      for (let i = 0; i < 50; i++) {
        // Trigger
        await insertTextIntoEditor(lexicalEditorInstance, '<>cycle' + i);
        
        // Brief wait
        await waitForDOMUpdate(5);
        
        // Clear
        await act(async () => {
          lexicalEditorInstance.update(() => {
            $getRoot().clear();
            $getRoot().append($createParagraphNode());
          });
        });
      }
    });

    // Should complete all cycles in reasonable time
    expect(duration).toBeLessThan(performanceThresholds.bulkOperations);
  });
});