import { TextNode, $getSelection, $isRangeSelection, $createTextNode, $createParagraphNode, $getRoot, LexicalNode } from 'lexical';
import { $createAutocompleteNode, $isAutocompleteNode, AutocompleteNode } from '../nodes/AutocompleteNode';
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
    item.text.toLowerCase().includes(matchLower)
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
  _matchString?: string
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

/**
 * Check if cursor is currently positioned within an autocomplete node
 */
export function isCursorInAutocompleteNode(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;

  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  
  // Check if either anchor or focus is within an autocomplete node
  return $isAutocompleteNode(anchorNode) || $isAutocompleteNode(focusNode);
}

/**
 * Get the autocomplete node that the cursor is currently in (if any)
 */
export function getCurrentAutocompleteNode(): AutocompleteNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const anchorNode = selection.anchor.getNode();
  if ($isAutocompleteNode(anchorNode)) {
    return anchorNode;
  }

  const focusNode = selection.focus.getNode();
  if ($isAutocompleteNode(focusNode)) {
    return focusNode;
  }

  return null;
}

/**
 * Parse HTML clipboard data and extract autocomplete nodes
 */
export interface ClipboardAutocompleteData {
  hasAutocompleteNodes: boolean;
  nodes: Array<{
    text: string;
    isAutocomplete: boolean;
  }>;
}

export function parseClipboardHTML(html: string): ClipboardAutocompleteData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const result: ClipboardAutocompleteData = {
    hasAutocompleteNodes: false,
    nodes: []
  };
  
  // Find all span elements
  const spans = doc.querySelectorAll('span');
  
  for (const span of spans) {
    const isAutocomplete = span.getAttribute('data-lexical-autocomplete') === 'true';
    const text = span.textContent || '';
    
    if (isAutocomplete) {
      result.hasAutocompleteNodes = true;
      result.nodes.push({
        text,
        isAutocomplete: true
      });
    } else if (text.trim()) {
      result.nodes.push({
        text,
        isAutocomplete: false
      });
    }
  }
  
  // If no spans found, treat as plain text
  if (result.nodes.length === 0 && doc.body.textContent) {
    result.nodes.push({
      text: doc.body.textContent,
      isAutocomplete: false
    });
  }
  
  return result;
}

/**
 * Convert parsed clipboard data to Lexical nodes
 */
export function createNodesFromClipboard(clipboardData: ClipboardAutocompleteData): LexicalNode[] {
  const nodes: LexicalNode[] = [];
  
  for (const nodeData of clipboardData.nodes) {
    if (nodeData.isAutocomplete) {
      nodes.push($createAutocompleteNode(nodeData.text));
    } else {
      nodes.push($createTextNode(nodeData.text));
    }
  }
  
  return nodes;
}

/**
 * Load content with title as autocomplete node using the working copy/paste pattern
 * This follows the same successful pattern used in the PASTE_COMMAND handler
 */
export function loadContentWithAutocompleteNodes(title: string, description: string, tags?: string[]): void {
  const root = $getRoot();
  
  // Clear existing content
  root.clear();
  
  // Create first paragraph with autocomplete node for title
  const titleParagraph = $createParagraphNode();
  const autocompleteNode = $createAutocompleteNode(title);
  titleParagraph.append(autocompleteNode);
  root.append(titleParagraph);
  
  // Add description in separate paragraphs if provided
  if (description) {
    // Add empty paragraph for spacing
    root.append($createParagraphNode());
    
    // Split description by lines and create paragraphs
    const descriptionLines = description.split('\n');
    descriptionLines.forEach(line => {
      const paragraph = $createParagraphNode();
      if (line.trim()) {
        paragraph.append($createTextNode(line));
      }
      root.append(paragraph);
    });
  }
  
  // Add tags in a separate paragraph if provided
  if (tags && tags.length > 0) {
    // Add empty paragraph for spacing
    root.append($createParagraphNode());
    
    const tagsParagraph = $createParagraphNode();
    const tagsText = tags.map(tag => `#${tag}`).join(' ');
    tagsParagraph.append($createTextNode(tagsText));
    root.append(tagsParagraph);
  }
  
  // Position cursor after the autocomplete node in the first paragraph
  const spaceNode = $createTextNode(' ');
  autocompleteNode.insertAfter(spaceNode);
  spaceNode.select(1, 1);
}