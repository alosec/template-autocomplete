import { useState, useRef, useCallback } from 'react';
import { LexicalEditor } from 'lexical';
import { HIDE_AUTOCOMPLETE_COMMAND } from '../editor/commands/autocompleteCommands';
import { useGlobalBrain } from '../hooks/useGlobalBrain';
import { AutocompleteItem } from '../types/GlobalBrainTypes';
import './top-brain-panel.css';

interface TopBrainPanelProps {
  isVisible: boolean;
  height: number;
  onHeightChange: (height: number) => void;
  onPanelClose: () => void;
  editorRef?: React.MutableRefObject<LexicalEditor | null>;
  currentIdea: any;
  canGoBack: boolean;
  canGoForward: boolean;
  onNextIdea: () => void;
  onBackIdea: () => void;
  onForwardIdea: () => void;
  onLoadCurrentIdea: () => void;
  onSelectIdea?: (idea: AutocompleteItem) => void;
}


export default function TopBrainPanel({ 
  isVisible, 
  height, 
  onHeightChange, 
  onPanelClose, 
  editorRef, 
  currentIdea, 
  canGoBack, 
  canGoForward, 
  onNextIdea, 
  onBackIdea, 
  onForwardIdea, 
  onLoadCurrentIdea,
  onSelectIdea 
}: TopBrainPanelProps) {
  const { loading: dataLoading, getFilteredSuggestions } = useGlobalBrain();
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  
  // Get filtered results dynamically instead of caching them
  const filteredResults = searchQuery.trim() ? getFilteredSuggestions(searchQuery) : [];
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);


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

  const handleLoadCurrentIdea = useCallback(async () => {
    if (!currentIdea) return;
    
    setIsLoading(true);
    try {
      await onLoadCurrentIdea();
      onPanelClose();
    } finally {
      setIsLoading(false);
    }
  }, [currentIdea, onLoadCurrentIdea, onPanelClose]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedResultIndex(0);
    
    if (query.trim()) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (searchQuery.trim()) {
      setShowResults(true);
    }
  }, [searchQuery]);

  const handleSearchBlur = useCallback(() => {
    setTimeout(() => setShowResults(false), 150);
  }, []);

  const handleResultClick = useCallback((result: AutocompleteItem) => {
    setSearchQuery(result.text);
    setShowResults(false);
    setSelectedResultIndex(0);
    if (onSelectIdea) {
      onSelectIdea(result);
    }
  }, [onSelectIdea]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || filteredResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedResultIndex(prev => 
          prev < filteredResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedResultIndex(prev => 
          prev > 0 ? prev - 1 : filteredResults.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        const selectedResult = filteredResults[selectedResultIndex];
        if (selectedResult) {
          handleResultClick(selectedResult);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedResultIndex(0);
        break;
    }
  }, [showResults, filteredResults, selectedResultIndex, handleResultClick]);


  // Show loading state while data is loading
  if (dataLoading || !currentIdea) {
    return (
      <div 
        className="top-brain-panel"
        style={{ height: isVisible ? 'auto' : '0px' }}
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
      style={{ height: isVisible ? 'auto' : '0px' }}
      onMouseDown={handlePanelMouseDown}
    >
      <div className="panel-content">
        <div className="search-container">
          <input
            type="text"
            className="brain-search-bar"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onKeyDown={handleKeyDown}
          />
          {showResults && filteredResults.length > 0 && (
            <div className="search-results-dropdown">
              {filteredResults.slice(0, 8).map((result, index) => (
                <div
                  key={index}
                  className={`search-result-item ${index === selectedResultIndex ? 'selected' : ''}`}
                  onMouseDown={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedResultIndex(index)}
                >
                  <div className="result-title">{result.text}</div>
                  <div className="result-meta">
                    <span className="result-type">{result.type}</span>
                    {result.tags.slice(0, 2).map((tag, tagIndex) => (
                      <span key={tagIndex} className="result-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="idea-display">
          <div className="idea-title">{currentIdea.text}</div>
          <div className="idea-meta">
            <span className="idea-type">{currentIdea.type}</span>
            {currentIdea.tags && currentIdea.tags.slice(0, 3).map((tag: string, index: number) => (
              <span key={index} className="idea-tag">{tag}</span>
            ))}
          </div>
          <div className="idea-description">{currentIdea.description}</div>
        </div>
      </div>
      
      <div className="controls">
        <button 
          className="back-btn" 
          onClick={onBackIdea}
          disabled={!canGoBack}
          title="Go back to previous idea"
        >
          ← Back
        </button>
        <button className="next-btn" onClick={onNextIdea} title="Discover next idea">
          Next 🎲
        </button>
        <button 
          className="forward-btn" 
          onClick={onForwardIdea}
          disabled={!canGoForward}
          title="Go forward in history"
        >
          Forward →
        </button>
        <button className="load-btn" onClick={handleLoadCurrentIdea} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load This'}
        </button>
      </div>
    </div>
  );
}