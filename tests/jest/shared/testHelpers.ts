// Simple test helpers
export const mockFn = () => jest.fn();

// Simple wait utility
export const wait = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Simple DOM testing
export const createDiv = () => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
};

export const cleanupDiv = (div: HTMLElement) => {
  if (div.parentNode) {
    div.parentNode.removeChild(div);
  }
};

// Simple event helpers  
export const fireKeyEvent = (element: HTMLElement, key: string) => {
  const event = new KeyboardEvent('keydown', { key });
  element.dispatchEvent(event);
};

export const fireClickEvent = (element: HTMLElement) => {
  const event = new MouseEvent('click', { bubbles: true });
  element.dispatchEvent(event);
};