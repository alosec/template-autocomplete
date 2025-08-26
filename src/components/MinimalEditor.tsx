import { useState, useCallback, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { EditorState } from 'lexical';

import { AutocompleteNode } from '../editor/nodes/AutocompleteNode';
import AutocompletePlugin from '../editor/plugins/AutocompletePlugin';
import EditorToolbar from './EditorToolbar';
import GlobalBrainSidebar from './GlobalBrainSidebar';
import { Document } from '../types/EditorTypes';
import { documentManager } from '../utils/DocumentManager';

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
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const handleNewDocument = useCallback(() => {
    const newDoc = documentManager.createNewDocument();
    setCurrentDocument(newDoc);
    setIsModified(false);
  }, []);

  // Load initial document or create new one
  const initializeEditor = useCallback(() => {
    const currentDocId = documentManager.getCurrentDocumentId();
    if (currentDocId) {
      const doc = documentManager.loadDocument(currentDocId);
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
  });

  const handleSaveDocument = useCallback(() => {
    if (!currentDocument) return;
    
    const updatedDoc = documentManager.updateWordCount(currentDocument);
    documentManager.saveDocument(updatedDoc);
    setCurrentDocument(updatedDoc);
    setIsModified(false);
  }, [currentDocument]);

  const handleLoadDocument = useCallback((document: Document) => {
    setCurrentDocument(document);
    setIsModified(false);
  }, []);

  const handleDeleteDocument = useCallback((id: string) => {
    documentManager.deleteDocument(id);
    
    // If deleted document was current, create new one
    if (currentDocument?.id === id) {
      handleNewDocument();
    }
  }, [currentDocument, handleNewDocument]);

  const handleContentChange = useCallback((editorState: EditorState) => {
    const textContent = editorState.read(() => {
      return editorState.getRoot().getTextContent();
    });
    
    if (!currentDocument) return;
    
    const updatedDoc = {
      ...currentDocument,
      content: textContent,
      updatedAt: new Date()
    };
    
    setCurrentDocument(updatedDoc);
    setIsModified(true);
    
    // Auto-save with debounce
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      const finalDoc = documentManager.updateWordCount(updatedDoc);
      documentManager.saveDocument(finalDoc);
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

  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev);
  }, []);


  return (
    <div className={`minimal-editor ${sidebarVisible ? 'sidebar-open' : ''}`}>
      <EditorToolbar
        currentDocument={currentDocument}
        isModified={isModified}
        onNewDocument={handleNewDocument}
        onSaveDocument={handleSaveDocument}
        onLoadDocument={handleLoadDocument}
        onDeleteDocument={handleDeleteDocument}
        onToggleSidebar={toggleSidebar}
        sidebarVisible={sidebarVisible}
      />
      
      <div className="editor-main">
        {currentDocument && (
          <div className="document-header">
            <input
              type="text"
              value={currentDocument.title}
              onChange={handleTitleChange}
              className="document-title-input"
              placeholder="Document title..."
            />
          </div>
        )}
        
        <div className="editor-content">
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
                  <PlainTextPlugin
                    contentEditable={
                      <ContentEditable
                        className="editor-input"
                        placeholder="Start writing..."
                      />
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />
                  <OnChangePlugin onChange={handleContentChange} />
                  <HistoryPlugin />
                  <AutocompletePlugin />
                </div>
              </div>
            </LexicalComposer>
          )}
        </div>
      </div>
      
      <GlobalBrainSidebar 
        isVisible={sidebarVisible}
        onToggle={toggleSidebar}
      />
      
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