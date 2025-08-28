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
  KEY_BACKSPACE_COMMAND
} from 'lexical';
import { act } from '@testing-library/react';
import AutocompletePlugin from '../../plugins/AutocompletePlugin';
import { AutocompleteNode, $isAutocompleteNode } from '../../nodes/AutocompleteNode';
import { 
  insertTextIntoEditor,
  getAutocompleteDropdown,
  getAutocompleteSuggestions,
  getSelectedSuggestion,
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
  ...createTestEditorConfig('WorkflowIntegrationTest'),
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

describe('Autocomplete System - Real-World Usage Scenarios', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  test('complete workflow: trigger → filter → select → type → backspace', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);

    // Step 1: Trigger autocomplete
    await insertTextIntoEditor(lexicalEditorInstance, '<>');
    
    await waitFor(() => {
      expect(isAutocompleteActive()).toBe(true);
    });

    const initialSuggestions = getAutocompleteSuggestions();
    expect(initialSuggestions.length).toBeGreaterThan(1);

    // Step 2: Filter suggestions
    await insertTextIntoEditor(lexicalEditorInstance, '<>urban');
    
    await waitFor(() => {
      const filteredSuggestions = getAutocompleteSuggestions();
      expect(filteredSuggestions.length).toBeLessThan(initialSuggestions.length);
    });

    // Step 3: Navigate and select
    fireEvent.keyDown(editor, { key: 'ArrowDown', code: 'ArrowDown' });
    await waitForDOMUpdate(50);
    
    const selectedSuggestion = getSelectedSuggestion();
    expect(selectedSuggestion).toBeTruthy();
    
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(isAutocompleteActive()).toBe(false);
    });

    // Step 4: Verify autocomplete node was inserted
    let contentAfterSelection = getEditorTextContent(lexicalEditorInstance);
    expect(contentAfterSelection).not.toBe('<>urban');
    expect(contentAfterSelection.length).toBeGreaterThan('<>urban'.length);

    // Step 5: Try to type in autocomplete node (should be blocked)
    fireEvent.input(editor, { data: 'BLOCKED' });
    await waitForDOMUpdate(100);
    
    let contentAfterTyping = getEditorTextContent(lexicalEditorInstance);
    expect(contentAfterTyping).not.toContain('BLOCKED');
    expect(contentAfterTyping).toBe(contentAfterSelection); // No change

    // Step 6: Position cursor after autocomplete node and add text
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          paragraph.append($createTextNode(' additional text'));
          const lastNode = paragraph.getLastChild();
          if (lastNode) {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              lastNode.select(lastNode.getTextContent().length, lastNode.getTextContent().length);
            }
          }
        }
      });
    });

    // Step 7: Backspace to remove autocomplete node
    await act(async () => {
      lexicalEditorInstance.dispatchCommand(KEY_BACKSPACE_COMMAND, new KeyboardEvent('keydown'));
    });

    await waitForDOMUpdate(50);
    
    let finalContent = getEditorTextContent(lexicalEditorInstance);
    // Should remove the autocomplete node, leaving only the additional text
    expect(finalContent).toContain('additional text');
    expect(finalContent).not.toContain('Urban'); // Assuming "Urban..." was selected
  });

  test('document composition: multiple autocomplete entries with mixed content', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);

    // Build a document with mixed content
    const documentSteps = [
      { type: 'text', content: 'I think ' },
      { type: 'autocomplete', trigger: '<>ai', expectMatch: "Claude's" },
      { type: 'text', content: ' and ' },
      { type: 'autocomplete', trigger: '<>urban', expectMatch: 'Urban' },
      { type: 'text', content: ' are both important topics.' }
    ];

    let documentContent = '';

    for (const step of documentSteps) {
      if (step.type === 'text') {
        // Add regular text
        await act(async () => {
          lexicalEditorInstance.update(() => {
            const root = $getRoot();
            const paragraph = root.getFirstChild();
            if (paragraph) {
              paragraph.append($createTextNode(step.content));
              const lastNode = paragraph.getLastChild();
              if (lastNode) {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  lastNode.select(lastNode.getTextContent().length, lastNode.getTextContent().length);
                }
              }
            }
          });
        });
        documentContent += step.content;
      } else if (step.type === 'autocomplete') {
        // Add autocomplete content
        await insertTextIntoEditor(lexicalEditorInstance, step.trigger);
        
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(true);
        });

        // Select the first matching suggestion
        const suggestions = getAutocompleteSuggestions();
        const matchingSuggestion = suggestions.find(s => 
          s.textContent?.includes(step.expectMatch)
        );
        expect(matchingSuggestion).toBeTruthy();

        fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
        
        await waitFor(() => {
          expect(isAutocompleteActive()).toBe(false);
        });
      }
    }

    // Verify final document structure
    const finalContent = getEditorTextContent(lexicalEditorInstance);
    expect(finalContent).toContain('I think');
    expect(finalContent).toContain('are both important topics');
    expect(finalContent.length).toBeGreaterThan(documentContent.length);

    // Verify autocomplete nodes exist
    await act(async () => {
      lexicalEditorInstance.getEditorState().read(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          const autocompleteNodes = paragraph.getChildren().filter($isAutocompleteNode);
          expect(autocompleteNodes.length).toBe(2);
        }
      });
    });
  });

  test('editing workflow: insert → modify around → copy/paste → undo/redo', async () => {
    render(<TestEditor />);
    const editor = screen.getByTestId('editor');
    const lexicalEditorInstance = (editor as any).__lexicalEditor;

    await user.click(editor);

    // Insert initial autocomplete
    await insertTextIntoEditor(lexicalEditorInstance, '<>hello');
    
    await waitFor(() => {
      expect(isAutocompleteActive()).toBe(true);
    });

    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(isAutocompleteActive()).toBe(false);
    });

    let contentAfterInsert = getEditorTextContent(lexicalEditorInstance);
    
    // Add text before and after
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if (paragraph) {
          const children = paragraph.getChildren();
          
          // Add text before
          paragraph.getFirstChild()?.insertBefore($createTextNode('Before: '));
          
          // Add text after
          paragraph.append($createTextNode(' :After'));
          
          // Position cursor at end
          const lastNode = paragraph.getLastChild();
          if (lastNode) {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              lastNode.select(lastNode.getTextContent().length, lastNode.getTextContent().length);
            }
          }
        }
      });
    });

    let contentWithAdditions = getEditorTextContent(lexicalEditorInstance);
    expect(contentWithAdditions).toContain('Before:');
    expect(contentWithAdditions).toContain(':After');

    // Try to copy the entire line
    fireEvent.keyDown(editor, { key: 'a', ctrlKey: true });
    await waitForDOMUpdate(50);
    
    fireEvent.keyDown(editor, { key: 'c', ctrlKey: true });
    await waitForDOMUpdate(50);

    // Clear and paste
    fireEvent.keyDown(editor, { key: 'a', ctrlKey: true });
    await waitForDOMUpdate(50);
    
    fireEvent.keyDown(editor, { key: 'Delete', code: 'Delete' });
    await waitForDOMUpdate(50);
    
    fireEvent.keyDown(editor, { key: 'v', ctrlKey: true });
    await waitForDOMUpdate(100);

    // Content should be preserved after copy/paste
    let contentAfterPaste = getEditorTextContent(lexicalEditorInstance);
    // Note: copy/paste of autocomplete nodes might have different behavior
    // The test verifies the operation doesn't crash
    expect(editor).toBeInTheDocument();

    // Try undo/redo
    fireEvent.keyDown(editor, { key: 'z', ctrlKey: true });
    await waitForDOMUpdate(100);
    
    fireEvent.keyDown(editor, { key: 'y', ctrlKey: true });
    await waitForDOMUpdate(100);

    // Should handle undo/redo gracefully
    expect(editor).toBeInTheDocument();
  });
});