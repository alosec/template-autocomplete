import { renderHook, act } from '@testing-library/react';
import { useAutocompleteState } from '../../../src/editor/hooks/useAutocompleteState';
import { testSuggestions } from '../shared/mockData';

describe('useAutocompleteState', () => {
  it('starts with inactive state', () => {
    const { result } = renderHook(() => useAutocompleteState());
    const [state] = result.current;
    
    expect(state.isActive).toBe(false);
    expect(state.matchString).toBe('');
    expect(state.selectedIndex).toBe(0);
    expect(state.suggestions).toEqual([]);
  });

  it('shows autocomplete with provided data', () => {
    const { result } = renderHook(() => useAutocompleteState());
    const [, actions] = result.current;
    
    act(() => {
      actions.showAutocomplete({
        matchString: 'test',
        suggestions: testSuggestions,
        triggerPosition: { top: 100, left: 50 },
        triggerBoxPosition: { top: 120, left: 60 },
        triggerNode: null as any, // Simple mock
        triggerOffset: 5,
        triggerIndex: 10
      });
    });
    
    const [state] = result.current;
    expect(state.isActive).toBe(true);
    expect(state.matchString).toBe('test');
    expect(state.suggestions).toEqual(testSuggestions);
    expect(state.selectedIndex).toBe(0);
  });

  it('hides autocomplete and resets state', () => {
    const { result } = renderHook(() => useAutocompleteState());
    const [, actions] = result.current;
    
    // First show autocomplete
    act(() => {
      actions.showAutocomplete({
        matchString: 'test',
        suggestions: testSuggestions,
        triggerPosition: { top: 100, left: 50 },
        triggerBoxPosition: { top: 120, left: 60 },
        triggerNode: null as any,
        triggerOffset: 5,
        triggerIndex: 10
      });
    });
    
    // Then hide it
    act(() => {
      actions.hideAutocomplete();
    });
    
    const [state] = result.current;
    expect(state.isActive).toBe(false);
    expect(state.matchString).toBe('');
    expect(state.selectedIndex).toBe(0);
  });

  it('navigates through suggestions with selectNext', () => {
    const { result } = renderHook(() => useAutocompleteState());
    const [, actions] = result.current;
    
    act(() => {
      actions.showAutocomplete({
        matchString: 'test',
        suggestions: testSuggestions,
        triggerPosition: { top: 100, left: 50 },
        triggerBoxPosition: { top: 120, left: 60 },
        triggerNode: null as any,
        triggerOffset: 5,
        triggerIndex: 10
      });
    });
    
    // Start at index 0
    expect(result.current[0].selectedIndex).toBe(0);
    
    // Move to index 1
    act(() => {
      actions.selectNext();
    });
    expect(result.current[0].selectedIndex).toBe(1);
    
    // Move to index 2
    act(() => {
      actions.selectNext();
    });
    expect(result.current[0].selectedIndex).toBe(2);
    
    // Wrap around to index 0
    act(() => {
      actions.selectNext();
    });
    expect(result.current[0].selectedIndex).toBe(0);
  });

  it('navigates backwards with selectPrevious', () => {
    const { result } = renderHook(() => useAutocompleteState());
    const [, actions] = result.current;
    
    act(() => {
      actions.showAutocomplete({
        matchString: 'test',
        suggestions: testSuggestions,
        triggerPosition: { top: 100, left: 50 },
        triggerBoxPosition: { top: 120, left: 60 },
        triggerNode: null as any,
        triggerOffset: 5,
        triggerIndex: 10
      });
    });
    
    // Start at index 0, go to last item
    act(() => {
      actions.selectPrevious();
    });
    expect(result.current[0].selectedIndex).toBe(2); // Last item
    
    // Go to second-to-last
    act(() => {
      actions.selectPrevious();
    });
    expect(result.current[0].selectedIndex).toBe(1);
  });

  it('gets the currently selected suggestion', () => {
    const { result } = renderHook(() => useAutocompleteState());
    
    act(() => {
      const [, actions] = result.current;
      actions.showAutocomplete({
        matchString: 'test',
        suggestions: testSuggestions,
        triggerPosition: { top: 100, left: 50 },
        triggerBoxPosition: { top: 120, left: 60 },
        triggerNode: null as any,
        triggerOffset: 5,
        triggerIndex: 10
      });
    });
    
    // Should get first suggestion
    const [, actions] = result.current;
    let selected = actions.getSelectedSuggestion();
    expect(selected).toEqual(testSuggestions[0]);
    
    // Move to next and check
    act(() => {
      actions.selectNext();
    });
    selected = actions.getSelectedSuggestion();
    expect(selected).toEqual(testSuggestions[1]);
  });

  it('returns null for selected suggestion when inactive', () => {
    const { result } = renderHook(() => useAutocompleteState());
    const [, actions] = result.current;
    
    const selected = actions.getSelectedSuggestion();
    expect(selected).toBe(null);
  });
});