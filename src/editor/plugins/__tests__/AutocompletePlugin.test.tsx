import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { $getRoot, $createTextNode, $getSelection, $isRangeSelection, $createParagraphNode } from 'lexical';
import { act } from '@testing-library/react';
import AutocompletePlugin from '../AutocompletePlugin';
import { AutocompleteNode } from '../../nodes/AutocompleteNode';

const editorConfig = {
  namespace: 'TestEditor',
  nodes: [AutocompleteNode],
  onError: (error: Error) => {
    throw error;
  },
  theme: {},
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

// Helper function to insert text using Lexical's API
const insertTextIntoTestEditor = async (text: string) => {
  const editor = screen.getByTestId('editor');
  const lexicalEditorInstance = (editor as any).__lexicalEditor;
  
  if (lexicalEditorInstance) {
    await act(async () => {
      lexicalEditorInstance.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode(text);
        paragraph.append(textNode);
        root.clear();
        root.append(paragraph);
        
        // Position cursor right after the <> trigger if it exists
        const triggerIndex = text.indexOf('<>');
        if (triggerIndex !== -1) {
          const cursorPos = triggerIndex + 2; // Position after <>
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            textNode.select(cursorPos, cursorPos);
          }
        } else {
          // Position cursor at end
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            textNode.select(text.length, text.length);
          }
        }
      });
    });
  }
};

describe('AutocompletePlugin', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Basic Functionality', () => {
    test('triggers autocomplete on <> input', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      await user.tab();
      
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: '<>' });
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
    });

    test('shows suggestions after trigger', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      await user.tab();
      
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: '<>' });
      
      await waitFor(() => {
        expect(screen.getByText("Claude's Investigations")).toBeInTheDocument();
      });
    });

    test('filters suggestions based on input', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: '<>urban' });
      
      await waitFor(() => {
        expect(screen.getByText('Urban vertical farming networks')).toBeInTheDocument();
        expect(screen.queryByText("Claude's Investigations")).not.toBeInTheDocument();
      });
    });
  });

  describe('Adversarial Input Handling', () => {
    test('handles rapid trigger spam without crashing', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      
      // Rapidly type multiple triggers
      for (let i = 0; i < 10; i++) {
        fireEvent.input(editor, { data: '<>' });
      }
      
      // Should not crash and should show autocomplete
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
    });

    test('handles malformed triggers gracefully', async () => {
      const malformedTriggers = ['<<>>', '<><', '><>', '<<<>>>'];
      
      for (const trigger of malformedTriggers) {
        const { unmount } = render(<TestEditor />);
        const editor = screen.getByTestId('editor');
        
        await user.click(editor);
        await insertTextIntoTestEditor(trigger);
        
        // Should not crash - malformed triggers should be treated as normal text
        expect(editor).toBeInTheDocument();
        expect(editor.textContent).toContain(trigger);
        
        unmount(); // Clean up between iterations
      }
    });

    test('handles very long input after trigger', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      
      const longString = 'a'.repeat(1000);
      const textWithTrigger = '<>' + longString;
      await insertTextIntoTestEditor(textWithTrigger);
      
      // Should handle long input without crashing
      expect(editor.textContent).toContain('<>');
      expect(editor.textContent).toContain(longString);
    });

    test('handles multiple triggers in same text', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      await insertTextIntoTestEditor('Hello <>world and <>universe');
      
      // Should handle multiple triggers gracefully
      expect(editor.textContent).toContain('<>world');
      expect(editor.textContent).toContain('<>universe');
      
      // Last trigger should activate autocomplete
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
    });

    test('handles special characters and unicode', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      await insertTextIntoTestEditor('<>émoji🚀中文');
      
      // Should handle unicode characters without issues
      expect(editor.textContent).toContain('émoji🚀中文');
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    test('escape key closes autocomplete', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      await user.tab();
      
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: '<>' });
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}{Escape}'); // Double escape as implemented
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).not.toBeInTheDocument();
      });
    });

    test('handles rapid escape key presses', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      await user.tab();
      
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: '<>' });
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
      
      // Rapidly press escape multiple times
      for (let i = 0; i < 10; i++) {
        await user.keyboard('{Escape}');
      }
      
      // Should handle gracefully without errors
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).not.toBeInTheDocument();
      });
    });

    test('arrow keys navigate suggestions', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      await user.tab();
      
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: '<>' });
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      
      // Should not crash during navigation
      expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
    });

    test('enter/tab selects suggestion', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      await user.tab();
      
      // Use fireEvent.input for reliable Lexical text insertion
      fireEvent.input(editor, { data: '<>' });
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
      
      // Use fireEvent.keyDown to trigger Lexical command handlers directly
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter', keyCode: 13 });
      
      // Should select suggestion and close autocomplete
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles trigger at document boundaries', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      // Test at very beginning
      await user.click(editor);
      await insertTextIntoTestEditor('<>start');
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
      
      // Clear and test at end
      await user.clear(editor);
      await insertTextIntoTestEditor('Some content here <>end');
      
      await waitFor(() => {
        expect(document.querySelector('.autocomplete-dropdown')).toBeInTheDocument();
      });
    });

    test('handles empty editor state', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      
      // Should handle empty state gracefully
      expect(editor).toBeInTheDocument();
      expect(editor.textContent).toBe('');
    });

    test('recovers from error states', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      
      // Try various potentially problematic inputs
      const problematicInputs = ['<>', '><', '<<', '>>', '<><><>', ''];
      
      for (const input of problematicInputs) {
        await user.clear(editor);
        if (input) {
          await insertTextIntoTestEditor(input);
        }
        
        // Should handle all inputs without crashing
        expect(editor).toBeInTheDocument();
      }
    });
  });

  describe('Performance and Stress Testing', () => {
    test('handles rapid typing without performance issues', async () => {
      render(<TestEditor />);
      const editor = screen.getByTestId('editor');
      
      await user.click(editor);
      
      const startTime = Date.now();
      
      // Type rapidly by building up the string
      const rapidText = 'a'.repeat(100);
      await insertTextIntoTestEditor(rapidText);
      
      const duration = Date.now() - startTime;
      
      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
      expect(editor.textContent).toHaveLength(100);
    });

    test('handles memory cleanup on unmount', () => {
      const { unmount } = render(<TestEditor />);
      
      // Should unmount without memory leaks or errors
      expect(() => unmount()).not.toThrow();
    });
  });
});