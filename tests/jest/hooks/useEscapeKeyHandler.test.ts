import { renderHook } from '@testing-library/react';
import { useEscapeKeyHandler } from '../../../src/editor/hooks/useEscapeKeyHandler';

describe('useEscapeKeyHandler', () => {
  const mockOnEscape = jest.fn();

  beforeEach(() => {
    mockOnEscape.mockClear();
  });

  it('calls onEscape when Escape is pressed and autocomplete is active', () => {
    renderHook(() => useEscapeKeyHandler(true, mockOnEscape));
    
    // Simulate Escape key press
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);
    
    expect(mockOnEscape).toHaveBeenCalledTimes(1);
  });

  it('does not call onEscape when autocomplete is inactive', () => {
    renderHook(() => useEscapeKeyHandler(false, mockOnEscape));
    
    // Simulate Escape key press
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);
    
    expect(mockOnEscape).not.toHaveBeenCalled();
  });

  it('does not call onEscape for other keys', () => {
    renderHook(() => useEscapeKeyHandler(true, mockOnEscape));
    
    // Simulate other key press
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(enterEvent);
    
    expect(mockOnEscape).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => useEscapeKeyHandler(true, mockOnEscape));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('updates behavior when isActive changes', () => {
    let isActive = false;
    const { rerender } = renderHook(() => useEscapeKeyHandler(isActive, mockOnEscape));
    
    // Press Escape while inactive
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);
    expect(mockOnEscape).not.toHaveBeenCalled();
    
    // Change to active
    isActive = true;
    rerender();
    
    // Press Escape while active
    document.dispatchEvent(escapeEvent);
    expect(mockOnEscape).toHaveBeenCalledTimes(1);
  });
});