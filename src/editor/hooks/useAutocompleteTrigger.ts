import { useEffect } from 'react';
import { LexicalEditor, TextNode, $getSelection, $isRangeSelection } from 'lexical';
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
  // Helper function to check autocomplete state at current cursor position
  const checkAutocompleteAtCursor = () => {
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
        // Check if this is the same trigger that's already active
        const isSameTrigger = state.isActive && 
          state.triggerNode === anchorNode &&
          state.triggerIndex === triggerInfo.triggerIndex;

        // Only update if different trigger or not active
        if (!isSameTrigger) {
          // Calculate dropdown position
          const triggerPosition = calculateDropdownPosition();
          
          // Filter suggestions based on match string
          const filtered = filterSuggestions(suggestions, triggerInfo.matchString);
          
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
        }
      } else if (state.isActive) {
        // Hide autocomplete if no trigger found at cursor
        actions.hideAutocomplete();
      }
    });
  };

  // Listen to text content changes
  useEffect(() => {
    const unregisterTextListener = editor.registerTextContentListener((textContent) => {
      // Hide autocomplete if editor is empty
      if (textContent === '') {
        if (state.isActive) {
          actions.hideAutocomplete();
        }
        return;
      }

      // Check autocomplete state at current cursor position
      checkAutocompleteAtCursor();
    });

    return () => {
      unregisterTextListener();
    };
  }, [editor, actions, state.isActive, state.triggerNode, state.triggerIndex, suggestions]);

  // Listen to selection changes (cursor movement)
  useEffect(() => {
    let lastCursorPosition = -1;
    let lastNodeKey = '';
    
    const unregisterSelectionListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;

        const anchorNode = selection.anchor.getNode();
        if (!(anchorNode instanceof TextNode)) return;

        const currentCursorPosition = selection.anchor.offset;
        const currentNodeKey = anchorNode.getKey();
        
        // Only check if cursor actually moved
        if (currentCursorPosition !== lastCursorPosition || currentNodeKey !== lastNodeKey) {
          lastCursorPosition = currentCursorPosition;
          lastNodeKey = currentNodeKey;
          
          // Use immediate check for cursor movement (no setTimeout)
          checkAutocompleteAtCursor();
        }
      });
    });

    return () => {
      unregisterSelectionListener();
    };
  }, [editor, actions, state.isActive, state.triggerNode, state.triggerIndex, suggestions]);
}