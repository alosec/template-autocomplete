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
  ...createTestEditorConfig('NodeStateConsistencyTest'),
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

describe('AutocompleteNode - Node State Consistency and Serialization', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  test('autocomplete node properties remain consistent after operations', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    // Insert autocomplete node
    await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, '', 'TestNode', '');

    // Verify all expected properties
    await act(async () => {
      lexicalEditorInstance.getEditorState().read(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          const autocompleteNode = paragraph.getChildren().find($isAutocompleteNode) as AutocompleteNode;
          if (autocompleteNode) {
            expect(autocompleteNode.isEditable()).toBe(false);
            expect(autocompleteNode.canInsertTextBefore()).toBe(false);
            expect(autocompleteNode.canInsertTextAfter()).toBe(true);
            expect(autocompleteNode.canBeEmpty()).toBe(false);
            expect(autocompleteNode.isSegmented()).toBe(false);
            expect(autocompleteNode.isToken()).toBe(true);
            expect(autocompleteNode.isKeyboardSelectable()).toBe(false);
          }
        }
      });
    });
  });

  test('autocomplete node serialization and deserialization', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    const testText = 'SerializationTest';
    
    // Insert autocomplete node
    await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, '', testText, '');

    let serializedData: any;

    // Serialize the editor state
    await act(async () => {
      const editorState = lexicalEditorInstance.getEditorState();
      serializedData = editorState.toJSON();
    });

    expect(serializedData).toBeDefined();

    // Verify autocomplete node is properly serialized
    const autocompleteNodeData = serializedData.root.children[0].children.find(
      (node: any) => node.type === 'autocomplete'
    );

    expect(autocompleteNodeData).toBeDefined();
    expect(autocompleteNodeData.text).toBe(testText);
    expect(autocompleteNodeData.type).toBe('autocomplete');

    // Create new editor state from serialized data and verify deserialization
    await act(async () => {
      const newEditorState = lexicalEditorInstance.parseEditorState(JSON.stringify(serializedData));
      lexicalEditorInstance.setEditorState(newEditorState);
    });

    // Verify content is preserved
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).toBe(testText);
  });

  test('autocomplete node splitText behavior', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await insertAutocompleteNodeIntoEditor(lexicalEditorInstance, '', 'UnsplittableNode', '');

    // Verify splitText returns the node itself (cannot be split)
    await act(async () => {
      lexicalEditorInstance.getEditorState().read(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          const autocompleteNode = paragraph.getChildren().find($isAutocompleteNode) as AutocompleteNode;
          if (autocompleteNode) {
            const splitResult = autocompleteNode.splitText([5, 10]);
            expect(splitResult).toEqual([autocompleteNode]);
            expect(splitResult.length).toBe(1);
          }
        }
      });
    });
  });
});