import { useState } from 'react';

interface TickerItem {
  text: string;
  type: string;
  description: string;
  tags?: string[];
}

interface MarqueeTickerProps {
  item: TickerItem;
  direction: 'left' | 'right';
  onClick: (item: TickerItem) => void;
  isPaused: boolean;
}

export default function MarqueeTicker({ item, direction, onClick, isPaused }: MarqueeTickerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatContent = () => {
    const parts = [item.text, item.type];
    
    if (item.tags && item.tags.length > 0) {
      parts.push(item.tags.slice(0, 3).join(', '));
    } else if (item.description) {
      // Use description for items without tags
      parts.push(item.description.slice(0, 60) + '...');
    }
    
    return parts.join(' | ');
  };

  const tickerContent = formatContent();

  return (
    <div 
      className={`marquee-ticker ${direction}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(item)}
      title={`${item.description} - Click to load`}
    >
      <div 
        className={`ticker-content ${isPaused || isHovered ? 'paused' : ''}`}
      >
        <span className="ticker-text">{tickerContent}</span>
        <span className="ticker-text">{tickerContent}</span> {/* Duplicate for seamless loop */}
      </div>
    </div>
  );
}