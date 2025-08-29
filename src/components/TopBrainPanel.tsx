import { useState, useRef, useCallback, useMemo } from 'react';
import { LexicalEditor } from 'lexical';
import { HIDE_AUTOCOMPLETE_COMMAND } from '../editor/commands/autocompleteCommands';
import { useGlobalBrain } from '../hooks/useGlobalBrain';
import { AutocompleteItem } from '../types/GlobalBrainTypes';
import './top-brain-panel.css';

interface TopBrainPanelProps {
  isVisible: boolean;
  height: number;
  onHeightChange: (height: number) => void;
  onLoadItem: (item: any) => void;
  editorRef?: React.MutableRefObject<LexicalEditor | null>;
}

// Navigation history management
class NavigationHistory {
  private history: number[] = [];
  private currentIndex: number = -1;
  private forwardStack: number[] = [];

  addToHistory(index: number): void {
    // If we're in the middle of history (after going back), clear forward stack
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    
    // Clear forward stack when navigating to new item
    this.forwardStack = [];
    
    // Add to history
    this.history.push(index);
    this.currentIndex = this.history.length - 1;
  }

  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  canGoForward(): boolean {
    return this.forwardStack.length > 0;
  }

  goBack(): number | null {
    if (!this.canGoBack()) return null;
    
    // Move current item to forward stack
    this.forwardStack.push(this.history[this.currentIndex]);
    this.currentIndex--;
    return this.history[this.currentIndex];
  }

  goForward(): number | null {
    if (!this.canGoForward()) return null;
    
    const forwardIndex = this.forwardStack.pop()!;
    this.currentIndex++;
    this.history[this.currentIndex] = forwardIndex;
    return forwardIndex;
  }

  getCurrentIndex(): number {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : -1;
  }

  size(): number {
    return this.history.length;
  }
}

// Intelligent next item selection function
const getNextIntelligentIndex = (items: AutocompleteItem[], seen: Set<number>, currentIdx: number): number => {
  if (items.length === 0) return 0;
  
  // Create weighted pool based on priority and item count
  const weightedPool: number[] = [];
  
  items.forEach((item, index) => {
    if (index === currentIdx) return; // Skip current item
    
    let weight = 1;
    
    // Priority weighting
    if (item.priority === 'high') weight += 3;
    else if (item.priority === 'medium') weight += 1;
    
    // Item count weighting (categories with more items get slight boost)
    if ('itemCount' in item && item.itemCount && item.itemCount > 100) weight += 1;
    
    // Unseen items get significant boost
    if (!seen.has(index)) weight += 5;
    
    // Add to pool based on weight
    for (let i = 0; i < weight; i++) {
      weightedPool.push(index);
    }
  });
  
  // If no weighted options, fallback to unseen or random
  if (weightedPool.length === 0) {
    const unseenIndices = items
      .map((_, index) => index)
      .filter(index => !seen.has(index) && index !== currentIdx);
    
    if (unseenIndices.length > 0) {
      return unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
    }
    
    // All seen, pick random different from current
    const availableIndices = items
      .map((_, index) => index)
      .filter(index => index !== currentIdx);
    return availableIndices[Math.floor(Math.random() * availableIndices.length)] || 0;
  }
  
  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
};

export default function TopBrainPanel({ isVisible, height, onHeightChange, onLoadItem, editorRef }: TopBrainPanelProps) {
  const { suggestions, loading: dataLoading } = useGlobalBrain();
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [seenIndices, setSeenIndices] = useState<Set<number>>(new Set());
  const navigationHistory = useRef(new NavigationHistory());
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Initialize with first item when data loads
  useMemo(() => {
    if (suggestions.length > 0 && navigationHistory.current.size() === 0) {
      const initialIndex = getNextIntelligentIndex(suggestions, new Set(), -1);
      setCurrentItemIndex(initialIndex);
      navigationHistory.current.addToHistory(initialIndex);
      setSeenIndices(new Set([initialIndex]));
    }
  }, [suggestions]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  }, [height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const deltaY = e.clientY - startYRef.current;
    const newHeight = Math.max(200, Math.min(600, startHeightRef.current + deltaY));
    onHeightChange(newHeight);
  }, [isResizing, onHeightChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleNextIdea = useCallback(() => {
    if (suggestions.length === 0) return;
    
    const nextIndex = getNextIntelligentIndex(suggestions, seenIndices, currentItemIndex);
    setCurrentItemIndex(nextIndex);
    navigationHistory.current.addToHistory(nextIndex);
    setSeenIndices(prev => new Set([...prev, nextIndex]));
  }, [suggestions, seenIndices, currentItemIndex]);

  const handleBackIdea = useCallback(() => {
    const backIndex = navigationHistory.current.goBack();
    if (backIndex !== null) {
      setCurrentItemIndex(backIndex);
    }
  }, []);

  const handleForwardIdea = useCallback(() => {
    const forwardIndex = navigationHistory.current.goForward();
    if (forwardIndex !== null) {
      setCurrentItemIndex(forwardIndex);
    }
  }, []);

  const handleLoadCurrentIdea = useCallback(async () => {
    if (!suggestions[currentItemIndex]) return;
    
    setIsLoading(true);
    try {
      await onLoadItem(suggestions[currentItemIndex]);
    } finally {
      setIsLoading(false);
    }
  }, [onLoadItem, currentItemIndex, suggestions]);

  const currentIdea = suggestions[currentItemIndex];
  const canGoBack = navigationHistory.current.canGoBack();
  const canGoForward = navigationHistory.current.canGoForward();

  // Show loading state while data is loading
  if (dataLoading || !currentIdea) {
    return (
      <div 
        className="top-brain-panel"
        style={{ height: isVisible ? `${height}px` : '0px' }}
      >
        <div className="panel-content">
          <div className="idea-display">
            <div className="idea-title">Loading Global Brain...</div>
            <div className="idea-description">Discovering amazing ideas for you</div>
          </div>
        </div>
        <div 
          className="resize-handle-bottom"
          onMouseDown={handleMouseDown}
        />
      </div>
    );
  }

  const handlePanelMouseDown = () => {
    // Close autocomplete when clicking anywhere in brain panel
    if (editorRef?.current) {
      editorRef.current.dispatchCommand(HIDE_AUTOCOMPLETE_COMMAND, undefined);
    }
  };

  return (
    <div 
      ref={panelRef}
      className="top-brain-panel"
      style={{ height: isVisible ? `${height}px` : '0px' }}
      onMouseDown={handlePanelMouseDown}
    >
      <div className="panel-content">
        <div className="idea-display">
          <div className="idea-title">{currentIdea.text}</div>
          <div className="idea-meta">
            <span className="idea-type">{currentIdea.type}</span>
            {currentIdea.tags && currentIdea.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="idea-tag">{tag}</span>
            ))}
          </div>
          <div className="idea-description">{currentIdea.description}</div>
        </div>
      </div>
      
      <div className="controls">
        <button 
          className="back-btn" 
          onClick={handleBackIdea}
          disabled={!canGoBack}
          title="Go back to previous idea"
        >
          ← Back
        </button>
        <button className="next-btn" onClick={handleNextIdea} title="Discover next idea">
          Next 🎲
        </button>
        <button 
          className="forward-btn" 
          onClick={handleForwardIdea}
          disabled={!canGoForward}
          title="Go forward in history"
        >
          Forward →
        </button>
        <button className="load-btn" onClick={handleLoadCurrentIdea} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load This'}
        </button>
      </div>
      
      <div 
        className="resize-handle-bottom"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}