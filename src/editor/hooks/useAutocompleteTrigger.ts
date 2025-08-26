import { useEffect } from 'react';
import { LexicalEditor, TextNode, $getSelection, $isRangeSelection } from 'lexical';
import { 
  detectTrigger, 
  filterSuggestions, 
  calculateDropdownPosition 
} from '../utils/autocompleteUtils';
import { GLOBAL_BRAIN_SUGGESTIONS } from '../config/autocompleteConfig';
import { AutocompleteActions } from './useAutocompleteState';

/**
 * Hook to handle autocomplete triggering based on text content changes
 * Replaces the massive useEffect from the original implementation
 */
export function useAutocompleteTrigger(
  editor: LexicalEditor,
  actions: AutocompleteActions,
  isActive: boolean
): void {
  useEffect(() => {
    const unregisterTextListener = editor.registerTextContentListener((textContent) => {
      // Hide autocomplete if editor is empty
      if (textContent === '') {
        if (isActive) {
          actions.hideAutocomplete();
        }
        return;
      }

      // Read current editor state
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const anchorNode = selection.anchor.getNode();
        if (!(anchorNode instanceof TextNode)) return;

        const nodeTextContent = anchorNode.getTextContent();
        const cursorOffset = selection.anchor.offset;
        
        // Detect trigger pattern
        const triggerInfo = detectTrigger(nodeTextContent, cursorOffset);
        
        if (triggerInfo.found) {
          // Calculate dropdown position
          const triggerPosition = calculateDropdownPosition();
          
          // Filter suggestions based on match string
          const filtered = filterSuggestions(GLOBAL_BRAIN_SUGGESTIONS, triggerInfo.matchString);
          
          // Show autocomplete
          actions.showAutocomplete({
            matchString: triggerInfo.matchString,
            suggestions: filtered,
            triggerPosition,
            triggerNode: anchorNode,
            triggerOffset: cursorOffset
          });
        } else if (isActive) {
          // Hide autocomplete if trigger not found
          actions.hideAutocomplete();
        }
      });
    });

    return () => {
      unregisterTextListener();
    };
  }, [editor, actions, isActive]);
}