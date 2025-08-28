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
  $getSelection, 
  $isRangeSelection, 
  $createParagraphNode,
  KEY_BACKSPACE_COMMAND
} from 'lexical';
import { act } from '@testing-library/react';
import { AutocompleteNode, $createAutocompleteNode, $isAutocompleteNode } from '../../AutocompleteNode';
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
  ...createTestEditorConfig('SelectionBehaviorTest'),
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

describe('AutocompleteNode - Selection Behavior Around Autocomplete Nodes', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  test('handles selection that spans across autocomplete nodes', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Create complex content with mixed nodes
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('Start '));
        paragraph.append($createAutocompleteNode('First'));
        paragraph.append($createTextNode(' middle '));
        paragraph.append($createAutocompleteNode('Second'));
        paragraph.append($createTextNode(' End'));
        root.clear();
        root.append(paragraph);
      });
    });

    // Select from middle of first text to middle of last text
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          const nodes = paragraph.getChildren();
          const firstText = nodes[0]; // "Start "
          const lastText = nodes[4]; // " End"
          
          // Create selection spanning multiple nodes
          if ($isRangeSelection($getSelection())) {
            firstText.select(2, lastText.getTextContent().length - 1);
          }
        }
      });
    });

    // Execute backspace on selection containing autocomplete nodes
    await act(async () => {
      lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
    });

    // All autocomplete nodes in selection should be removed
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).toBe('Std'); // "St" from start + "d" from end
    expect(finalContent).not.toContain('First');
    expect(finalContent).not.toContain('Second');
  });

  test('autocomplete nodes are not keyboard selectable', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Insert autocomplete node
    await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, 'Before ', 'NotSelectable', ' After');

    // Try to select the autocomplete node with keyboard navigation
    await act(async () => {
      lexicalEditorInstance.getEditorState().read(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          const autocompleteNode = paragraph.getChildren().find($isAutocompleteNode) as AutocompleteNode;
          if (autocompleteNode) {
            // Verify isKeyboardSelectable returns false
            expect(autocompleteNode.isKeyboardSelectable()).toBe(false);
          }
        }
      });
    });
  });
});