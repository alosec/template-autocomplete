import { renderHook, act } from '@testing-library/react';
import { useAutocompleteState } from '../../../src/editor/hooks/useAutocompleteState';
import { testSuggestions } from '../shared/mockData';
import { TestLogger } from '../../shared/testHelpers';

describe('useAutocompleteState Hook', () => {
  it('initializes with default state', () => {
    const logger = new TestLogger('useAutocompleteState - initialization').start(
      'Verify hook initializes with correct default state'
    );
    
    logger.step('Rendering useAutocompleteState hook');
    const { result } = renderHook(() => useAutocompleteState());
    
    logger.result(`Initial state - isOpen: ${result.current.state.isOpen}, selectedIndex: ${result.current.state.selectedIndex}`);
    
    expect(result.current.state.isOpen).toBe(false);
    expect(result.current.state.selectedIndex).toBe(-1);
    expect(result.current.state.suggestions).toEqual([]);
    expect(result.current.state.triggerIndex).toBe(-1);
    expect(result.current.state.matchString).toBe('');
    
    logger.success('Hook initialization working correctly');
  });

  it('opens autocomplete with suggestions', () => {
    const logger = new TestLogger('useAutocompleteState - open autocomplete').start(
      'Verify hook can open autocomplete with suggestions'
    );
    
    const { result } = renderHook(() => useAutocompleteState());
    
    logger.step('Opening autocomplete with test suggestions');
    act(() => {
      result.current.actions.openAutocomplete(testSuggestions, 5, 'test');
    });
    
    logger.result(`State after opening - isOpen: ${result.current.state.isOpen}, suggestions count: ${result.current.state.suggestions.length}`);
    
    expect(result.current.state.isOpen).toBe(true);
    expect(result.current.state.suggestions).toEqual(testSuggestions);
    expect(result.current.state.triggerIndex).toBe(5);
    expect(result.current.state.matchString).toBe('test');
    expect(result.current.state.selectedIndex).toBe(-1);
    
    logger.success('Autocomplete opening working correctly');
  });

  it('closes autocomplete and resets state', () => {
    const logger = new TestLogger('useAutocompleteState - close autocomplete').start(
      'Verify hook properly closes autocomplete and resets state'
    );
    
    const { result } = renderHook(() => useAutocompleteState());
    
    logger.step('Opening autocomplete first');
    act(() => {
      result.current.actions.openAutocomplete(testSuggestions, 5, 'test');
    });
    
    logger.step('Closing autocomplete');
    act(() => {
      result.current.actions.closeAutocomplete();
    });
    
    logger.result(`State after closing - isOpen: ${result.current.state.isOpen}, suggestions count: ${result.current.state.suggestions.length}`);
    
    expect(result.current.state.isOpen).toBe(false);
    expect(result.current.state.suggestions).toEqual([]);
    expect(result.current.state.selectedIndex).toBe(-1);
    expect(result.current.state.triggerIndex).toBe(-1);
    expect(result.current.state.matchString).toBe('');
    
    logger.success('Autocomplete closing working correctly');
  });

  it('navigates through suggestions with keyboard', () => {
    const logger = new TestLogger('useAutocompleteState - keyboard navigation').start(
      'Verify keyboard navigation through suggestions works correctly'
    );
    
    const { result } = renderHook(() => useAutocompleteState());
    
    logger.step('Opening autocomplete with suggestions');
    act(() => {
      result.current.actions.openAutocomplete(testSuggestions, 5, 'test');
    });
    
    logger.step('Navigating down through suggestions');
    act(() => {
      result.current.actions.selectNext();
    });
    
    logger.result(`Selected index after first down: ${result.current.state.selectedIndex}`);
    expect(result.current.state.selectedIndex).toBe(0);
    
    act(() => {
      result.current.actions.selectNext();
    });
    
    logger.result(`Selected index after second down: ${result.current.state.selectedIndex}`);
    expect(result.current.state.selectedIndex).toBe(1);
    
    logger.step('Navigating up through suggestions');
    act(() => {
      result.current.actions.selectPrevious();
    });
    
    logger.result(`Selected index after up: ${result.current.state.selectedIndex}`);
    expect(result.current.state.selectedIndex).toBe(0);
    
    logger.success('Keyboard navigation working correctly');
  });

  it('wraps around at boundaries during navigation', () => {
    const logger = new TestLogger('useAutocompleteState - navigation wrapping').start(
      'Verify navigation wraps around at list boundaries'
    );
    
    const { result } = renderHook(() => useAutocompleteState());
    
    act(() => {
      result.current.actions.openAutocomplete(testSuggestions, 5, 'test');
    });
    
    logger.step('Navigating up from initial position (should wrap to last)');
    act(() => {
      result.current.actions.selectPrevious();
    });
    
    logger.result(`Selected index after wrap-up: ${result.current.state.selectedIndex}`);
    expect(result.current.state.selectedIndex).toBe(testSuggestions.length - 1);
    
    logger.step('Navigating down from last position (should wrap to first)');
    act(() => {
      result.current.actions.selectNext();
    });
    
    logger.result(`Selected index after wrap-down: ${result.current.state.selectedIndex}`);
    expect(result.current.state.selectedIndex).toBe(0);
    
    logger.success('Navigation wrapping working correctly');
  });
});