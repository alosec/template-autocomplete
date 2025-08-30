import { useState, useCallback } from 'react';
import { TextNode } from 'lexical';

export interface DropdownPosition {
  top: number;
  left: number;
}

interface AutocompleteItem {
  text: string;
}

export interface AutocompleteState {
  isActive: boolean;
  matchString: string;
  selectedIndex: number;
  suggestions: AutocompleteItem[];
  triggerPosition: DropdownPosition;
  triggerBoxPosition: DropdownPosition;
  triggerNode: TextNode | null;
  triggerOffset: number;
  triggerIndex: number;
}

export interface AutocompleteActions {
  showAutocomplete: (params: {
    matchString: string;
    suggestions: AutocompleteItem[];
    triggerPosition: DropdownPosition;
    triggerBoxPosition: DropdownPosition;
    triggerNode: TextNode;
    triggerOffset: number;
    triggerIndex: number;
  }) => void;
  hideAutocomplete: () => void;
  selectNext: () => void;
  selectPrevious: () => void;
  setSelectedIndex: (index: number) => void;
  getSelectedSuggestion: () => AutocompleteItem | null;
}

const INITIAL_STATE: AutocompleteState = {
  isActive: false,
  matchString: '',
  selectedIndex: 0,
  suggestions: [],
  triggerPosition: { top: 0, left: 0 },
  triggerBoxPosition: { top: 0, left: 0 },
  triggerNode: null,
  triggerOffset: 0,
  triggerIndex: 0
};

export function useAutocompleteState(): [AutocompleteState, AutocompleteActions] {
  const [state, setState] = useState<AutocompleteState>(INITIAL_STATE);

  const showAutocomplete = useCallback((params: {
    matchString: string;
    suggestions: AutocompleteItem[];
    triggerPosition: DropdownPosition;
    triggerBoxPosition: DropdownPosition;
    triggerNode: TextNode;
    triggerOffset: number;
    triggerIndex: number;
  }) => {
    setState({
      isActive: true,
      matchString: params.matchString,
      selectedIndex: 0,
      suggestions: params.suggestions,
      triggerPosition: params.triggerPosition,
      triggerBoxPosition: params.triggerBoxPosition,
      triggerNode: params.triggerNode,
      triggerOffset: params.triggerOffset,
      triggerIndex: params.triggerIndex
    });
  }, []);

  const hideAutocomplete = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const selectNext = useCallback(() => {
    setState(prev => {
      if (!prev.isActive || prev.suggestions.length === 0) return prev;
      
      const newIndex = (prev.selectedIndex + 1) % prev.suggestions.length;
      return { ...prev, selectedIndex: newIndex };
    });
  }, []);

  const selectPrevious = useCallback(() => {
    setState(prev => {
      if (!prev.isActive || prev.suggestions.length === 0) return prev;
      
      const newIndex = prev.selectedIndex - 1;
      return { 
        ...prev, 
        selectedIndex: newIndex < 0 ? prev.suggestions.length - 1 : newIndex 
      };
    });
  }, []);

  const setSelectedIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedIndex: index }));
  }, []);

  const getSelectedSuggestion = () => {
    if (!state.isActive || state.suggestions.length === 0) return null;
    return state.suggestions[state.selectedIndex] || null;
  };

  const actions: AutocompleteActions = {
    showAutocomplete,
    hideAutocomplete,
    selectNext,
    selectPrevious,
    setSelectedIndex,
    getSelectedSuggestion
  };

  return [state, actions];
}