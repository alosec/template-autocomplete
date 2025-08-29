import { useEffect, useCallback } from 'react';
import {
  LexicalEditor,
  TextNode,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_CRITICAL,
  KEY_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  PASTE_COMMAND,
  CONTROLLED_TEXT_INSERTION_COMMAND
} from 'lexical';
import { $isAutocompleteNode } from '../nodes/AutocompleteNode';
import { insertAutocompleteNode, isCursorInAutocompleteNode, getCurrentAutocompleteNode, parseClipboardHTML, createNodesFromClipboard } from '../utils/autocompleteUtils';
import { AutocompleteState, AutocompleteActions } from './useAutocompleteState';
import { HIDE_AUTOCOMPLETE_COMMAND } from '../commands/autocompleteCommands';

import { AutocompleteItem } from '../../types/GlobalBrainTypes';

export interface AutocompleteCommandHandlers {
  selectSuggestion: (suggestion: AutocompleteItem) => void;
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
  const selectSuggestion = useCallback((suggestion: AutocompleteItem) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const anchorNode = selection.anchor.getNode();
      if (!(anchorNode instanceof TextNode)) return;

      // Use the stored trigger info from state instead of re-detecting
      if (state.triggerIndex !== -1) {
        const cursorOffset = selection.anchor.offset;
        insertAutocompleteNode(anchorNode, suggestion.text, state.triggerIndex, cursorOffset, state.matchString);
      }
    });
    
    actions.hideAutocomplete();
  }, [editor, state.triggerIndex, state.matchString, actions]);
  // Critical priority keyboard handler for UP/DOWN arrows when autocomplete is active
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only intercept UP/DOWN arrows when autocomplete is active
      if (!state.isActive || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) {
        return false; // Let editor handle all other cases including LEFT/RIGHT
      }
      
      // Handle UP/DOWN before any other handlers
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopImmediatePropagation();
        actions.selectNext();
        
        // Scroll selected item into view
        setTimeout(() => {
          document.querySelector('.autocomplete-suggestion.selected')?.scrollIntoView({
            block: 'nearest'
          });
        }, 0);
        
        return true;
      }
      
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopImmediatePropagation();
        actions.selectPrevious();
        
        // Scroll selected item into view
        setTimeout(() => {
          document.querySelector('.autocomplete-suggestion.selected')?.scrollIntoView({
            block: 'nearest'
          });
        }, 0);
        
        return true;
      }
      
      return false;
    };

    const unregister = editor.registerCommand(
      KEY_DOWN_COMMAND,
      handleKeyDown,
      COMMAND_PRIORITY_CRITICAL
    );

    return unregister;
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
      (event: ClipboardEvent) => {
        // Check clipboard data first, before editor update
        const clipboardData = event.clipboardData;
        if (!clipboardData) {
          return false;
        }
        
        const htmlData = clipboardData.getData('text/html');
        if (!htmlData) {
          return false;
        }
        
        // Parse HTML to detect autocomplete nodes
        const parsedData = parseClipboardHTML(htmlData);
        if (!parsedData.hasAutocompleteNodes) {
          return false;
        }
        
        // We have autocomplete nodes to handle - prevent default behavior immediately
        event.preventDefault();
        event.stopPropagation();
        
        let handled = false;
        
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            handled = false;
            return;
          }

          const anchorNode = selection.anchor.getNode();
          const focusNode = selection.focus.getNode();
          
          // Prevent pasting over autocomplete nodes
          if ($isAutocompleteNode(anchorNode) || $isAutocompleteNode(focusNode)) {
            handled = true;
            return;
          }
          
          // Create nodes from clipboard data
          const nodes = createNodesFromClipboard(parsedData);
          if (nodes.length === 0) {
            handled = false;
            return;
          }
          
          // Insert the nodes at cursor position
          const anchorTextNode = anchorNode instanceof TextNode ? anchorNode : null;
          if (!anchorTextNode) {
            handled = false;
            return;
          }
          
          // Remove any selected content first
          if (!selection.isCollapsed()) {
            selection.removeText();
          }
          
          // Insert all the parsed nodes
          let insertAfterNode = anchorTextNode;
          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (i === 0) {
              // For the first node, split the current text node at cursor
              const offset = selection.anchor.offset;
              const textContent = insertAfterNode.getTextContent();
              const beforeText = textContent.substring(0, offset);
              const afterText = textContent.substring(offset);
              
              if (beforeText) {
                const beforeNode = $createTextNode(beforeText);
                insertAfterNode.replace(beforeNode);
                beforeNode.insertAfter(node);
                insertAfterNode = node;
              } else {
                insertAfterNode.replace(node);
                insertAfterNode = node;
              }
              
              if (afterText) {
                const afterNode = $createTextNode(afterText);
                insertAfterNode.insertAfter(afterNode);
              }
            } else {
              // Insert subsequent nodes after the previous one
              insertAfterNode.insertAfter(node);
              insertAfterNode = node;
            }
          }
          
          // Position cursor after the last inserted node
          if (insertAfterNode) {
            const nextSibling = insertAfterNode.getNextSibling();
            if (nextSibling && nextSibling instanceof TextNode) {
              nextSibling.select(0, 0);
            } else {
              // Create a new text node if needed
              const newTextNode = $createTextNode(' ');
              insertAfterNode.insertAfter(newTextNode);
              newTextNode.select(1, 1);
            }
          }
          
          handled = true;
        });
        
        return handled;
      },
      COMMAND_PRIORITY_CRITICAL
    );

    return unregisterPaste;
  }, [editor]);

  // Text insertion command for autocomplete nodes - prevent editing and show shake animation
  useEffect(() => {
    const unregisterTextInsertion = editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      () => {
        let handled = false;
        editor.getEditorState().read(() => {
          if (isCursorInAutocompleteNode()) {
            const autocompleteNode = getCurrentAutocompleteNode();
            if (autocompleteNode) {
              // Trigger shake animation using editor DOM access
              // Solution based on: https://github.com/facebook/lexical/discussions/1939
              const domElement = editor.getElementByKey(autocompleteNode.getKey());
              if (domElement) {
                domElement.classList.add('autocomplete-shake');
                // Remove animation class after animation completes
                setTimeout(() => {
                  domElement.classList.remove('autocomplete-shake');
                }, 500);
              }
              handled = true; // Prevent text insertion
            }
          }
        });
        return handled;
      },
      COMMAND_PRIORITY_HIGH
    );

    return unregisterTextInsertion;
  }, [editor]);

  // Hide autocomplete command - for external UI elements to close dropdown
  useEffect(() => {
    const unregisterHideCommand = editor.registerCommand(
      HIDE_AUTOCOMPLETE_COMMAND,
      () => {
        if (state.isActive) {
          actions.hideAutocomplete();
        }
        return true; // Command handled
      },
      COMMAND_PRIORITY_HIGH
    );

    return unregisterHideCommand;
  }, [editor, state.isActive, actions]);

  return { selectSuggestion };
}