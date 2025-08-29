import { useState, useRef, useCallback } from 'react';
import { LexicalEditor } from 'lexical';
import { HIDE_AUTOCOMPLETE_COMMAND } from '../editor/commands/autocompleteCommands';
import { useGlobalBrain } from '../hooks/useGlobalBrain';
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
  onLoadCurrentIdea 
}: TopBrainPanelProps) {
  const { loading: dataLoading } = useGlobalBrain();
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      
      <div 
        className="resize-handle-bottom"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}