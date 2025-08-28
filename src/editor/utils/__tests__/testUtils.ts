import { LexicalEditor, $getRoot, $createParagraphNode, $createTextNode, $getSelection, $isRangeSelection, TextNode } from 'lexical';
import { AutocompleteItem, GlobalBrainData } from '../../../types/GlobalBrainTypes';
import { $createAutocompleteNode } from '../../nodes/AutocompleteNode';

// Mock Global Brain Data for testing
export const mockGlobalBrainData: GlobalBrainData = {
  metadata: {
    version: "test-1.0",
    lastUpdated: new Date().toISOString(),
    totalItems: 10,
    extractionStats: {
      totalItems: 10,
      validItems: 10,
      skippedItems: 0,
      averageTextLength: 25
    }
  },
  suggestions: [
    { text: "Claude's Investigations", type: 'item', description: "AI research projects", tags: ['ai', 'research'], source: 'global-brain-generic', priority: 'high' },
    { text: "Urban vertical farming networks", type: 'item', description: "Sustainable agriculture", tags: ['farming', 'sustainability'], source: 'global-brain-generic', priority: 'medium' },
    { text: "Quantum computing applications", type: 'item', description: "Future computing paradigms", tags: ['quantum', 'computing'], source: 'global-brain-generic', priority: 'high' },
    { text: "café", type: 'item', description: "Unicode test", tags: ['unicode'], source: 'global-brain-generic', priority: 'low' },
    { text: "🚀", type: 'item', description: "Emoji test", tags: ['emoji'], source: 'global-brain-generic', priority: 'low' },
    { text: ">>>>", type: 'item', description: "Special chars", tags: ['symbols'], source: 'global-brain-generic', priority: 'low' },
    { text: "hello world", type: 'item', description: "Basic greeting", tags: ['greeting'], source: 'global-brain-generic', priority: 'medium' },
    { text: "test<>brackets", type: 'item', description: "Angle bracket test", tags: ['test'], source: 'global-brain-generic', priority: 'low' },
    { text: "very long suggestion text that exceeds normal length", type: 'item', description: "Long text test", tags: ['long'], source: 'global-brain-generic', priority: 'low' },
    { text: "!@#$%^&*()", type: 'item', description: "Special characters", tags: ['special'], source: 'global-brain-generic', priority: 'low' }
  ]
};

// Mock the useGlobalBrain hook
export const mockUseGlobalBrain = () => ({
  data: mockGlobalBrainData,
  loading: false,
  error: null,
  suggestions: mockGlobalBrainData.suggestions,
  getFilteredSuggestions: (query: string = '') => {
    if (!query.trim()) return mockGlobalBrainData.suggestions;
    const queryLower = query.toLowerCase();
    return mockGlobalBrainData.suggestions.filter(item => 
      item.text.toLowerCase().includes(queryLower)
    );
  },
  getSuggestionsByType: (type: string) => mockGlobalBrainData.suggestions.filter(item => item.type === type),
  getRandomSuggestions: (count: number = 10) => mockGlobalBrainData.suggestions.slice(0, count),
  submitNewIdea: async () => true,
  totalItems: mockGlobalBrainData.metadata.totalItems
});

// Helper to insert text programmatically into Lexical editor
export const insertTextIntoEditor = async (editor: LexicalEditor, text: string, triggerIndex?: number): Promise<void> => {
  return new Promise((resolve) => {
    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode(text);
      paragraph.append(textNode);
      root.clear();
      root.append(paragraph);
      
      // Position cursor
      if (triggerIndex !== undefined && triggerIndex >= 0) {
        const cursorPos = triggerIndex + 2; // Position after <>
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          textNode.select(cursorPos, cursorPos);
        }
      } else {
        // Position cursor at end
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          textNode.select(text.length, text.length);
        }
      }
      resolve();
    });
  });
};

// Helper to insert autocomplete node into editor
export const insertAutocompleteNodeIntoEditor = async (
  editor: LexicalEditor, 
  beforeText: string, 
  autocompleteText: string, 
  afterText: string = ''
): Promise<void> => {
  return new Promise((resolve) => {
    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      
      if (beforeText) {
        paragraph.append($createTextNode(beforeText));
      }
      
      paragraph.append($createAutocompleteNode(autocompleteText));
      
      if (afterText) {
        const afterTextNode = $createTextNode(afterText);
        paragraph.append(afterTextNode);
        // Position cursor at start of after text
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          afterTextNode.select(0, 0);
        }
      }
      
      root.clear();
      root.append(paragraph);
      resolve();
    });
  });
};

