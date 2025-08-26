# System Patterns & Architecture

## Core Architecture

### Component Hierarchy
```
App
└── MinimalEditor (main container)
    ├── ResizableSidebar (global brain)
    ├── EditorToolbar (file operations, toggle)
    ├── Document Header (title input)
    └── EditorWithSync (Lexical integration)
        ├── AutocompletePlugin
        └── DocumentSyncPlugin
```

### Data Flow Patterns

#### Document Management Flow
1. **Creation**: `documentManager.createNewDocument()` → IndexedDB
2. **Loading**: User selection → `loadDocument()` → Lexical state sync
3. **Auto-save**: Content change → debounced save → IndexedDB update
4. **Export/Import**: JSON serialization with metadata preservation

#### Global Brain Integration
1. **Item Click**: Sidebar item → `createDocumentFromGlobalBrainItem()`
2. **Document Creation**: Item data → structured content with hashtags
3. **Persistence**: Auto-save to IndexedDB as regular document
4. **Loading States**: Visual feedback during async operations

### Key Design Patterns

#### 1. Manager Pattern
- `DocumentManager`: Centralized document operations
- `StorageManager`: IndexedDB abstraction layer
- Clean separation of concerns with async/await

#### 2. Plugin Architecture (Lexical)
- `AutocompletePlugin`: Handles `<>` trigger and suggestion UI
- `DocumentSyncPlugin`: Manages editor state persistence
- Custom `AutocompleteNode`: Non-editable suggestion rendering

#### 3. Component Composition
- `EditorWithSync`: Composes multiple Lexical plugins
- `MinimalEditor`: Orchestrates all sub-components
- Props drilling minimized with focused component responsibilities

#### 4. Hook Abstraction
- `useDocumentSync`: Document persistence logic
- `useGlobalBrain`: Global brain data management
- Encapsulates complex state management

## Storage Architecture

### IndexedDB Schema
```typescript
Document {
  id: string
  title: string
  content: string (plain text)
  editorState?: string (Lexical JSON)
  createdAt: Date
  updatedAt: Date
  wordCount: number
  concepts: string[] (tags/categories)
}
```

### Storage Layers
1. **StorageManager**: Low-level IndexedDB operations
2. **DocumentManager**: Business logic and validation
3. **Components**: UI state management and user interactions

## UI Patterns

### Layout System
- **Fixed Sidebar**: Left-side with resize handle (200-600px)
- **Main Content**: Dynamic margin-left based on sidebar state
- **Toolbar**: Flat design with dropdown menus
- **Status Bar**: Word count, save status, timestamps

### State Management
- **Local State**: Component-specific UI state (useState)
- **Async State**: Document operations with loading indicators
- **Persistent State**: IndexedDB for document data
- **Derived State**: Word counts, modification status

### Event Handling
- **Debounced Auto-save**: 2-second delay after content changes
- **Keyboard Navigation**: Arrow keys for autocomplete selection
- **Mouse Interactions**: Click-to-select for both autocomplete and sidebar
- **Resize Handling**: Mouse drag for sidebar width adjustment

## Testing Strategy

### Unit Testing
- Component rendering with React Testing Library
- Plugin behavior with Lexical test utilities
- Storage operations with mocked IndexedDB
- Edge cases and error handling

### Integration Testing
- Document import/export workflows
- Autocomplete trigger and selection flows
- Global Brain item loading process
- Cross-component state synchronization

## Performance Considerations

### Optimization Techniques
- **Debounced Save**: Prevents excessive IndexedDB writes
- **Memoized Callbacks**: useCallback for event handlers
- **Efficient Re-renders**: Focused state updates
- **Lazy Loading**: On-demand document loading

### Memory Management
- **Cleanup**: Event listeners removed in useEffect cleanup
- **State Reset**: Clear editor state on document switches
- **Reference Management**: Proper ref handling for DOM operations