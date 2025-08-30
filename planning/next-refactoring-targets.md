# Next Refactoring Targets Plan

## Overview
Following the successful AutocompletePlugin refactoring (423 → 38 lines), we have identified the next two major refactoring targets in the codebase.

## Part 1: MinimalEditor.tsx Refactoring (224 → ~50 lines)

### Current Problems:
1. **Mixed Concerns**: Document management, auto-save, UI state, initialization logic all in one component
2. **Anti-pattern at line 52**: Abusing `useState` for initialization instead of `useEffect`
3. **Complex auto-save logic** (lines 80-112): Mixed with content change handling
4. **Document CRUD operations** scattered throughout
5. **Sidebar state management** mixed with editor logic

### Proposed Modular Architecture:

#### 1. `useDocumentManager` Hook (~60 lines)
```typescript
// Handles all document operations
- currentDocument state
- handleNewDocument
- handleSaveDocument
- handleLoadDocument  
- handleDeleteDocument
- handleLoadGlobalBrainItem
```

#### 2. `useAutoSave` Hook (~40 lines)
```typescript
// Dedicated auto-save logic with debouncing
- isModified state
- autoSaveTimeoutRef
- triggerAutoSave(document)
- cancelAutoSave()
```

#### 3. `useEditorInitialization` Hook (~30 lines)
```typescript
// Proper initialization pattern
- initializeEditor logic
- useEffect for proper mounting
- Loading state management
```

#### 4. `useSidebarState` Hook (~25 lines)
```typescript
// Sidebar UI state management
- sidebarVisible state
- sidebarWidth state
- toggleSidebar
- handleSidebarWidthChange
```

#### 5. `useDocumentContent` Hook (~35 lines)
```typescript
// Content change handling
- handleContentChange
- handleTitleChange
- Word count updates
```

#### 6. Refactored `MinimalEditor.tsx` (~50 lines)
```typescript
// Clean orchestrator using composition
const {document, documentActions} = useDocumentManager();
const {isModified, triggerAutoSave} = useAutoSave();
const {isLoading} = useEditorInitialization(documentActions);
const sidebarProps = useSidebarState();
const contentHandlers = useDocumentContent(document, triggerAutoSave);

// Pure rendering logic only
```

---

## Part 2: StorageManager.ts Refactoring (267 → ~200 lines total)

### Current Problems:
1. **Monolithic class** handling multiple responsibilities
2. **Complex hybrid storage logic** in single `saveDocument` method (36 lines)
3. **Mixing storage strategy with implementation details**
4. **Metadata management coupled with storage operations**
5. **Settings management mixed with document storage**

### Proposed Modular Architecture:

#### 1. `StorageStrategy` Interface & Factory (~30 lines)
```typescript
interface StorageAdapter {
  save(document: Document): Promise<void>;
  load(id: string): Promise<Document | null>;
  delete(id: string): Promise<void>;
  getAll(): Promise<Document[]>;
}

class StorageStrategyFactory {
  selectStrategy(document: Document): StorageAdapter
}
```

#### 2. `LocalStorageAdapter` (~50 lines)
```typescript
class LocalStorageAdapter implements StorageAdapter {
  // Pure localStorage operations
  // Handle quota errors gracefully
}
```

#### 3. `IndexedDBAdapter` (~40 lines)
```typescript
class IndexedDBAdapter implements StorageAdapter {
  // Wrapper around indexedDBHelper
  // Consistent interface with LocalStorageAdapter
}
```

#### 4. `MetadataManager` (~40 lines)
```typescript
class MetadataManager {
  // Separate metadata tracking
  updateMetadata(doc, storageType, size)
  getMetadata(id)
  removeMetadata(id)
}
```

#### 5. `SettingsManager` (~25 lines)
```typescript
class SettingsManager {
  // Dedicated settings handling
  saveSettings(settings)
  loadSettings()
  getDefaultSettings()
}
```

#### 6. Refactored `StorageManager` (~40 lines)
```typescript
class StorageManager {
  constructor(
    private strategyFactory: StorageStrategyFactory,
    private metadataManager: MetadataManager,
    private settingsManager: SettingsManager
  )
  
  // Orchestrates the adapters
  async saveDocument(document) {
    const strategy = this.strategyFactory.selectStrategy(document);
    await strategy.save(document);
    await this.metadataManager.update(...);
  }
}
```

---

## Implementation Steps

### Phase 1: MinimalEditor Refactoring
1. Create `src/hooks/editor/` directory
2. Extract `useDocumentManager` hook
3. Extract `useAutoSave` hook  
4. Extract `useEditorInitialization` hook
5. Extract `useSidebarState` hook
6. Extract `useDocumentContent` hook
7. Refactor MinimalEditor to use new hooks
8. Test all functionality

### Phase 2: StorageManager Refactoring
1. Create `src/storage/` directory
2. Define `StorageAdapter` interface
3. Implement `LocalStorageAdapter`
4. Implement `IndexedDBAdapter`
5. Create `StorageStrategyFactory`
6. Extract `MetadataManager`
7. Extract `SettingsManager`
8. Refactor StorageManager as orchestrator
9. Update imports throughout codebase
10. Test storage operations

## Expected Results

### MinimalEditor:
- From 224 lines → ~50 lines main component
- 5 new focused hooks (~190 lines total)
- Each hook independently testable
- Clear separation of concerns
- No more useState anti-patterns

### StorageManager:
- From 267 lines monolith → ~40 lines orchestrator
- 5 new focused modules (~160 lines total)
- Strategy pattern for storage selection
- Adapter pattern for storage implementations
- Single responsibility for each class

## Benefits
1. **Maintainability**: Each piece has single responsibility
2. **Testability**: Can mock individual adapters/hooks
3. **Extensibility**: Easy to add new storage types or features
4. **Performance**: More efficient re-renders and operations
5. **Type Safety**: Better TypeScript interfaces

This refactoring follows the same successful patterns from AutocompletePlugin, breaking monolithic code into focused, composable modules.

## Success Metrics
- Line reduction in main files (50%+ target)
- Improved test coverage for individual modules
- Zero breaking changes to existing functionality
- Enhanced developer experience and maintainability