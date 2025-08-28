import { TextNode, $getSelection, $isRangeSelection, $createTextNode } from 'lexical';
import { $createAutocompleteNode } from '../nodes/AutocompleteNode';
import { AutocompleteItem } from '../../types/GlobalBrainTypes';

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
 * Uses simple rule: last <> before cursor is the active trigger
 * Match string is strictly the text between <> and cursor position
 * Only closes autocomplete on newlines, spaces are allowed in match strings
 */
export function detectTrigger(text: string, cursorOffset: number): TriggerInfo {
  const beforeCursor = text.substring(0, cursorOffset);
  const triggerIndex = beforeCursor.lastIndexOf('<>');
  
  if (triggerIndex !== -1) {
    const matchString = beforeCursor.substring(triggerIndex + 2);
    
    // Close autocomplete only if match string contains newlines
    // Spaces are allowed in match strings per requirements
    const shouldClose = matchString.includes('\n');
    
    return {
      found: !shouldClose,
      matchString: shouldClose ? '' : matchString,
      triggerIndex
    };
  }
  
  return {
    found: false,
    matchString: '',
    triggerIndex: -1
  };
}


/**
 * Filter suggestions based on match string
 * If no suggestions match and matchString exists, return the matchString as a fallback suggestion
 */
export function filterSuggestions(suggestions: AutocompleteItem[], matchString: string): AutocompleteItem[] {
  if (!matchString.trim()) {
    return suggestions;
  }
  
  const matchLower = matchString.toLowerCase();
  const filtered = suggestions.filter(item => 
    item.text.toLowerCase().includes(matchLower) ||
    item.description.toLowerCase().includes(matchLower) ||
    item.tags.some(tag => tag.toLowerCase().includes(matchLower))
  );
  
  // If no suggestions match, return the match string as a fallback suggestion
  if (filtered.length === 0) {
    return [{
      text: matchString,
      type: 'item',
      description: `Custom entry: ${matchString}`,
      source: 'global-brain-generic',
      tags: ['custom'],
      priority: 'low'
    }];
  }
  
  return filtered;
}

/**
 * Insert autocomplete node into editor, replacing text from trigger to cursor position
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
  const afterCursor = textContent.substring(cursorOffset);
  
  const autocompleteNode = $createAutocompleteNode(suggestion);
  
  if (beforeTrigger.length === 0 && afterCursor.length === 0) {
    // Replace entire node
    anchorNode.replace(autocompleteNode);
    const newTextNode = $createTextNode(' ');
    autocompleteNode.insertAfter(newTextNode);
    newTextNode.select(1, 1);
  } else if (beforeTrigger.length === 0) {
    // Replace from start
    const afterTextNode = $createTextNode(afterCursor);
    anchorNode.replace(autocompleteNode);
    autocompleteNode.insertAfter(afterTextNode);
    afterTextNode.select(0, 0);
  } else if (afterCursor.length === 0) {
    // Replace to end
    const beforeTextNode = $createTextNode(beforeTrigger);
    anchorNode.replace(beforeTextNode);
    beforeTextNode.insertAfter(autocompleteNode);
    const newTextNode = $createTextNode(' ');
    autocompleteNode.insertAfter(newTextNode);
    newTextNode.select(1, 1);
  } else {
    // Split node - replace from trigger through cursor, keep before and after
    const beforeTextNode = $createTextNode(beforeTrigger);
    const afterTextNode = $createTextNode(afterCursor);
    
    anchorNode.replace(beforeTextNode);
    beforeTextNode.insertAfter(autocompleteNode);
    autocompleteNode.insertAfter(afterTextNode);
    afterTextNode.select(0, 0);
  }
}