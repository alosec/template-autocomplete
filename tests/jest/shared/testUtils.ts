import { AutocompleteItem } from '../../../src/types/GlobalBrainTypes';

// Mock Lexical editor state utilities
export const createMockEditor = () => ({
  update: jest.fn(),
  read: jest.fn(),
  getEditorState: jest.fn(),
  setEditorState: jest.fn(),
  focus: jest.fn(),
  blur: jest.fn(),
  isEditable: jest.fn(() => true),
  registerCommand: jest.fn(),
  dispatchCommand: jest.fn(),
  registerNodeTransform: jest.fn(),
  registerUpdateListener: jest.fn(),
});

export const createMockEditorState = () => ({
  read: jest.fn(),
  clone: jest.fn(),
  toJSON: jest.fn(),
});

export const createMockLexicalNode = (text: string = '') => ({
  getTextContent: jest.fn(() => text),
  getKey: jest.fn(() => 'mock-key'),
  getParent: jest.fn(),
  getChildren: jest.fn(() => []),
  select: jest.fn(),
  remove: jest.fn(),
  replace: jest.fn(),
  insertAfter: jest.fn(),
  insertBefore: jest.fn(),
});

// Mock DOM utilities
export const createMockElement = (tagName: string = 'div') => {
  const element = {
    tagName: tagName.toUpperCase(),
    textContent: '',
    innerHTML: '',
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false),
      toggle: jest.fn(),
    },
    style: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      top: 0,
      left: 0,
      bottom: 20,
      right: 100,
      width: 100,
      height: 20,
    })),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    focus: jest.fn(),
    blur: jest.fn(),
    click: jest.fn(),
    scrollIntoView: jest.fn(),
  };
  return element as any;
};

// Test data utilities
export const createMockAutocompleteItem = (overrides: Partial<AutocompleteItem> = {}): AutocompleteItem => ({
  text: 'Mock Item',
  type: 'item',
  description: 'Mock description',
  tags: ['mock'],
  source: 'test',
  priority: 'medium',
  ...overrides,
});

export const mockGlobalBrainData: AutocompleteItem[] = [
  {
    text: 'Claude\'s Investigations',
    type: 'item',
    description: 'Research and analysis projects',
    tags: ['research', 'analysis'],
    source: 'global-brain',
    priority: 'high',
  },
  {
    text: 'Urban Planning Concepts',
    type: 'item', 
    description: 'City design and infrastructure',
    tags: ['urban', 'planning', 'infrastructure'],
    source: 'global-brain',
    priority: 'medium',
  },
  {
    text: 'hello world',
    type: 'item',
    description: 'Simple greeting example',
    tags: ['greeting', 'example'],
    source: 'global-brain',
    priority: 'low',
  },
];

// Event simulation utilities
export const simulateKeyPress = (key: string, target?: any) => {
  const event = {
    key,
    code: `Key${key.toUpperCase()}`,
    keyCode: key.charCodeAt(0),
    which: key.charCodeAt(0),
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: target || createMockElement('input'),
    bubbles: true,
    cancelable: true,
  };
  return event;
};

export const simulateMouseEvent = (type: string, target?: any) => {
  const event = {
    type,
    target: target || createMockElement('div'),
    clientX: 100,
    clientY: 100,
    screenX: 100,
    screenY: 100,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    bubbles: true,
    cancelable: true,
  };
  return event;
};

// Async testing utilities
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const waitForNextTick = (): Promise<void> => {
  return new Promise(resolve => process.nextTick(resolve));
};

// Cleanup utilities
export const cleanup = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.restoreAllMocks();
};

// Component testing utilities
export const renderWithEditor = (component: React.ReactElement) => {
  // This would typically use @testing-library/react
  // For now, just a mock that tests can extend
  return {
    container: createMockElement('div'),
    getByRole: jest.fn(),
    getByText: jest.fn(),
    getByTestId: jest.fn(),
    queryByRole: jest.fn(),
    queryByText: jest.fn(),
    rerender: jest.fn(),
    unmount: jest.fn(),
  };
};