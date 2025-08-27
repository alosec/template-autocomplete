# Active Context

## Current Work Focus

### Critical Issue: Adversarial Autocomplete Input Handling
**Primary Challenge**: Autocomplete trigger detection failing for complex input patterns

**Specific Problem Case**: 
- Input string: `<><><>>>>>><<<<>>><<<>>>`
- Position: `<><><>>>>>><<<<>>><<<>|>>` (after `<>` at position 20)
- **Left-to-right navigation**: ✅ Dropdown appears correctly  
- **Right-to-left navigation**: ❌ Dropdown fails to appear
- **Additional Issue**: Dropdown doesn't close properly when it should

**Current Understanding Gap**: 
After extensive debugging of `detectTrigger` function, root cause remains unclear. The issue may not be in trigger detection logic at all, but rather in:
1. **Navigation Handling** - How cursor movement events are processed differently by direction
2. **State Management** - How autocomplete state is updated during navigation
3. **Event Timing** - Race conditions or timing issues between navigation and trigger checking

**Key Insight**: "It's not a matter of getting it right, it's a matter of understanding the nature of the code and the nature of the problem." Current approach has been spinning wheels on trigger detection without sufficient understanding of the full system behavior.

**New North Star**: Focus on adversarial input scenarios and systematic understanding of the autocomplete system's three main components:
- Trigger Detection (`detectTrigger` in `autocompleteUtils.ts`)
- Navigation Handling (`useAutocompleteTrigger.ts` cursor movement logic)  
- State Management (`useAutocompleteState.ts` dropdown visibility)

### Recently Completed (Previous Session)
**Global Brain Idea Flow Matrix** - Major paradigm shift completed:
- ✅ Tinder-style discovery interface with 🧠 brain toggle
- ✅ Centered card layout replacing complex sidebar
- ✅ Random selection logic for serendipitous discovery

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

### **Current Priority**: Systematic Autocomplete Debugging
**Approach**: Move beyond trigger detection to understand full system behavior

#### Phase 1: Navigation Handling Analysis (Next)
1. **Add logging to cursor movement detection** in `useAutocompleteTrigger.ts`
2. **Trace event flow**: Left-to-right vs right-to-left navigation differences  
3. **Identify timing issues**: Are events firing in different orders?
4. **Check selection state**: Is cursor position calculated differently by direction?

#### Phase 2: State Management Investigation  
1. **Add state debugging** to `useAutocompleteState.ts`
2. **Track state transitions**: When does dropdown show/hide get called?
3. **Identify race conditions**: Are state updates conflicting?
4. **Test isolation**: Call trigger detection directly vs through navigation

#### Phase 3: Holistic System Understanding
1. **Create minimal reproduction case** 
2. **Document exact event sequence** for both working and failing scenarios
3. **Map interaction between all three components**
4. **Implement targeted fix** based on root cause understanding

### **Future Goal**: Rich Dataset from Global Brain Platform  
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