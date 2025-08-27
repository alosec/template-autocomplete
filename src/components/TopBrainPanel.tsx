import { useState, useRef, useCallback } from 'react';
import './top-brain-panel.css';

interface TopBrainPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  onLoadItem: (item: any) => void;
}

// Hardcoded Global Brain data from the JSON file
const GLOBAL_BRAIN_DATA = [
  {
    text: "Claude's Investigations",
    type: "category",
    description: "2595 related items",
    itemCount: 2595,
    priority: "high"
  },
  {
    text: "impt unsolved problems", 
    type: "category",
    description: "16 related items",
    itemCount: 16,
    priority: "high"
  },
  {
    text: "Gut-Brain Axis Drug Repurposing",
    type: "research",
    description: "Research on repurposing drugs through gut-brain axis connections",
    priority: "high",
    tags: ["gut-brain", "drug-repurposing", "research"]
  },
  {
    text: "Urban vertical farming networks",
    type: "item", 
    description: "City-based vertical farming systems for sustainable food production",
    priority: "high",
    tags: ["vertical farming", "urban", "agriculture", "sustainability"]
  },
  {
    text: "Ocean plastic cleanup initiatives",
    type: "item",
    description: "Projects and technologies focused on removing plastic pollution from oceans", 
    priority: "high",
    tags: ["ocean", "plastic", "cleanup", "environment"]
  },
  {
    text: "Creating universal cancer vaccines",
    type: "challenge",
    description: "Developing vaccines that prevent or treat all forms of cancer",
    priority: "high",
    tags: ["cancer", "vaccines", "oncology", "prevention"]
  },
  {
    text: "Global basic income pilot programs",
    type: "item",
    description: "Experimental programs testing universal basic income implementation globally",
    priority: "medium",
    tags: ["basic income", "pilot", "economic policy"]
  },
  {
    text: "AI consciousness detection methods",
    type: "research", 
    description: "Methods to detect and measure consciousness in artificial intelligence systems",
    priority: "high",
    tags: ["AI", "consciousness", "detection", "research"]
  }
];

export default function TopBrainPanel({ isVisible, onToggle, height, onHeightChange, onLoadItem }: TopBrainPanelProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
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

  const handleNextIdea = useCallback(() => {
    const nextIndex = Math.floor(Math.random() * GLOBAL_BRAIN_DATA.length);
    setCurrentItemIndex(nextIndex);
  }, []);

  const handleLoadCurrentIdea = useCallback(async () => {
    setIsLoading(true);
    try {
      await onLoadItem(GLOBAL_BRAIN_DATA[currentItemIndex]);
    } finally {
      setIsLoading(false);
    }
  }, [onLoadItem, currentItemIndex]);

  const currentIdea = GLOBAL_BRAIN_DATA[currentItemIndex];

  return (
    <div 
      ref={panelRef}
      className="top-brain-panel"
      style={{ height: isVisible ? `${height}px` : '0px' }}
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
        
        <div className="controls">
          <button className="next-btn" onClick={handleNextIdea}>
            Next 🎲
          </button>
          <button className="load-btn" onClick={handleLoadCurrentIdea} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load This'}
          </button>
        </div>
      </div>
      
      <div 
        className="resize-handle-bottom"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}