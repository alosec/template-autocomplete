// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock DOM APIs that JSDOM doesn't support
global.Range.prototype.getBoundingClientRect = jest.fn(() => ({
  bottom: 120,
  height: 20,
  left: 100,
  right: 200,
  top: 100,
  width: 100,
  x: 100,
  y: 100,
  toJSON: () => {}
}));

global.HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
  bottom: 600,
  height: 600,
  left: 0,
  right: 800,
  top: 0,
  width: 800,
  x: 0,
  y: 0,
  toJSON: () => {}
}));

global.HTMLElement.prototype.scrollIntoView = jest.fn();
