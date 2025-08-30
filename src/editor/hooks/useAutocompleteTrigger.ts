import { useEffect, useCallback, useRef } from 'react';
import { LexicalEditor, TextNode, $getSelection, $isRangeSelection, $getRoot } from 'lexical';
import { 
  detectTrigger, 
  filterSuggestions, 
  calculateDropdownPosition
} from '../utils/autocompleteUtils';
import { AutocompleteActions, AutocompleteState } from './useAutocompleteState';
import { useGlobalBrain } from '../../hooks/useGlobalBrain';

/**
 * Hook to handle autocomplete triggering based on text content and cursor position changes
 * Handles flexible entry/exit based on cursor navigation
 */
export function useAutocompleteTrigger(
  editor: LexicalEditor,
  actions: AutocompleteActions,
  state: AutocompleteState
): void {
  const { suggestions } = useGlobalBrain();
  const suggestionsRef = useRef(suggestions);
  
  // Keep suggestions ref up to date
  suggestionsRef.current = suggestions;
  
  // Helper function to check autocomplete state at current cursor position
  const checkAutocompleteAtCursor = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const anchorNode = selection.anchor.getNode();
      if (!(anchorNode instanceof TextNode)) return;

      const nodeTextContent = anchorNode.getTextContent();
      const cursorOffset = selection.anchor.offset;
      
      // Detect trigger pattern at current cursor position
      const triggerInfo = detectTrigger(nodeTextContent, cursorOffset);
      
      if (triggerInfo.found) {
        // Calculate dropdown position
        const triggerPosition = calculateDropdownPosition();
        
        // Filter suggestions based on match string - get fresh suggestions each time
        const filtered = filterSuggestions(suggestionsRef.current, triggerInfo.matchString);
        
        // Show autocomplete for this trigger
        actions.showAutocomplete({
          matchString: triggerInfo.matchString,
          suggestions: filtered,
          triggerPosition,
          triggerBoxPosition: triggerPosition,
          triggerNode: anchorNode,
          triggerOffset: cursorOffset,
          triggerIndex: triggerInfo.triggerIndex
        });
      } else if (state.isActive) {
        // Hide autocomplete if no trigger found at cursor
        actions.hideAutocomplete();
      }
    });
  }, [editor, actions, state.isActive]);

  // Single consolidated listener for all editor changes (text content and cursor position)
  useEffect(() => {
    let lastCursorPosition = -1;
    let lastNodeKey = '';
    let lastTextContent = '';
    
    const unregisterUpdateListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        
        // Get current text content for empty check
        const currentTextContent = editor.getEditorState().read(() => {
          return $getRoot().getTextContent();
        });
        
        // Hide autocomplete if editor is empty
        if (currentTextContent === '') {
          if (state.isActive) {
            actions.hideAutocomplete();
          }
          return;
        }
        
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          // Close dropdown for non-range selections or multi-selections
          if (state.isActive) {
            actions.hideAutocomplete();
          }
          return;
        }

        const anchorNode = selection.anchor.getNode();
        
        // If not a TextNode, close dropdown (clicking on empty lines, etc.)
        if (!(anchorNode instanceof TextNode)) {
          if (state.isActive) {
            actions.hideAutocomplete();
          }
          return;
        }

        const currentCursorPosition = selection.anchor.offset;
        const currentNodeKey = anchorNode.getKey();
        
        // Check if anything significant changed (cursor position, node, or text content)
        const hasChanged = 
          currentCursorPosition !== lastCursorPosition || 
          currentNodeKey !== lastNodeKey ||
          currentTextContent !== lastTextContent;
          
        if (hasChanged) {
          lastCursorPosition = currentCursorPosition;
          lastNodeKey = currentNodeKey;
          lastTextContent = currentTextContent;
          
          // Check autocomplete state at current cursor position
          checkAutocompleteAtCursor();
        }
      });
    });

    return () => {
      unregisterUpdateListener();
    };
  }, [editor, actions, state.isActive, checkAutocompleteAtCursor]);

  // Note: We don't need a separate effect for suggestions changes
  // The main update listener already uses fresh suggestions via suggestionsRef

  // Listen for editor focus to re-check autocomplete when returning to editor
  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleFocus = () => {
      // Small delay to ensure selection is properly set after focus
      setTimeout(() => {
        checkAutocompleteAtCursor();
      }, 10);
    };

    rootElement.addEventListener('focus', handleFocus);
    
    return () => {
      rootElement.removeEventListener('focus', handleFocus);
    };
  }, [editor, checkAutocompleteAtCursor]);
}