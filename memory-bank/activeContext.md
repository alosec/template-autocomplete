# Active Context

## Current Work Focus

### Recently Completed (Current Session)
**Global Brain Idea Flow Matrix** - Major paradigm shift from complex sidebar to serendipitous discovery:

- ✅ **Paradigm Evolution**: Moved from left sidebar → marquee ticker → centered card discovery
- ✅ **Tinder-Style Interface**: One idea at a time with Next 🎲 and Load This actions
- ✅ **Crapboard-Inspired Simplicity**: Focus on organic, serendipitous content discovery
- ✅ **Minimalist Card Design**: Sharp gray borders, centered layout, clean typography
- ✅ **Brain Toggle**: 🧠 emoji button in toolbar (replaced arrow sidebar toggle)
- ✅ **Random Selection Logic**: Algorithmic idea shuffling for discovery experience

### Technical Implementation Details
- Created `TopBrainPanel` component with resizable height (200-600px)
- Implemented centered card layout with idea-centric design
- Added random item selection with `Math.floor(Math.random() * GLOBAL_BRAIN_DATA.length)`
- Maintained document loading integration with existing workflow
- Removed complex marquee/ticker implementations in favor of simplicity

## Current State Assessment

### What's Working Excellently
1. **Core Editor**: Lexical integration solid with custom autocomplete system
2. **Document System**: Full CRUD operations with IndexedDB persistence  
3. **Global Brain UX**: Clean discovery interface capturing Crapboard essence
4. **Test Coverage**: 100% pass rate with comprehensive test suite
5. **Architecture**: Clean separation of concerns with manager patterns

### Critical Next Phase: Dataset Expansion

#### **PRIMARY LIMITATION**: Static 8-Item Dataset
Current Global Brain data is hardcoded with only 8 sample items:
- 2 categories ("Claude's Investigations", "impt unsolved problems")
- 6 research/challenge items with basic metadata

#### **URGENT NEED**: Robust Data Structure Evolution
Current schema is insufficient for rich content:
```typescript
// Current limited structure
{
  text: string;
  type: "category" | "research" | "item" | "challenge";
  description: string;
  tags?: string[];
  priority?: "high" | "medium";
  itemCount?: number;
}
```

**Required evolution** to support scraped Global Brain platform content:
```typescript
interface EnhancedGlobalBrainItem {
  text: string;
  type: ContentType; // Expanded taxonomy
  description: string;
  source: "global-brain-platform" | "curated";
  tags: string[];
  priority: Priority;
  domain?: Domain; // Scientific, philosophical, technical
  urgency?: Urgency;
  category: string; // Parent category from platform
  relatedItems?: string[]; // Cross-references
  extractionMetadata: {
    originalContext: string;
    parentCategory: string;
    contentDepth: number;
    platformLocation: string;
  };
}
```

## Immediate Next Steps

### **North Star Goal**: Rich Dataset from Global Brain Platform
Target: 300+ high-quality items extracted from https://edge.globalbrain.ai/

#### Phase 1: Platform Content Scraping (Next Session)
1. **Execute Scraping Plan**: Implement the comprehensive extraction documented in `planning/scrape-brain.md`
2. **Category Mapping**: Extract content from major categories:
   - "Claude's Investigations" (2,595+ items)
   - "impt unsolved problems" (16+ items)
   - "Global Brain", "World Suggestion Boxes", "Curated Lists"
   - Scientific Progress, philosophical insights

3. **Content Classification**: Implement rich taxonomy system
   - Research problems with context and urgency
   - Philosophical insights with depth indicators
   - Cross-reference networks between related items
   - Rich descriptions from surrounding platform context

#### Phase 2: Type System & Schema Evolution
1. **Update TypeScript interfaces** to support expanded metadata
2. **Enhance component rendering** to display rich content appropriately
3. **Maintain backward compatibility** with existing 8-item sample set
4. **Add content quality indicators** (depth, relevance, cross-references)

#### Phase 3: Integration & Polish
1. **Dynamic Autocomplete**: Connect `<>` triggers to expanded dataset tags
2. **Smart Discovery**: Implement content recommendation based on user interaction
3. **Quality Filtering**: Prioritize high-value research problems and insights

## Development Context

### Current Branch
`feature/minimal-text-editor` - Latest: `fc6ed3a` Global Brain Idea Flow Matrix

### Recent Commits
- `fc6ed3a`: Global Brain Idea Flow Matrix implementation (latest)
- `f89306d`: Global brain JSON data integration
- `31644c7`: Click-to-toggle dropdown menus
- `9bb6d9e`: Cursor-aware autocomplete scenarios

### Environment State
- Dev server: `localhost:5173` (port changed)
- All dependencies current
- Test suite: 100% pass rate
- Build: Clean, no errors

## Strategic Direction

### Content Quality Over Quantity
- Focus on **meaningful research problems** and **actionable insights**
- Prioritize content that sparks creativity and intellectual curiosity
- Maintain the **serendipitous discovery** experience that makes Crapboard compelling

### Technical Excellence
- Preserve clean architecture and test coverage standards
- Maintain performance with larger dataset (lazy loading, efficient rendering)
- Keep the interface **dead simple** - complexity kills discovery magic

### User Experience North Star
The Global Brain Idea Flow Matrix should feel like:
- **Stumbling upon fascinating ideas** unexpectedly
- **Academic Twitter** but curated and substantial
- **Research rabbit holes** made discoverable
- **Intellectual serendipity** in a clean, focused interface

Ready for robust dataset expansion to transform this proof-of-concept into a genuinely compelling knowledge discovery tool.