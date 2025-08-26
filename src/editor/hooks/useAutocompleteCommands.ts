import { useEffect, useCallback } from 'react';
import {
  LexicalEditor,
  TextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  PASTE_COMMAND
} from 'lexical';
import { $isAutocompleteNode } from '../nodes/AutocompleteNode';
import { insertAutocompleteNode } from '../utils/autocompleteUtils';
import { AutocompleteState, AutocompleteActions } from './useAutocompleteState';

export interface AutocompleteCommandHandlers {
  selectSuggestion: (suggestion: string) => void;
}

/**
 * Hook that manages all autocomplete keyboard commands
 * Replaces the massive command registration useEffect from the original implementation
 */
export function useAutocompleteCommands(
  editor: LexicalEditor,
  state: AutocompleteState,
  actions: AutocompleteActions
): AutocompleteCommandHandlers {
  const selectSuggestion = useCallback((suggestion: string) => {
    editor.update(() => {
      if (!state.triggerNode) return;

      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const anchorNode = selection.anchor.getNode();
      if (!(anchorNode instanceof TextNode)) return;

      const textContent = anchorNode.getTextContent();
      const cursorOffset = selection.anchor.offset;
      
      const beforeCursor = textContent.substring(0, cursorOffset);
      const triggerIndex = beforeCursor.lastIndexOf('<>');
      
      if (triggerIndex !== -1) {
        insertAutocompleteNode(anchorNode, suggestion, triggerIndex, cursorOffset);
      }
    });
    
    actions.hideAutocomplete();
  }, [editor, state.triggerNode, actions]);
  // Arrow navigation commands
  useEffect(() => {
    const unregisterDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        if (!state.isActive) return false;
        
        actions.selectNext();
        
        // Scroll selected item into view
        setTimeout(() => {
          document.querySelector('.autocomplete-suggestion.selected')?.scrollIntoView({
            block: 'nearest'
          });
        }, 0);
        
        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    return unregisterDown;
  }, [editor, state.isActive, actions]);

  useEffect(() => {
    const unregisterUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        if (!state.isActive) return false;
        
        actions.selectPrevious();
        
        // Scroll selected item into view
        setTimeout(() => {
          document.querySelector('.autocomplete-suggestion.selected')?.scrollIntoView({
            block: 'nearest'
          });
        }, 0);
        
        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    return unregisterUp;
  }, [editor, state.isActive, actions]);

  // Selection commands (Enter and Tab)
  useEffect(() => {
    const handleSelection = (event?: KeyboardEvent) => {
      if (!state.isActive || state.suggestions.length === 0) return false;
      
      if (event) {
        event.preventDefault();
      }
      
      const selectedSuggestion = actions.getSelectedSuggestion();
      if (!selectedSuggestion) return false;

      selectSuggestion(selectedSuggestion);
      return true;
    };

    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      handleSelection,
      COMMAND_PRIORITY_HIGH
    );

    const unregisterTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      handleSelection,
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      unregisterEnter();
      unregisterTab();
    };
  }, [editor, state.isActive, state.suggestions.length, state.triggerNode, actions, selectSuggestion]);

  // Backspace command for autocomplete node deletion
  useEffect(() => {
    const unregisterBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      () => {
        let handled = false;
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            handled = false;
            return;
          }

          const anchorNode = selection.anchor.getNode();
          const focusNode = selection.focus.getNode();
          
          // Handle cursor at start of text node with autocomplete node before it
          if (selection.anchor.offset === 0) {
            const previousSibling = anchorNode.getPreviousSibling();
            if ($isAutocompleteNode(previousSibling)) {
              previousSibling.remove();
              handled = true;
              return;
            }
          }

          // Handle cursor on autocomplete node
          if ($isAutocompleteNode(anchorNode)) {
            anchorNode.remove();
            handled = true;
            return;
          }
          
          if ($isAutocompleteNode(focusNode)) {
            focusNode.remove();
            handled = true;
            return;
          }

          // Handle selection containing autocomplete nodes
          if (!selection.isCollapsed()) {
            const nodes = selection.getNodes();
            let hasAutocompleteNode = false;
            
            for (const node of nodes) {
              if ($isAutocompleteNode(node)) {
                node.remove();
                hasAutocompleteNode = true;
              }
            }
            
            if (hasAutocompleteNode) {
              handled = true;
              return;
            }
          }

          handled = false;
        });
        return handled;
      },
      COMMAND_PRIORITY_HIGH
    );

    return unregisterBackspace;
  }, [editor]);

  // Delete command for autocomplete nodes
  useEffect(() => {
    const unregisterDelete = editor.registerCommand(
      KEY_DELETE_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const anchorNode = selection.anchor.getNode();
        
        if ($isAutocompleteNode(anchorNode)) {
          return true; // Prevent deletion
        }
        
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );

    return unregisterDelete;
  }, [editor]);

  // Paste command for autocomplete nodes
  useEffect(() => {
    const unregisterPaste = editor.registerCommand(
      PASTE_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const anchorNode = selection.anchor.getNode();
        const focusNode = selection.focus.getNode();
        
        if ($isAutocompleteNode(anchorNode) || $isAutocompleteNode(focusNode)) {
          return true; // Prevent pasting over autocomplete nodes
        }
        
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );

    return unregisterPaste;
  }, [editor]);

  return { selectSuggestion };
}