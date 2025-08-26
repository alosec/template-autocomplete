import { Document, DocumentSummary } from '../types/EditorTypes';
import { documentManager } from '../utils/DocumentManager';

interface EditorToolbarProps {
  currentDocument: Document | null;
  isModified: boolean;
  onNewDocument: () => void;
  onSaveDocument: () => void;
  onLoadDocument: (document: Document) => void;
  onDeleteDocument: (id: string) => void;
}

export default function EditorToolbar({
  currentDocument,
  isModified,
  onNewDocument,
  onSaveDocument,
  onLoadDocument,
  onDeleteDocument
}: EditorToolbarProps) {
  const documentSummaries = documentManager.getDocumentSummaries();
  
  const handleLoadDocument = (summary: DocumentSummary) => {
    const document = documentManager.loadDocument(summary.id);
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
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const document = documentManager.importDocument(content);
      if (document) {
        onLoadDocument(document);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="editor-toolbar">
      <div className="toolbar-section">
        <h1 className="editor-title">Minimal Editor</h1>
        {currentDocument && (
          <span className="document-status">
            {currentDocument.title}
            {isModified && <span className="modified-indicator">•</span>}
            <span className="word-count">{currentDocument.wordCount} words</span>
          </span>
        )}
      </div>
      
      <div className="toolbar-actions">
        <button 
          className="toolbar-btn primary"
          onClick={onNewDocument}
          title="New Document"
        >
          New
        </button>
        
        <button 
          className="toolbar-btn"
          onClick={onSaveDocument}
          disabled={!currentDocument || !isModified}
          title="Save Document"
        >
          Save
        </button>
        
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
        
        <button 
          className="toolbar-btn"
          onClick={handleExport}
          disabled={!currentDocument}
          title="Export Document"
        >
          Export
        </button>
        
        <label className="toolbar-btn file-input-label">
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
  );
}