// Helper to get text content from editor
export const getEditorTextContent = (editor: LexicalEditor): string => {
  return editor.getEditorState().read(() => {
    return $getRoot().getTextContent();
  });
};

// Helper to get current cursor position
export const getCursorPosition = (editor: LexicalEditor): number => {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      return selection.anchor.offset;
    }
    return -1;
  });
};

// Helper to get current text node and cursor info
export const getCurrentNodeInfo = (editor: LexicalEditor): { node: TextNode | null; offset: number; text: string } => {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = selection.anchor.getNode();
      if (node instanceof TextNode) {
        return {
          node,
          offset: selection.anchor.offset,
          text: node.getTextContent()
        };
      }
    }
    return { node: null, offset: -1, text: '' };
  });
};

// Helper to simulate backspace key
export const simulateBackspace = (editor: LexicalEditor): Promise<boolean> => {
  return new Promise((resolve) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        resolve(false);
        return;
      }
      
      if (selection.anchor.offset > 0) {
        selection.anchor.getNode().select(selection.anchor.offset - 1, selection.anchor.offset);
        selection.removeText();
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
};

// Helper to simulate typing text
export const simulateTyping = (editor: LexicalEditor, text: string): Promise<boolean> => {
  return new Promise((resolve) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        resolve(false);
        return;
      }
      
      selection.insertText(text);
      resolve(true);
    });
  });
};

// Helper to create complex nested trigger scenarios
export const createComplexTriggerScenario = async (
  editor: LexicalEditor,
  scenario: 'consecutive' | 'nested' | 'mixed' | 'adversarial'
): Promise<string> => {
  let text: string;
  
  switch (scenario) {
    case 'consecutive':
      text = '<><><><><>';
      break;
    case 'nested':
      text = '<<>><><<>>';
      break;
    case 'mixed':
      text = '<>hello<>world<>test';
      break;
    case 'adversarial':
      text = '<><><>>>>>><<<<>>><<<>>>';
      break;
    default:
      text = '<>';
  }
  
  await insertTextIntoEditor(editor, text);
  return text;
};

// Helper to wait for DOM updates
export const waitForDOMUpdate = (ms: number = 0): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper to get autocomplete dropdown element
export const getAutocompleteDropdown = (): HTMLElement | null => {
  return document.querySelector('.autocomplete-dropdown');
};

// Helper to get autocomplete suggestions
export const getAutocompleteSuggestions = (): HTMLElement[] => {
  return Array.from(document.querySelectorAll('.autocomplete-suggestion'));
};

// Helper to get selected suggestion
export const getSelectedSuggestion = (): HTMLElement | null => {
  return document.querySelector('.autocomplete-suggestion.selected');
};

// Helper to check if autocomplete is active
export const isAutocompleteActive = (): boolean => {
  return getAutocompleteDropdown() !== null;
};

// Advanced cursor manipulation helpers
export const moveCursorTo = (editor: LexicalEditor, position: number): Promise<void> => {
  return new Promise((resolve) => {
    editor.update(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChild();
      if (firstChild) {
        const textNodes = firstChild.getTextContent();
        if (position <= textNodes.length) {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.anchor.getNode().select(position, position);
          }
        }
      }
      resolve();
    });
  });
};

// Helper to simulate rapid user interactions
export const simulateRapidInteraction = async (
  editor: LexicalEditor,
  actions: Array<'type' | 'backspace' | 'arrow-left' | 'arrow-right' | 'enter' | 'tab'>,
  data?: string[]
): Promise<void> => {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const actionData = data?.[i] || '';
    
    switch (action) {
      case 'type':
        await simulateTyping(editor, actionData);
        break;
      case 'backspace':
        await simulateBackspace(editor);
        break;
      case 'arrow-left':
        await moveCursorTo(editor, Math.max(0, getCursorPosition(editor) - 1));
        break;
      case 'arrow-right':
        await moveCursorTo(editor, getCursorPosition(editor) + 1);
        break;
      // Add more actions as needed
    }
    
    // Small delay to simulate real user interaction
    await waitForDOMUpdate(10);
  }
};

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<void>): Promise<number> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// Memory leak detection helper
export const getMemoryUsage = (): number => {
  // In Node.js environment, this would use process.memoryUsage()
  // In browser environment, we approximate with performance APIs
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};