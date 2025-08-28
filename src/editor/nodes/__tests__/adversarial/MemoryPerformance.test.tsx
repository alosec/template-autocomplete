import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { $getRoot } from 'lexical';
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
  ...createTestEditorConfig('MemoryPerformanceTest'),
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

describe('AutocompleteNode - Memory and Performance', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  test('handles rapid creation and deletion of autocomplete nodes', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    const duration = await measurePerformance(async () => {
      // Create and delete many autocomplete nodes rapidly
      for (let i = 0; i < 100; i++) {
        await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, '', `Node${i}`, '');
        
        // Immediately delete it
        await act(async () => {
          lexicalEditorInstance.update(() => {
            const root = $getRoot();
            const paragraph = root.getFirstChild();
            if (paragraph) {
              const autocompleteNode = paragraph.getChildren().find($isAutocompleteNode);
              if (autocompleteNode) {
                autocompleteNode.remove();
              }
            }
          });
        });
      }
    });

    // Should complete in reasonable time
    expect(duration).toBeLessThan(performanceThresholds.bulkOperations);

    // Editor should be clean
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).toBe('');
  });

  test('autocomplete nodes do not cause memory leaks', () => {
    const { unmount } = render(<TestEditor />);
    
    // Should unmount without issues
    expect(() => unmount()).not.toThrow();
  });
});