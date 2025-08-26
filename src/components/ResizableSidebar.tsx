import { useState, useRef, useCallback } from 'react';
import './resizable-sidebar.css';

interface ResizableSidebarProps {
  isVisible: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
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

export default function ResizableSidebar({ isVisible, onToggle, width, onWidthChange, onLoadItem }: ResizableSidebarProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [loadingItemIndex, setLoadingItemIndex] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const deltaX = e.clientX - startXRef.current;
    const newWidth = Math.max(200, Math.min(600, startWidthRef.current + deltaX));
    onWidthChange(newWidth);
  }, [isResizing, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleItemClick = useCallback(async (item: any, index: number) => {
    setLoadingItemIndex(index);
    try {
      await onLoadItem(item);
    } finally {
      setLoadingItemIndex(null);
    }
  }, [onLoadItem]);

  if (!isVisible) return null;

  return (
    <div 
      ref={sidebarRef}
      className="resizable-sidebar"
      style={{ width: `${width}px` }}
    >
      <div className="sidebar-header">
        <span className="sidebar-title">Global Brain</span>
      </div>
      
      <div className="sidebar-content">
        {GLOBAL_BRAIN_DATA.map((item, index) => (
          <div 
            key={`${item.text}-${index}`} 
            className={`brain-item-flat ${loadingItemIndex === index ? 'loading' : ''}`}
            onClick={() => handleItemClick(item, index)}
            title="Click to load as document"
          >
            <div className="item-title-flat">
              {loadingItemIndex === index && <span className="loading-spinner">⟳</span>}
              {item.text}
            </div>
            <div className="item-description-flat">{item.description}</div>
            {item.tags && (
              <div className="item-tags-flat">
                {item.tags.map((tag, tagIndex) => (
                  <span key={tagIndex} className="tag-flat">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div 
        className="resize-handle"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}