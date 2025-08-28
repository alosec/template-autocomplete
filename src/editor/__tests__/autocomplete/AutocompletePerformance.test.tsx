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
  $createParagraphNode
} from 'lexical';
import { act } from '@testing-library/react';
import AutocompletePlugin from '../../plugins/AutocompletePlugin';
import { AutocompleteNode } from '../../nodes/AutocompleteNode';
import { 
  insertTextIntoEditor,
  isAutocompleteActive,
  waitForDOMUpdate,
  getEditorTextContent,
  simulateRapidInteraction,
} from '../../utils/__tests__/testUtils';
import { 
  mockGlobalBrainHook,
  createTestEditorConfig 
} from '../../utils/__tests__/testHelpers/autocompleteTestFixtures';
import {
  measurePerformance,
  getMemoryUsage,
  performanceThresholds
} from '../../utils/__tests__/testHelpers/performanceTestHelpers';

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
  ...createTestEditorConfig('PerformanceTest'),
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

describe('Autocomplete System - Performance and Memory Validation', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  test('performance benchmark: complete autocomplete workflow under time constraints', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);

    const startTime = performance.now();

    // Complete workflow 10 times
    for (let i = 0; i < 10; i++) {
      // Trigger
      await insertTextIntoEditor(lexicalEditorInstance, '<>perf' + i);
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      }, { timeout: 500 });

      // Navigate
      fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
      await waitForDOMUpdate(10);

      // Select
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      // Add separator
      await act(async () => {
        lexicalEditorInstance.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (paragraph) {
            paragraph.append($createTextNode(' | '));
          }
        });
      });
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Should complete all operations in under 5 seconds
    expect(totalDuration).toBeLessThan(performanceThresholds.bulkOperations);
    console.log(`Performance benchmark: ${totalDuration.toFixed(2)}ms for 10 complete workflows`);

    // Verify final state
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent.split('|').length).toBe(11); // 10 separators = 11 parts
  });

  test('memory stability: autocomplete operations do not cause memory leaks', async () => {
    const { unmount } = render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);

    const initialMemory = getMemoryUsage();

    // Perform many operations
    for (let i = 0; i < 100; i++) {
      await insertTextIntoEditor(lexicalEditorInstance, '<>mem' + i);
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      }, { timeout: 100 });

      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(false);
      });

      // Clear content
      await act(async () => {
        lexicalEditorInstance.update(() => {
          $getRoot().clear();
          $getRoot().append($createParagraphNode());
        });
      });
    }

    const finalMemory = getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 10MB in test environment)
    if (initialMemory > 0 && finalMemory > 0) {
      expect(memoryIncrease).toBeLessThan(performanceThresholds.memoryIncrease);
    }

    // Cleanup should not throw
    expect(() => unmount()).not.toThrow();
  });

  test('concurrent operations: multiple simultaneous autocomplete interactions', async () => {
    // This test simulates what might happen if user is very fast or if there are
    // programmatic interactions happening simultaneously
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);

    // Simulate concurrent operations
    const operations = [
      // Rapid trigger/untrigger
      async () => {
        for (let i = 0; i < 5; i++) {
          await insertTextIntoEditor(lexicalEditorInstance, '<>rapid' + i);
          await waitForDOMUpdate(10);
          fireEvent.keyDown(editor, { key: 'Escape', code: 'Escape' });
          await waitForDOMUpdate(10);
        }
      },
      
      // Mouse interactions
      async () => {
        await waitForDOMUpdate(50);
        const suggestions = document.querySelectorAll('.autocomplete-suggestion');
        if (suggestions.length > 0) {
          fireEvent.mouseOver(suggestions[0]);
          await waitForDOMUpdate(20);
          fireEvent.click(suggestions[0]);
        }
      },
      
      // Keyboard navigation
      async () => {
        await waitForDOMUpdate(30);
        for (let i = 0; i < 3; i++) {
          fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
          await waitForDOMUpdate(10);
        }
      }
    ];

    // Start operations concurrently
    const promises = operations.map(op => op());
    
    // Wait for all to complete
    await Promise.all(promises);

    // System should remain stable
    expect(editor).toBeInTheDocument();
    
    // Final state should be consistent
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(typeof finalContent).toBe('string');
  });
});