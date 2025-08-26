import { useState, useCallback, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { EditorState, $getRoot } from 'lexical';

import { AutocompleteNode } from '../editor/nodes/AutocompleteNode';
import EditorToolbar from './EditorToolbar';
import EditorWithSync from './EditorWithSync';
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
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

  const handleDeleteDocument = useCallback(async (id: string) => {
    await documentManager.deleteDocument(id);
    
    // If deleted document was current, create new one
    if (currentDocument?.id === id) {
      handleNewDocument();
    }
  }, [currentDocument, handleNewDocument]);

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
                  <EditorWithSync 
                    currentDocument={currentDocument}
                    onContentChange={handleContentChange}
                  />
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