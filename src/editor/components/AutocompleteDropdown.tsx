import React from 'react';
import { DropdownPosition } from '../utils/autocompleteUtils';

interface AutocompleteDropdownProps {
  suggestions: string[];
  selectedIndex: number;
  position: DropdownPosition;
  onSelect: (suggestion: string) => void;
  onHover: (index: number) => void;
}

/**
 * Pure presentational component for the autocomplete dropdown
 * Handles only rendering and mouse interactions
 */
export function AutocompleteDropdown({
  suggestions,
  selectedIndex,
  position,
  onSelect,
  onHover
}: AutocompleteDropdownProps): JSX.Element {
  if (suggestions.length === 0) {
    return <></>;
  }

  return (
    <div 
      className="autocomplete-dropdown"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000,
      }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion}
          className={`autocomplete-suggestion ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onHover(index)}
        >
          {suggestion}
        </div>
      ))}
    </div>
  );
}