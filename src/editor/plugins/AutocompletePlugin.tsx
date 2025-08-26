import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  KEY_BACKSPACE_COMMAND,
  TextNode,
} from 'lexical';
import { useCallback, useEffect, useState } from 'react';
import { $createAutocompleteNode, $isAutocompleteNode } from '../nodes/AutocompleteNode';

interface AutocompleteState {
  isActive: boolean;
  matchString: string;
  selectedIndex: number;
  suggestions: string[];
  triggerPosition: { top: number; left: number; };
}

// Hardcoded suggestions as per requirements
const SUGGESTIONS = [
  'component',
  'container',
  'button',
  'input',
  'form',
  'header',
  'footer',
  'navigation',
  'sidebar',
  'modal',
  'dropdown',
  'tooltip',
  'card',
  'list',
  'item',
];

export default function AutocompletePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState | null>(null);

  const hideAutocomplete = useCallback(() => {
    setAutocompleteState(null);
  }, []);

  const selectSuggestion = useCallback((suggestion: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !autocompleteState) return;

      // Find and remove the <> + matchString
      const anchorNode = selection.anchor.getNode();
      if (anchorNode instanceof TextNode) {
        const textContent = anchorNode.getTextContent();
        const cursorOffset = selection.anchor.offset;
        
        // Find the <> trigger position
        const beforeCursor = textContent.substring(0, cursorOffset);
        const triggerIndex = beforeCursor.lastIndexOf('<>');
        
        if (triggerIndex !== -1) {
          // Replace the <> + matchString with the autocomplete node
          const beforeTrigger = textContent.substring(0, triggerIndex);
          const afterCursor = textContent.substring(cursorOffset);
          
          // Update the text node to remove the trigger and match string
          anchorNode.setTextContent(beforeTrigger + afterCursor);
          
          // Create and insert the autocomplete node at the trigger position
          const autocompleteNode = $createAutocompleteNode(suggestion);
          
          if (beforeTrigger.length === 0) {
            // If trigger is at the beginning, insert before the text node
            anchorNode.insertBefore(autocompleteNode);
          } else {
            // Split the text node and insert the autocomplete node
            const beforeTextNode = $createTextNode(beforeTrigger);
            const afterTextNode = $createTextNode(afterCursor);
            
            anchorNode.replace(beforeTextNode);
            beforeTextNode.insertAfter(autocompleteNode);
            autocompleteNode.insertAfter(afterTextNode);
            
            // Set cursor after the autocomplete node
            afterTextNode.select(0, 0);
          }
        }
      }
    });
    
    hideAutocomplete();
  }, [editor, autocompleteState, hideAutocomplete]);

  const updateSuggestions = useCallback((matchString: string) => {
    const filtered = SUGGESTIONS.filter(suggestion => 
      suggestion.toLowerCase().startsWith(matchString.toLowerCase())
    );
    
    if (!autocompleteState) return;
    
    setAutocompleteState({
      ...autocompleteState,
      matchString,
      suggestions: filtered,
      selectedIndex: Math.min(autocompleteState.selectedIndex, Math.max(0, filtered.length - 1))
    });
  }, [autocompleteState]);

  useEffect(() => {
    const unregisterTextListener = editor.registerTextContentListener((textContent) => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const anchorNode = selection.anchor.getNode();
        if (!(anchorNode instanceof TextNode)) return;

        const textContent = anchorNode.getTextContent();
        const cursorOffset = selection.anchor.offset;
        
        // Check for <> trigger
        const beforeCursor = textContent.substring(0, cursorOffset);
        const triggerIndex = beforeCursor.lastIndexOf('<>');
        
        if (triggerIndex !== -1) {
          // Extract match string (from right of <> to cursor)
          const matchString = beforeCursor.substring(triggerIndex + 2);
          
          // Ensure match string doesn't contain newlines
          if (!matchString.includes('\n')) {
            // Calculate position for dropdown (simplified positioning)
            const triggerPosition = { top: 100, left: 100 }; // TODO: Calculate actual position
            
            const filtered = SUGGESTIONS.filter(suggestion => 
              suggestion.toLowerCase().startsWith(matchString.toLowerCase())
            );
            
            setAutocompleteState({
              isActive: true,
              matchString,
              selectedIndex: 0,
              suggestions: filtered,
              triggerPosition
            });
            return;
          }
        }
        
        // Hide autocomplete if no trigger found
        if (autocompleteState?.isActive) {
          hideAutocomplete();
        }
      });
    });

    return unregisterTextListener;
  }, [editor, autocompleteState, hideAutocomplete]);

  useEffect(() => {
    const unregisterKeyHandlers = [
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        () => {
          if (!autocompleteState?.isActive) return false;
          
          setAutocompleteState({
            ...autocompleteState,
            selectedIndex: (autocompleteState.selectedIndex + 1) % autocompleteState.suggestions.length
          });
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        () => {
          if (!autocompleteState?.isActive) return false;
          
          const newIndex = autocompleteState.selectedIndex - 1;
          setAutocompleteState({
            ...autocompleteState,
            selectedIndex: newIndex < 0 ? autocompleteState.suggestions.length - 1 : newIndex
          });
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        () => {
          if (!autocompleteState?.isActive || autocompleteState.suggestions.length === 0) return false;
          
          const selectedSuggestion = autocompleteState.suggestions[autocompleteState.selectedIndex] || autocompleteState.matchString;
          selectSuggestion(selectedSuggestion);
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      
      editor.registerCommand(
        KEY_TAB_COMMAND,
        () => {
          if (!autocompleteState?.isActive || autocompleteState.suggestions.length === 0) return false;
          
          const selectedSuggestion = autocompleteState.suggestions[autocompleteState.selectedIndex] || autocompleteState.matchString;
          selectSuggestion(selectedSuggestion);
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),

      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        () => {
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            const anchorNode = selection.anchor.getNode();
            const previousSibling = anchorNode.getPreviousSibling();
            
            // Check if we're about to delete an autocomplete node
            if ($isAutocompleteNode(previousSibling) && selection.anchor.offset === 0) {
              previousSibling.remove();
              return true;
            }
          });
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    ];

    return () => {
      unregisterKeyHandlers.forEach(unregister => unregister());
    };
  }, [editor, autocompleteState, selectSuggestion]);

  if (!autocompleteState?.isActive || autocompleteState.suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      className="autocomplete-dropdown"
      style={{
        position: 'absolute',
        top: autocompleteState.triggerPosition.top,
        left: autocompleteState.triggerPosition.left,
        zIndex: 1000,
      }}
    >
      {autocompleteState.suggestions.map((suggestion, index) => (
        <div
          key={suggestion}
          className={`autocomplete-suggestion ${index === autocompleteState.selectedIndex ? 'selected' : ''}`}
          onClick={() => selectSuggestion(suggestion)}
          onMouseEnter={() => setAutocompleteState({
            ...autocompleteState,
            selectedIndex: index
          })}
        >
          {suggestion}
        </div>
      ))}
    </div>
  );
}