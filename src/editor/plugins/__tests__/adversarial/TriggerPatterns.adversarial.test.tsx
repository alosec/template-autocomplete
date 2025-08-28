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
  createComplexTriggerScenario,
  getAutocompleteDropdown,
  getAutocompleteSuggestions,
  isAutocompleteActive,
  waitForDOMUpdate,
  insertTextIntoEditor,
  moveCursorTo,
} from '../../../utils/__tests__/testUtils';
import { 
  mockGlobalBrainHook,
  createTestEditorConfig 
} from '../../../utils/__tests__/testHelpers/autocompleteTestFixtures';
import {
  nestedTriggerPatterns,
  ADVERSARIAL_STRING,
  specialCharacterCases
} from '../../../utils/__tests__/testHelpers/adversarialTestData';

// Mock the useGlobalBrain hook
jest.mock('../../../../hooks/useGlobalBrain', () => ({
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
  ...createTestEditorConfig('TriggerPatternsTest'),
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

describe('AutocompletePlugin - Complex Trigger Pattern Edge Cases', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  test('handles consecutive triggers at different cursor positions', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);
    await createComplexTriggerScenario(lexicalEditorInstance, 'consecutive');

    // Test trigger activation at each position
    const triggerText = '<><><><><>';
    
    for (let pos = 2; pos <= triggerText.length; pos += 2) {
      await moveCursorTo(lexicalEditorInstance, pos);
      await waitForDOMUpdate(50);

      if (pos % 2 === 0) { // After each complete trigger
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(true);
        });
      }
    }
  });

  test('handles nested angle bracket patterns without crashing', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);

    for (const pattern of nestedTriggerPatterns) {
      await insertTextIntoEditor(lexicalEditorInstance, pattern);
      
      // Test cursor positions throughout the pattern
      for (let pos = 0; pos <= pattern.length; pos++) {
        await moveCursorTo(lexicalEditorInstance, pos);
        await waitForDOMUpdate(10);
        
        // Should not crash regardless of position
        expect(editor).toBeInTheDocument();
      }

      // Clear for next pattern
      await act(async () => {
        lexicalEditorInstance.update(() => {
          $getRoot().clear();
          $getRoot().append($createParagraphNode());
        });
      });
    }
  });

  test('handles the adversarial string from specification', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);
    
    await insertTextIntoEditor(lexicalEditorInstance, ADVERSARIAL_STRING);

    // Test navigation through the entire string
    for (let pos = 0; pos <= ADVERSARIAL_STRING.length; pos++) {
      await moveCursorTo(lexicalEditorInstance, pos);
      await waitForDOMUpdate(5);
      
      // Should handle all positions without crashing
      expect(editor.textContent).toContain(ADVERSARIAL_STRING);
    }

    // Test backward navigation
    for (let pos = ADVERSARIAL_STRING.length; pos >= 0; pos--) {
      await moveCursorTo(lexicalEditorInstance, pos);
      await waitForDOMUpdate(5);
      
      // Should handle all positions without crashing
      expect(editor.textContent).toContain(ADVERSARIAL_STRING);
    }
  });

  test('handles triggers with special characters and unicode', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);

    for (const testCase of specialCharacterCases) {
      await insertTextIntoEditor(lexicalEditorInstance, testCase);
      
      // Should trigger autocomplete
      await waitFor(() => {
        expect(isAutocompleteActive()).toBe(true);
      });

      // Should show suggestions without crashing
      const suggestions = getAutocompleteSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);

      // Clear for next test
      await act(async () => {
        lexicalEditorInstance.update(() => {
          $getRoot().clear();
          $getRoot().append($createParagraphNode());
        });
      });
      
      await waitForDOMUpdate(50);
    }
  });
});