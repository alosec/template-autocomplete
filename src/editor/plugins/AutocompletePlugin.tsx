import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  PASTE_COMMAND,
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
  triggerNode: TextNode;
  triggerOffset: number;
}

// Hardcoded Global Brain suggestions
const GLOBAL_BRAIN_SUGGESTIONS = [
  "Claude's Investigations",
  "impt unsolved problems", 
  "Gut-Brain Axis Drug Repurposing",
  "Urban vertical farming networks",
  "Ocean plastic cleanup initiatives", 
  "Creating universal cancer vaccines",
  "Global basic income pilot programs",
  "AI consciousness detection methods",
  "gut-brain", "drug-repurposing", "research",
  "vertical farming", "urban", "agriculture", "sustainability",
  "ocean", "plastic", "cleanup", "environment", 
  "cancer", "vaccines", "oncology", "prevention",
  "basic income", "pilot", "economic policy",
  "consciousness", "detection",
  // Basic UI suggestions
  "component", "container", "button", "input", "form",
  "header", "footer", "navigation", "sidebar", "modal"
];

export default function AutocompletePlugin(): React.JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState | null>(null);

  const hideAutocomplete = useCallback(() => {
    setAutocompleteState(null);
  }, []);

  const selectSuggestion = useCallback((suggestion: string) => {
    editor.update(() => {
      if (!autocompleteState) return;

      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const anchorNode = selection.anchor.getNode();
      if (!(anchorNode instanceof TextNode)) return;

      const textContent = anchorNode.getTextContent();
      const cursorOffset = selection.anchor.offset;
      
      const beforeCursor = textContent.substring(0, cursorOffset);
      const triggerIndex = beforeCursor.lastIndexOf('<>');
      
      if (triggerIndex !== -1) {
        const beforeTrigger = textContent.substring(0, triggerIndex);
        const afterCursor = textContent.substring(cursorOffset);
        
        const autocompleteNode = $createAutocompleteNode(suggestion);
        
        if (beforeTrigger.length === 0 && afterCursor.length === 0) {
          anchorNode.replace(autocompleteNode);
          const newTextNode = $createTextNode(' ');
          autocompleteNode.insertAfter(newTextNode);
          newTextNode.select(1, 1);
        } else if (beforeTrigger.length === 0) {
          const afterTextNode = $createTextNode(afterCursor);
          anchorNode.replace(autocompleteNode);
          autocompleteNode.insertAfter(afterTextNode);
          afterTextNode.select(0, 0);
        } else if (afterCursor.length === 0) {
          const beforeTextNode = $createTextNode(beforeTrigger);
          anchorNode.replace(beforeTextNode);
          beforeTextNode.insertAfter(autocompleteNode);
          const newTextNode = $createTextNode(' ');
          autocompleteNode.insertAfter(newTextNode);
          newTextNode.select(1, 1);
        } else {
          const beforeTextNode = $createTextNode(beforeTrigger);
          const afterTextNode = $createTextNode(afterCursor);
          
          anchorNode.replace(beforeTextNode);
          beforeTextNode.insertAfter(autocompleteNode);
          autocompleteNode.insertAfter(afterTextNode);
          afterTextNode.select(0, 0);
        }
      }
    });
    
    hideAutocomplete();
  }, [editor, autocompleteState, hideAutocomplete]);

  const calculateCursorPosition = useCallback(() => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return { top: 100, left: 100 };
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const editorContainer = document.querySelector('.editor-container');
      const containerRect = editorContainer?.getBoundingClientRect();
      
      if (!containerRect) return { top: 100, left: 100 };
      
      let top = rect.bottom - containerRect.top + 5;
      let left = Math.max(0, rect.left - containerRect.left);
      
      const dropdownWidth = 250;
      const dropdownHeight = 200;
      
      const maxLeft = containerRect.width - dropdownWidth;
      if (left > maxLeft) {
        left = maxLeft;
      }
      
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        top = rect.top - containerRect.top - dropdownHeight - 5;
      }
      
      top = Math.max(0, top);
      left = Math.max(0, left);
      
      return { top, left };
    } catch (error) {
      return { top: 100, left: 100 };
    }
  }, []);

  useEffect(() => {
    const unregisterTextListener = editor.registerTextContentListener((textContent) => {
      if (textContent === '') {
        if (autocompleteState?.isActive) {
          hideAutocomplete();
        }
        return;
      }

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const anchorNode = selection.anchor.getNode();
        if (!(anchorNode instanceof TextNode)) return;

        const nodeTextContent = anchorNode.getTextContent();
        const cursorOffset = selection.anchor.offset;
        
        const beforeCursor = nodeTextContent.substring(0, cursorOffset);
        const triggerIndex = beforeCursor.lastIndexOf('<>');
        
        if (triggerIndex !== -1) {
          const matchString = beforeCursor.substring(triggerIndex + 2);
          
          if (!matchString.includes('\n')) {
            const triggerPosition = calculateCursorPosition();
            
            const filtered = GLOBAL_BRAIN_SUGGESTIONS.filter(suggestion => 
              suggestion.toLowerCase().startsWith(matchString.toLowerCase())
            );
            
            setAutocompleteState({
              isActive: true,
              matchString,
              selectedIndex: 0,
              suggestions: filtered,
              triggerPosition,
              triggerNode: anchorNode,
              triggerOffset: cursorOffset
            });
            return;
          }
        }
        
        if (autocompleteState?.isActive) {
          hideAutocomplete();
        }
      });
    });

    return () => {
      unregisterTextListener();
    };
  }, [editor, autocompleteState, hideAutocomplete, calculateCursorPosition]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && autocompleteState?.isActive) {
        event.preventDefault();
        event.stopPropagation();
        hideAutocomplete();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [autocompleteState, hideAutocomplete]);

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
          
          setTimeout(() => {
            document.querySelector('.autocomplete-suggestion.selected')?.scrollIntoView({block: 'nearest'});
          }, 0);
          
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
          
          setTimeout(() => {
            document.querySelector('.autocomplete-suggestion.selected')?.scrollIntoView({block: 'nearest'});
          }, 0);
          
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!autocompleteState?.isActive || autocompleteState.suggestions.length === 0) return false;
          
          if (event) {
            event.preventDefault();
          }
          
          const selectedSuggestion = autocompleteState.suggestions[autocompleteState.selectedIndex] || autocompleteState.matchString;
          selectSuggestion(selectedSuggestion);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          if (!autocompleteState?.isActive || autocompleteState.suggestions.length === 0) return false;
          
          if (event) {
            event.preventDefault();
          }
          
          const selectedSuggestion = autocompleteState.suggestions[autocompleteState.selectedIndex] || autocompleteState.matchString;
          selectSuggestion(selectedSuggestion);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),

      editor.registerCommand(
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
            
            if (selection.anchor.offset === 0) {
              const previousSibling = anchorNode.getPreviousSibling();
              if ($isAutocompleteNode(previousSibling)) {
                previousSibling.remove();
                handled = true;
                return;
              }
            }

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
      ),

      editor.registerCommand(
        KEY_DELETE_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;

          const anchorNode = selection.anchor.getNode();
          
          if ($isAutocompleteNode(anchorNode)) {
            return true;
          }
          
          return false;
        },
        COMMAND_PRIORITY_HIGH
      ),

      editor.registerCommand(
        PASTE_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;

          const anchorNode = selection.anchor.getNode();
          const focusNode = selection.focus.getNode();
          
          if ($isAutocompleteNode(anchorNode) || $isAutocompleteNode(focusNode)) {
            return true;
          }
          
          return false;
        },
        COMMAND_PRIORITY_HIGH
      )
    ];

    return () => {
      unregisterKeyHandlers.forEach(unregister => unregister());
    };
  }, [editor, autocompleteState, selectSuggestion, hideAutocomplete]);

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