import { DropdownPosition } from '../utils/autocompleteUtils';
import { AutocompleteItem } from '../../types/GlobalBrainTypes';

interface AutocompleteDropdownProps {
  suggestions: AutocompleteItem[];
  selectedIndex: number;
  position: DropdownPosition;
  onSelect: (suggestion: AutocompleteItem) => void;
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
}: AutocompleteDropdownProps) {
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
          key={`${suggestion.text}-${index}`}
          className={`autocomplete-suggestion ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onHover(index)}
        >
          {suggestion.text}
        </div>
      ))}
    </div>
  );
}