# Minimal Text Editor - Project Brief

## Core Mission
A Lexical-based text editor with intelligent autocomplete functionality, originally built as a technical assessment for Ideaflow. Now evolved into a comprehensive document management system with global brain integration.

## Primary Goals

### Original Requirements (Completed)
- ✅ Text editor using Lexical with full editing capabilities
- ✅ Autocomplete triggered by `<>` characters
- ✅ Dynamic suggestion filtering and keyboard navigation
- ✅ Non-editable autocompleted entries with distinct styling
- ✅ Complete keyboard and mouse interaction support

### Extended Functionality (Completed)
- ✅ Document persistence via IndexedDB
- ✅ Import/export functionality (JSON format)
- ✅ Document management with recent files menu
- ✅ Auto-save with visual indicators
- ✅ Global Brain sidebar with resizable interface
- ✅ Document loading from Global Brain items
- ✅ Comprehensive test coverage (100% pass rate)

## Current Scope

### Phase 1: Foundation (Complete)
Basic text editor with autocomplete functionality meeting all original requirements.

### Phase 2: Document System (Complete) 
Full document lifecycle management with persistence and import/export capabilities.

### Phase 3: Global Brain Integration (Complete)
Resizable sidebar with global brain content that can be loaded as full documents.

### Phase 4: Enhancement (In Progress)
- Expand Global Brain dataset with meaningful content
- Connect autocomplete to Global Brain metadata
- Polish UI/UX and styling
- Finalize feature set

## Technical Constraints
- React 19 + TypeScript
- Lexical 0.24.0 as core editor
- Vite for build system
- Jest for testing
- IndexedDB for client-side persistence
- No external Lexical plugins (custom implementation required)

## Success Criteria
1. Fully functional autocomplete system with custom Lexical nodes
2. Robust document management with persistence
3. Intuitive UI matching modern editor expectations
4. Comprehensive test coverage
5. Clean, maintainable codebase architecture
6. Global Brain integration providing meaningful content discovery