import { Document, DocumentSummary } from '../types/EditorTypes';
import { documentManager } from '../utils/DocumentManager';
import { useState, useEffect } from 'react';

interface EditorToolbarProps {
  currentDocument: Document | null;
  isModified: boolean;
  onNewDocument: () => void;
  onSaveDocument: () => void;
  onLoadDocument: (document: Document) => void;
  onDeleteDocument: (id: string) => void;
  onToggleSidebar: () => void;
  sidebarVisible: boolean;
}

export default function EditorToolbar({
  currentDocument,
  isModified,
  onNewDocument,
  onSaveDocument,
  onLoadDocument,
  onDeleteDocument,
  onToggleSidebar,
  sidebarVisible
}: EditorToolbarProps) {
  const [documentSummaries, setDocumentSummaries] = useState<DocumentSummary[]>([]);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
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

  return (
    <div className="editor-toolbar">
      <div className="toolbar-left">
        <div className="toolbar-dropdown">
          <button className="toolbar-btn dropdown-toggle">
            File ▾
          </button>
          <div className="dropdown-content file-menu">
            <button onClick={onNewDocument}>New</button>
            <button onClick={onSaveDocument} disabled={!currentDocument || !isModified}>
              Save
            </button>
            <button onClick={handleExport} disabled={!currentDocument}>
              Export
            </button>
            <label className="file-input-label">
              Import
              <input 
                type="file" 
                accept=".json"
                onChange={handleImport}
                className="file-input"
              />
            </label>
          </div>
        </div>

        <div className="toolbar-dropdown">
          <button className="toolbar-btn dropdown-toggle">
            View ▾
          </button>
          <div className="dropdown-content">
            <button 
              className={sidebarVisible ? 'active' : ''}
              onClick={onToggleSidebar}
            >
              🧠 Global Brain Sidebar
            </button>
          </div>
        </div>

        <div className="toolbar-dropdown">
          <button className="toolbar-btn dropdown-toggle">
            Recent ▾
          </button>
          <div className="dropdown-content">
            {documentSummaries.length > 0 ? (
              documentSummaries.slice(0, 10).map(summary => (
                <div key={summary.id} className="document-item">
                  <button 
                    className="document-load-btn"
                    onClick={() => handleLoadDocument(summary)}
                    title={summary.preview}
                  >
                    <div className="document-title">{summary.title}</div>
                    <div className="document-meta">
                      {summary.wordCount} words • {summary.updatedAt.toLocaleDateString()}
                    </div>
                  </button>
                  <button 
                    className="document-delete-btn"
                    onClick={() => onDeleteDocument(summary.id)}
                    title="Delete"
                  >
                    ×
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
        <h1 className="editor-title">Autocompleter</h1>
      </div>
      
      {importFeedback && (
        <div className={`import-feedback ${importFeedback.type}`}>
          {importFeedback.message}
        </div>
      )}
    </div>
  );
}