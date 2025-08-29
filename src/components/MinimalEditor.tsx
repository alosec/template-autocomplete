import { useState, useCallback, useRef, useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { EditorState, $getRoot, LexicalEditor } from 'lexical';

import { AutocompleteNode } from '../editor/nodes/AutocompleteNode';
import { HIDE_AUTOCOMPLETE_COMMAND } from '../editor/commands/autocompleteCommands';
import { loadContentWithAutocompleteNodes } from '../editor/utils/autocompleteUtils';
import EditorToolbar from './EditorToolbar';
import EditorWithSync from './EditorWithSync';
import TopBrainPanel from './TopBrainPanel';
import ThreadDisplay from './ThreadDisplay';
import { Document, Thread, ThreadPost } from '../types/EditorTypes';
import { documentManager } from '../utils/DocumentManager';
import { NavigationHistory, getNextIntelligentIndex } from '../utils/brainNavigation';
import { useGlobalBrain } from '../hooks/useGlobalBrain';

const editorConfig = {
  namespace: 'MinimalEditor',
  nodes: [AutocompleteNode],
  onError(error: Error) {
    throw error;
  },
  theme: {
    paragraph: 'editor-paragraph',
  },
};

export default function MinimalEditor() {
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [brainPanelVisible, setBrainPanelVisible] = useState(false);
  const [brainPanelHeight, setBrainPanelHeight] = useState(400);
  const [currentThread] = useState<Thread | null>(null);
  const [threadContext, setThreadContext] = useState<{ parentId?: string; threadRootId?: string } | undefined>(undefined);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const editorRef = useRef<LexicalEditor | null>(null);

  // Shared brain navigation state
  const { suggestions } = useGlobalBrain();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [seenIndices, setSeenIndices] = useState<Set<number>>(new Set());
  const navigationHistory = useRef(new NavigationHistory());

  const handleNewDocument = useCallback(() => {
    const newDoc = documentManager.createNewDocument();
    setCurrentDocument(newDoc);
    setIsModified(false);
  }, []);

  // Load initial document or create new one
  const initializeEditor = useCallback(async () => {
    const currentDocId = documentManager.getCurrentDocumentId();
    if (currentDocId) {
      const doc = await documentManager.loadDocument(currentDocId);
      if (doc) {
        setCurrentDocument(doc);
        return;
      }
    }
    
    // Create new document if none exists
    handleNewDocument();
  }, [handleNewDocument]);

  // Initialize on first render
  useState(() => {
    initializeEditor();
    return undefined;
  });

  const handleSaveDocument = useCallback(async () => {
    if (!currentDocument) return;
    
    const updatedDoc = documentManager.updateWordCount(currentDocument);
    await documentManager.saveDocument(updatedDoc);
    setCurrentDocument(updatedDoc);
    setIsModified(false);
  }, [currentDocument]);

  const handleLoadDocument = useCallback((document: Document) => {
    setCurrentDocument(document);
    setIsModified(false);
  }, []);


  const handleContentChange = useCallback((editorState: EditorState) => {
    const textContent = editorState.read(() => {
      const root = $getRoot();
      return root.getTextContent();
    });
    
    if (!currentDocument) return;
    
    // Save both plain text content and rich editor state
    const editorStateJSON = JSON.stringify(editorState.toJSON());
    
    const updatedDoc = {
      ...currentDocument,
      content: textContent,
      editorState: editorStateJSON,
      updatedAt: new Date()
    };
    
    setCurrentDocument(updatedDoc);
    setIsModified(true);
    
    // Auto-save with debounce
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      const finalDoc = documentManager.updateWordCount(updatedDoc);
      await documentManager.saveDocument(finalDoc);
      setCurrentDocument(finalDoc);
      setIsModified(false);
    }, 2000); // Auto-save after 2 seconds of inactivity
  }, [currentDocument]);

  const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentDocument) return;
    
    const updatedDoc = {
      ...currentDocument,
      title: event.target.value,
      updatedAt: new Date()
    };
    
    setCurrentDocument(updatedDoc);
    setIsModified(true);
  }, [currentDocument]);

  const handleTitleFocus = useCallback(() => {
    // Close autocomplete when focusing on title
    if (editorRef.current) {
      editorRef.current.dispatchCommand(HIDE_AUTOCOMPLETE_COMMAND, undefined);
    }
  }, []);


  const toggleBrainPanel = useCallback(() => {
    setBrainPanelVisible(prev => !prev);
  }, []);

  const handleBrainPanelHeightChange = useCallback((height: number) => {
    setBrainPanelHeight(height);
  }, []);

  // Initialize brain navigation with first item when data loads
  useMemo(() => {
    if (suggestions.length > 0 && navigationHistory.current.size() === 0) {
      const initialIndex = getNextIntelligentIndex(suggestions, new Set(), -1);
      setCurrentItemIndex(initialIndex);
      navigationHistory.current.addToHistory(initialIndex);
      setSeenIndices(new Set([initialIndex]));
    }
  }, [suggestions]);

  // Shared brain navigation handlers
  const handleNextIdea = useCallback(() => {
    if (suggestions.length === 0) return;
    
    const nextIndex = getNextIntelligentIndex(suggestions, seenIndices, currentItemIndex);
    setCurrentItemIndex(nextIndex);
    navigationHistory.current.addToHistory(nextIndex);
    setSeenIndices(prev => new Set([...prev, nextIndex]));
    return nextIndex;
  }, [suggestions, seenIndices, currentItemIndex]);

  const handleBackIdea = useCallback(() => {
    const backIndex = navigationHistory.current.goBack();
    if (backIndex !== null) {
      setCurrentItemIndex(backIndex);
      return backIndex;
    }
    return null;
  }, []);

  const handleForwardIdea = useCallback(() => {
    const forwardIndex = navigationHistory.current.goForward();
    if (forwardIndex !== null) {
      setCurrentItemIndex(forwardIndex);
      return forwardIndex;
    }
    return null;
  }, []);

  const handleLoadGlobalBrainItem = useCallback(async (item: any) => {
    if (!editorRef.current || !currentDocument) return;
    
    // Use the working editor command pattern to load content with autocomplete nodes
    editorRef.current.update(() => {
      loadContentWithAutocompleteNodes(item.text, item.description, item.tags);
    });
    
    // Update document title and metadata
    const updatedDoc = {
      ...currentDocument,
      title: item.text,
      updatedAt: new Date()
    };
    
    setCurrentDocument(updatedDoc);
    setIsModified(true);
  }, [currentDocument]);

  // Random button loads idea into editor and syncs with brain panel state
  const handleRandomIdea = useCallback(async () => {
    const nextIndex = handleNextIdea();
    if (nextIndex !== undefined && suggestions[nextIndex]) {
      await handleLoadGlobalBrainItem(suggestions[nextIndex]);
    }
    // Brain panel stays in its current state - no automatic opening
  }, [handleNextIdea, suggestions, handleLoadGlobalBrainItem]);

  // Brain panel navigation handlers - only navigate, don't load items
  const handleBrainPanelNext = useCallback(() => {
    handleNextIdea();
  }, [handleNextIdea]);

  const handleBrainPanelBack = useCallback(() => {
    handleBackIdea();
  }, [handleBackIdea]);

  const handleBrainPanelForward = useCallback(() => {
    handleForwardIdea();
  }, [handleForwardIdea]);

  const handleSelectIdea = useCallback((idea: any) => {
    // Find the index of the selected idea in suggestions
    const ideaIndex = suggestions.findIndex(suggestion => 
      suggestion.text === idea.text && suggestion.description === idea.description
    );
    
    if (ideaIndex !== -1) {
      setCurrentItemIndex(ideaIndex);
      navigationHistory.current.addToHistory(ideaIndex);
      setSeenIndices(prev => new Set([...prev, ideaIndex]));
    }
  }, [suggestions]);

  const handleReplyToPost = useCallback((post: ThreadPost) => {
    setThreadContext({
      parentId: post.id,
      threadRootId: post.threadRootId || post.id,
    });
  }, []);


  return (
    <div className="minimal-editor">
      <EditorToolbar
        currentDocument={currentDocument}
        isModified={isModified}
        onNewDocument={handleNewDocument}
        onSaveDocument={handleSaveDocument}
        onLoadDocument={handleLoadDocument}
        onToggleBrainPanel={toggleBrainPanel}
        brainPanelVisible={brainPanelVisible}
        editorRef={editorRef}
        onRandomIdea={handleRandomIdea}
        threadContext={threadContext}
      />
      
      <TopBrainPanel 
        isVisible={brainPanelVisible}
        height={brainPanelHeight}
        onHeightChange={handleBrainPanelHeightChange}
        onPanelClose={() => setBrainPanelVisible(false)}
        editorRef={editorRef}
        currentIdea={suggestions[currentItemIndex]}
        canGoBack={navigationHistory.current.canGoBack()}
        canGoForward={navigationHistory.current.canGoForward()}
        onNextIdea={handleBrainPanelNext}
        onBackIdea={handleBrainPanelBack}
        onForwardIdea={handleBrainPanelForward}
        onLoadCurrentIdea={() => suggestions[currentItemIndex] && handleLoadGlobalBrainItem(suggestions[currentItemIndex])}
        onSelectIdea={handleSelectIdea}
      />
      
      <div className="editor-main">
        {currentDocument && (
          <div className="document-header">
            <input
              type="text"
              value={currentDocument.title}
              onChange={handleTitleChange}
              onFocus={handleTitleFocus}
              className="document-title-input"
              placeholder="Document title..."
            />
          </div>
        )}
        
        <div className="editor-content">
          {currentThread && (
            <ThreadDisplay 
              thread={currentThread}
              onReplyToPost={handleReplyToPost}
              className="editor-thread"
            />
          )}
          
          {currentDocument && (
            <LexicalComposer 
              key={currentDocument.id}
              initialConfig={{
                ...editorConfig,
                editorState: null
              }}
            >
              <div className="editor-container">
                <div className="editor-inner">
                  <EditorWithSync 
                    currentDocument={currentDocument}
                    onContentChange={handleContentChange}
                    editorRef={editorRef}
                  />
                </div>
              </div>
            </LexicalComposer>
          )}
        </div>
      </div>
      
      <div className="editor-status">
        <div className="status-left">
          {currentDocument && (
            <>
              <span>Words: {currentDocument.wordCount}</span>
              <span>•</span>
              <span>Updated: {currentDocument.updatedAt.toLocaleTimeString()}</span>
            </>
          )}
        </div>
        <div className="status-right">
          {isModified && <span className="auto-save-indicator">Auto-saving...</span>}
        </div>
      </div>
    </div>
  );
}