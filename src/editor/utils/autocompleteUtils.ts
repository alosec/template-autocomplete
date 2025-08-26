import { TextNode, $getSelection, $isRangeSelection, $createTextNode } from 'lexical';
import { $createAutocompleteNode } from '../nodes/AutocompleteNode';

export interface DropdownPosition {
  top: number;
  left: number;
}

export interface TriggerInfo {
  found: boolean;
  matchString: string;
  triggerIndex: number;
  cursorInMiddle?: boolean;
}

/**
 * Calculate optimal position for autocomplete trigger box
 * Positions at the actual trigger location in the text
 */
export function calculateTriggerBoxPosition(triggerIndex: number): DropdownPosition {
  try {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { top: 100, left: 100 };
    }
    
    const range = selection.getRangeAt(0);
    const anchorNode = range.startContainer;
    
    // Create a range at the trigger position
    const triggerRange = document.createRange();
    triggerRange.setStart(anchorNode, triggerIndex);
    triggerRange.setEnd(anchorNode, triggerIndex + 2); // Position after <>
    
    const rect = triggerRange.getBoundingClientRect();
    
    const editorContainer = document.querySelector('.editor-container');
    const containerRect = editorContainer?.getBoundingClientRect();
    
    if (!containerRect) {
      return { top: 100, left: 100 };
    }
    
    const top = rect.top - containerRect.top - 5; // Position slightly above trigger
    const left = Math.max(0, rect.left - containerRect.left);
    
    return { top, left };
  } catch (error) {
    return { top: 100, left: 100 };
  }
}

/**
 * Calculate optimal position for autocomplete dropdown
 */
export function calculateDropdownPosition(): DropdownPosition {
  try {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { top: 100, left: 100 };
    }
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    const editorContainer = document.querySelector('.editor-container');
    const containerRect = editorContainer?.getBoundingClientRect();
    
    if (!containerRect) {
      return { top: 100, left: 100 };
    }
    
    let top = rect.bottom - containerRect.top + 5;
    let left = Math.max(0, rect.left - containerRect.left);
    
    const dropdownWidth = 250;
    const dropdownHeight = 200;
    
    // Ensure dropdown doesn't overflow horizontally
    const maxLeft = containerRect.width - dropdownWidth;
    if (left > maxLeft) {
      left = maxLeft;
    }
    
    // Position above if not enough space below
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
}

/**
 * Detect trigger pattern in text with cursor position awareness
 * Handles both <>text| and <>|text scenarios by looking at text before and after cursor
 */
export function detectTrigger(text: string, cursorOffset: number): TriggerInfo {
  const beforeCursor = text.substring(0, cursorOffset);
  const triggerIndex = beforeCursor.lastIndexOf('<>');
  
  if (triggerIndex !== -1) {
    const matchStringBefore = beforeCursor.substring(triggerIndex + 2);
    
    // Don't continue if there's partial trigger pattern before cursor
    if (matchStringBefore.includes('<')) {
      return { found: false, matchString: '', triggerIndex: -1 };
    }
    
    // Look for text after cursor until whitespace or end (word characters only)
    const afterCursor = text.substring(cursorOffset);
    const wordMatch = afterCursor.match(/^([a-zA-Z0-9-_]*)/);
    const matchStringAfter = wordMatch ? wordMatch[1] : '';
    
    // Only include word characters, stop at spaces or punctuation
    
    const fullMatchString = matchStringBefore + matchStringAfter;
    
    // Don't trigger if match string contains newline
    if (!fullMatchString.includes('\n')) {
      return {
        found: true,
        matchString: fullMatchString,
        triggerIndex,
        cursorInMiddle: matchStringBefore.length < fullMatchString.length
      };
    }
  }
  
  return {
    found: false,
    matchString: '',
    triggerIndex: -1
  };
}


/**
 * Filter suggestions based on match string
 */
export function filterSuggestions(suggestions: string[], matchString: string): string[] {
  if (!matchString.trim()) {
    return suggestions;
  }
  
  const matchLower = matchString.toLowerCase();
  return suggestions.filter(suggestion => 
    suggestion.toLowerCase().startsWith(matchLower)
  );
}

/**
 * Insert autocomplete node into editor, handling all text splitting cases including cursor in middle
 */
export function insertAutocompleteNode(
  anchorNode: TextNode,
  suggestion: string,
  triggerIndex: number,
  cursorOffset: number,
  matchString?: string
): void {
  const textContent = anchorNode.getTextContent();
  const beforeTrigger = textContent.substring(0, triggerIndex);
  
  // If we have a matchString, find where it ends to replace the full word
  let afterWord: string;
  if (matchString && matchString.length > 0) {
    // Find the end of the matched word after the trigger
    const afterTrigger = textContent.substring(triggerIndex + 2);
    const wordEndIndex = triggerIndex + 2 + matchString.length;
    afterWord = textContent.substring(wordEndIndex);
  } else {
    afterWord = textContent.substring(cursorOffset);
  }
  
  const autocompleteNode = $createAutocompleteNode(suggestion);
  
  if (beforeTrigger.length === 0 && afterWord.length === 0) {
    // Replace entire node
    anchorNode.replace(autocompleteNode);
    const newTextNode = $createTextNode(' ');
    autocompleteNode.insertAfter(newTextNode);
    newTextNode.select(1, 1);
  } else if (beforeTrigger.length === 0) {
    // Replace from start
    const afterTextNode = $createTextNode(afterWord);
    anchorNode.replace(autocompleteNode);
    autocompleteNode.insertAfter(afterTextNode);
    afterTextNode.select(0, 0);
  } else if (afterWord.length === 0) {
    // Replace to end
    const beforeTextNode = $createTextNode(beforeTrigger);
    anchorNode.replace(beforeTextNode);
    beforeTextNode.insertAfter(autocompleteNode);
    const newTextNode = $createTextNode(' ');
    autocompleteNode.insertAfter(newTextNode);
    newTextNode.select(1, 1);
  } else {
    // Split node - replace the trigger and matched word, keep before and after
    const beforeTextNode = $createTextNode(beforeTrigger);
    const afterTextNode = $createTextNode(afterWord);
    
    anchorNode.replace(beforeTextNode);
    beforeTextNode.insertAfter(autocompleteNode);
    autocompleteNode.insertAfter(afterTextNode);
    afterTextNode.select(0, 0);
  }
}