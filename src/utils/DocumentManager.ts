import { Document, DocumentSummary, EditorSettings } from '../types/EditorTypes';

const STORAGE_KEYS = {
  DOCUMENTS: 'minimal-editor-documents',
  SETTINGS: 'minimal-editor-settings',
  CURRENT_DOC: 'minimal-editor-current-doc'
} as const;

class DocumentManager {
  // Document operations
  saveDocument(document: Document): void {
    const documents = this.getAllDocuments();
    const existingIndex = documents.findIndex(d => d.id === document.id);
    
    if (existingIndex >= 0) {
      documents[existingIndex] = document;
    } else {
      documents.push(document);
    }
    
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    localStorage.setItem(STORAGE_KEYS.CURRENT_DOC, document.id);
  }
  
  loadDocument(id: string): Document | null {
    const documents = this.getAllDocuments();
    const document = documents.find(d => d.id === id);
    
    if (document) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_DOC, id);
      return this.deserializeDocument(document);
    }
    
    return null;
  }
  
  getAllDocuments(): Document[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (!stored) return [];
      
      const documents = JSON.parse(stored) as Document[];
      return documents.map(this.deserializeDocument);
    } catch (error) {
      console.warn('Failed to load documents:', error);
      return [];
    }
  }
  
  getDocumentSummaries(): DocumentSummary[] {
    const documents = this.getAllDocuments();
    return documents
      .map(doc => ({
        id: doc.id,
        title: doc.title,
        updatedAt: doc.updatedAt,
        wordCount: doc.wordCount,
        preview: doc.content.substring(0, 100).replace(/\n/g, ' ')
      }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  
  deleteDocument(id: string): void {
    const documents = this.getAllDocuments().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    
    // Clear current doc if it was deleted
    const currentDocId = localStorage.getItem(STORAGE_KEYS.CURRENT_DOC);
    if (currentDocId === id) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_DOC);
    }
  }
  
  getCurrentDocumentId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_DOC);
  }
  
  // Settings operations
  saveSettings(settings: EditorSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
  
  loadSettings(): EditorSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!stored) return this.getDefaultSettings();
      
      return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
    } catch (error) {
      console.warn('Failed to load settings:', error);
      return this.getDefaultSettings();
    }
  }
  
  // Utility methods
  createNewDocument(title = 'Untitled'): Document {
    const now = new Date();
    return {
      id: this.generateId(),
      title,
      content: '',
      createdAt: now,
      updatedAt: now,
      wordCount: 0,
      concepts: []
    };
  }
  
  updateWordCount(document: Document): Document {
    const wordCount = document.content
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
      
    return { ...document, wordCount, updatedAt: new Date() };
  }
  
  exportDocument(document: Document): string {
    const exportData = {
      ...document,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(exportData, null, 2);
  }
  
  importDocument(jsonString: string): Document | null {
    try {
      const data = JSON.parse(jsonString);
      const document: Document = {
        id: this.generateId(), // New ID for imported doc
        title: data.title || 'Imported Document',
        content: data.content || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: 0,
        concepts: data.concepts || []
      };
      return this.updateWordCount(document);
    } catch (error) {
      console.warn('Failed to import document:', error);
      return null;
    }
  }
  
  // Private methods
  private deserializeDocument(doc: any): Document {
    return {
      ...doc,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt)
    };
  }
  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  private getDefaultSettings(): EditorSettings {
    return {
      theme: 'light',
      fontSize: 14,
      lineNumbers: false,
      wordWrap: true,
      autoSave: true
    };
  }
}

export const documentManager = new DocumentManager();