import { Document, DocumentSummary } from '../types/EditorTypes';
import { documentManager } from '../utils/DocumentManager';
import { useState, useEffect, useRef } from 'react';
import { LexicalEditor } from 'lexical';
import { HIDE_AUTOCOMPLETE_COMMAND } from '../editor/commands/autocompleteCommands';
import SubmitIdeaButton from './SubmitIdeaButton';

interface EditorToolbarProps {
  currentDocument: Document | null;
  isModified: boolean;
  onNewDocument: () => void;
  onSaveDocument: () => void;
  onLoadDocument: (document: Document) => void;
  onToggleBrainPanel: () => void;
  brainPanelVisible: boolean;
  editorRef?: React.MutableRefObject<LexicalEditor | null>;
  onRandomIdea: () => void;
  threadContext?: { parentId?: string; threadRootId?: string };
}

export default function EditorToolbar({
  currentDocument,
  isModified,
  onNewDocument,
  onSaveDocument,
  onLoadDocument,
  onToggleBrainPanel,
  brainPanelVisible,
  editorRef,
  onRandomIdea,
  threadContext
}: EditorToolbarProps) {
  const [documentSummaries, setDocumentSummaries] = useState<DocumentSummary[]>([]);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [recentMenuOpen, setRecentMenuOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Load document summaries
  useEffect(() => {
    const loadSummaries = async () => {
      const summaries = await documentManager.getDocumentSummaries();
      setDocumentSummaries(summaries);
    };
    loadSummaries();
  }, [currentDocument]);
  
  const handleLoadDocument = async (summary: DocumentSummary) => {
    const document = await documentManager.loadDocument(summary.id);
    if (document) {
      onLoadDocument(document);
    }
  };

  const handleExport = () => {
    if (!currentDocument) return;
    
    const exportData = documentManager.exportDocument(currentDocument);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDocument.title}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Clear previous feedback
    setImportFeedback(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const document = documentManager.importDocument(content);
        if (document) {
          // Save the imported document so it appears in the recent menu
          await documentManager.saveDocument(document);
          onLoadDocument(document);
          
          // Refresh document summaries
          const summaries = await documentManager.getDocumentSummaries();
          setDocumentSummaries(summaries);
          setImportFeedback({ type: 'success', message: `Imported "${document.title}" successfully` });
          
          // Clear success feedback after 3 seconds
          setTimeout(() => setImportFeedback(null), 3000);
        } else {
          setImportFeedback({ type: 'error', message: 'Failed to import document - invalid format' });
        }
      } catch (error) {
        setImportFeedback({ type: 'error', message: 'Failed to import document - file could not be read' });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setFileMenuOpen(false);
        setRecentMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFileMenu = () => {
    setFileMenuOpen(!fileMenuOpen);
    setRecentMenuOpen(false);
  };

  const toggleRecentMenu = () => {
    setRecentMenuOpen(!recentMenuOpen);
    setFileMenuOpen(false);
  };

  const closeMenus = () => {
    setFileMenuOpen(false);
    setRecentMenuOpen(false);
  };

  const handleToolbarMouseDown = () => {
    // Close autocomplete when clicking anywhere in toolbar
    if (editorRef?.current) {
      editorRef.current.dispatchCommand(HIDE_AUTOCOMPLETE_COMMAND, undefined);
    }
  };

  const handleRandomIdea = () => {
    onRandomIdea();
  };

  return (
    <div className="editor-toolbar" ref={toolbarRef} onMouseDown={handleToolbarMouseDown}>
      <div className="toolbar-left">
        
        <div className="toolbar-dropdown">
          <button className="toolbar-btn dropdown-toggle" onClick={toggleFileMenu}>
            File ▾
          </button>
          <div className={`dropdown-content file-menu ${fileMenuOpen ? 'show' : ''}`}>
            <button onClick={() => { onNewDocument(); closeMenus(); }}>New</button>
            <button onClick={() => { onSaveDocument(); closeMenus(); }} disabled={!currentDocument || !isModified}>
              Save
            </button>
            <button onClick={() => { handleExport(); closeMenus(); }} disabled={!currentDocument}>
              Export
            </button>
            <label className="file-input-label" onClick={closeMenus}>
              Import
              <input 
                type="file" 
                accept=".json"
                onChange={(e) => { handleImport(e); closeMenus(); }}
                className="file-input"
              />
            </label>
          </div>
        </div>


        <div className="toolbar-dropdown">
          <button className="toolbar-btn dropdown-toggle" onClick={toggleRecentMenu}>
            Recent ▾
          </button>
          <div className={`dropdown-content ${recentMenuOpen ? 'show' : ''}`}>
            {documentSummaries.length > 0 ? (
              documentSummaries.slice(0, 10).map(summary => (
                <div key={summary.id} className="document-item">
                  <button 
                    className="document-load-btn"
                    onClick={() => { handleLoadDocument(summary); closeMenus(); }}
                    title={summary.preview}
                  >
                    <div className="document-title">{summary.title}</div>
                    <div className="document-meta">
                      {summary.wordCount} words • {summary.updatedAt.toLocaleDateString()}
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">No documents yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="toolbar-right">
        <button 
          className="random-idea-btn compact"
          onClick={handleRandomIdea}
          title="Insert a random idea from the global brain"
        >
          <span className="btn-icon">💡</span>
          <span className="btn-text">Random</span>
        </button>
        <SubmitIdeaButton 
          className="compact"
          prePopulatedContent={currentDocument?.content || ''}
          threadContext={threadContext}
          onSubmissionSuccess={() => {
            // Optional: could trigger a global brain sync here
            console.log('Idea submitted successfully!');
          }}
        />
        <button 
          className="brain-toggle-btn compact"
          onClick={onToggleBrainPanel}
          title={brainPanelVisible ? 'Hide brain panel' : 'Show brain panel'}
        >
          <span className="btn-icon">🧠</span>
          <span className="btn-text">Brain</span>
        </button>
      </div>
      
      {importFeedback && (
        <div className={`import-feedback ${importFeedback.type}`}>
          {importFeedback.message}
        </div>
      )}
    </div>
  );
}