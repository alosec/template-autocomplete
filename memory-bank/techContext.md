# Technical Context

## Technology Stack

### Core Dependencies
- **React 19.0.0**: Latest React with modern hooks and concurrent features
- **TypeScript ~5.7.2**: Strong typing throughout the codebase
- **Lexical 0.24.0**: Facebook's extensible text editor framework
- **Vite 6.1.0**: Fast build tool and dev server

### Development Tools
- **Jest 30.0.5**: Testing framework with jsdom environment
- **React Testing Library 16.3.0**: Component testing utilities
- **Babel**: Transpilation for Jest testing environment
- **ESLint/TypeScript**: Code quality and type checking

### Browser APIs
- **IndexedDB**: Client-side persistent storage for documents
- **File API**: Document import/export functionality
- **DOM Events**: Keyboard navigation and mouse interactions

## Build & Development Environment

### Scripts
```json
{
  "dev": "vite",                    // Development server
  "build": "tsc -b && vite build",  // Type check + production build
  "preview": "vite preview",        // Preview production build
  "test": "jest",                   // Run test suite
  "test:watch": "jest --watch",     // Watch mode testing
  "test:coverage": "jest --coverage" // Coverage reporting
}
```

### Development Server
- **Hot Module Replacement**: Real-time updates during development
- **TypeScript Integration**: Live type checking
- **Port Management**: Auto-increments ports (5173+ when occupied)

## Lexical Integration Details

### Custom Nodes
```typescript
AutocompleteNode extends TextNode {
  - Non-editable text representation
  - Custom styling (blue background)
  - Single backspace deletion
  - Serialization support
}
```

### Plugin Architecture
```typescript
AutocompletePlugin {
  - Trigger detection: `<>` character sequence
  - Suggestion filtering and display
  - Keyboard navigation (arrows, enter, escape)
  - Mouse selection support
  - Node replacement logic
}

DocumentSyncPlugin {
  - Editor state persistence
  - Document loading from storage
  - Content synchronization
}
```

### Editor Configuration
```typescript
LexicalComposer {
  namespace: 'MinimalEditor'
  nodes: [AutocompleteNode]
  theme: { paragraph: 'editor-paragraph' }
  onError: Standard error handling
}
```

## Storage Implementation

### IndexedDB Schema
```typescript
Database: 'DocumentEditor' (version 1)
ObjectStore: 'documents'
- keyPath: 'id'
- Indexes: createdAt, updatedAt for sorting
```

### Data Persistence Layers
1. **IndexedDBHelper**: Low-level database operations
2. **StorageManager**: Business logic abstraction  
3. **DocumentManager**: High-level document operations

### Error Handling
- Database connection failures
- Storage quota exceeded scenarios
- Corrupted document recovery
- Import/export validation

## Testing Infrastructure

### Jest Configuration
```javascript
{
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: CSS module mocking,
  transform: Babel for TS/React files
}
```

### Testing Utilities
- **@testing-library/react**: Component rendering and queries
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Extended DOM matchers
- **Custom Lexical Utilities**: Editor state testing helpers

### Coverage Requirements
- All critical paths tested
- Edge cases and error scenarios covered
- Plugin behavior verification
- Storage operation validation

## Performance Characteristics

### Bundle Size
- Main bundle: Optimized with Vite tree-shaking
- Lexical: ~200KB framework overhead
- React 19: Modern concurrent features
- TypeScript: Compile-time only (no runtime cost)

### Runtime Performance
- **Autocomplete**: <100ms suggestion updates
- **Auto-save**: 2-second debounce for optimal UX
- **Sidebar Resize**: 60fps smooth drag operations
- **Document Loading**: <500ms for typical documents

### Memory Usage
- **Lexical State**: Minimal editor state retention
- **Document Cache**: Single active document in memory
- **Event Listeners**: Proper cleanup on unmount
- **IndexedDB**: Efficient key-value storage access

## Browser Compatibility
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **ES2020 Features**: Native async/await, optional chaining
- **IndexedDB Support**: Universal modern browser support
- **File API**: Drag-drop and file input compatibility