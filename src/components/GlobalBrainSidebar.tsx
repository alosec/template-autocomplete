import { useState } from 'react';

interface GlobalBrainSidebarProps {
  isVisible: boolean;
  onToggle: () => void;
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

export default function GlobalBrainSidebar({ isVisible, onToggle }: GlobalBrainSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = GLOBAL_BRAIN_DATA.filter(item => 
    !searchTerm.trim() || 
    item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className={`global-brain-sidebar ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="sidebar-header">
        <h3>Global Brain</h3>
        <button className="sidebar-toggle" onClick={onToggle}>
          {isVisible ? '←' : '→'}
        </button>
      </div>
      
      {isVisible && (
        <div className="sidebar-content">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search Global Brain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sidebar-search"
            />
            <div className="stats">
              {GLOBAL_BRAIN_DATA.length} items total
            </div>
          </div>

          <div className="content-section">
            <h4>Global Brain Items</h4>
            {filteredData.map((item, index) => (
              <div key={`${item.text}-${index}`} className="brain-item">
                <div className="item-header">
                  <span className="item-title">{item.text}</span>
                  <span className={`priority-badge ${item.priority}`}>
                    {item.priority}
                  </span>
                </div>
                <p className="item-description">{item.description}</p>
                {item.tags && (
                  <div className="item-tags">
                    {item.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}