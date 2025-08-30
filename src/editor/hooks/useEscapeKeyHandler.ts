import { useEffect } from 'react';

/**
 * Simple hook to handle escape key for autocomplete
 */
export function useEscapeKeyHandler(
  isActive: boolean,
  onEscape: () => void
): void {
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isActive) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isActive, onEscape]);
}