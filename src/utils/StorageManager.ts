import { Document, EditorSettings } from '../types/EditorTypes';
import { indexedDBHelper } from './IndexedDBHelper';

const STORAGE_KEYS = {
  DOCUMENTS: 'minimal-editor-documents',
  SETTINGS: 'minimal-editor-settings',
  CURRENT_DOC: 'minimal-editor-current-doc',
  METADATA: 'minimal-editor-metadata'
} as const;

const LARGE_DOCUMENT_THRESHOLD = 1024 * 1024; // 1MB

interface DocumentMetadata {
  id: string;
  title: string;
  updatedAt: string;
  wordCount: number;
  preview: string;
  storageType: 'localStorage' | 'indexedDB';
  size: number;
}

export class StorageManager {
  private getDocumentSize(document: Document): number {
    return JSON.stringify(document).length;
  }


  async saveDocument(document: Document): Promise<void> {
    const size = this.getDocumentSize(document);
    const isLarge = size > LARGE_DOCUMENT_THRESHOLD;
    
    try {
      if (isLarge) {
        // Save to IndexedDB for large documents
        await indexedDBHelper.saveDocument(document);
        await this.updateMetadata(document, 'indexedDB', size);
      } else {
        // Save to localStorage for small documents
        const documents = this.getLocalStorageDocuments();
        const existingIndex = documents.findIndex(d => d.id === document.id);
        
        if (existingIndex >= 0) {
          documents[existingIndex] = document;
        } else {
          documents.push(document);
        }
        
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
        await this.updateMetadata(document, 'localStorage', size);
      }
      
      localStorage.setItem(STORAGE_KEYS.CURRENT_DOC, document.id);
    } catch (error) {
      // If saving fails (e.g., localStorage quota exceeded), try IndexedDB as fallback
      if (!isLarge) {
        console.warn('localStorage save failed, falling back to IndexedDB:', error);
        await indexedDBHelper.saveDocument(document);
        await this.updateMetadata(document, 'indexedDB', size);
        localStorage.setItem(STORAGE_KEYS.CURRENT_DOC, document.id);
      } else {
        throw error;
      }
    }
  }

  async loadDocument(id: string): Promise<Document | null> {
    const metadata = await this.getDocumentMetadata(id);
    
    if (!metadata) {
      return null;
    }

    try {
      if (metadata.storageType === 'indexedDB') {
        const document = await indexedDBHelper.loadDocument(id);
        if (document) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_DOC, id);
        }
        return document;
      } else {
        const documents = this.getLocalStorageDocuments();
        const document = documents.find(d => d.id === id);
        if (document) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_DOC, id);
          return this.deserializeDocument(document);
        }
      }
    } catch (error) {
      console.warn('Failed to load document:', error);
    }

    return null;
  }

  async getAllDocuments(): Promise<Document[]> {
    const allDocuments: Document[] = [];
    
    try {
      // Get localStorage documents
      const localDocs = this.getLocalStorageDocuments().map(this.deserializeDocument);
      allDocuments.push(...localDocs);
      
      // Get IndexedDB documents
      const indexedDocs = await indexedDBHelper.getAllDocuments();
      allDocuments.push(...indexedDocs);
    } catch (error) {
      console.warn('Failed to load some documents:', error);
    }

    // Remove duplicates (prefer IndexedDB version if both exist)
    const uniqueDocs = new Map<string, Document>();
    allDocuments.forEach(doc => {
      uniqueDocs.set(doc.id, doc);
    });

    return Array.from(uniqueDocs.values());
  }

  async deleteDocument(id: string): Promise<void> {
    const metadata = await this.getDocumentMetadata(id);
    
    if (metadata?.storageType === 'indexedDB') {
      await indexedDBHelper.deleteDocument(id);
    } else {
      const documents = this.getLocalStorageDocuments().filter(d => d.id !== id);
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    }

    // Remove from metadata
    await this.removeFromMetadata(id);
    
    // Clear current doc if it was deleted
    const currentDocId = localStorage.getItem(STORAGE_KEYS.CURRENT_DOC);
    if (currentDocId === id) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_DOC);
    }
  }

  getCurrentDocumentId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_DOC);
  }

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

  private getLocalStorageDocuments(): Document[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (!stored) return [];
      
      return JSON.parse(stored) as Document[];
    } catch (error) {
      console.warn('Failed to load localStorage documents:', error);
      return [];
    }
  }

  private async updateMetadata(document: Document, storageType: 'localStorage' | 'indexedDB', size: number): Promise<void> {
    try {
      const metadata = this.getMetadata();
      const documentMetadata: DocumentMetadata = {
        id: document.id,
        title: document.title,
        updatedAt: document.updatedAt.toISOString(),
        wordCount: document.wordCount,
        preview: document.content.substring(0, 100).replace(/\n/g, ' '),
        storageType,
        size
      };

      const existingIndex = metadata.findIndex(m => m.id === document.id);
      if (existingIndex >= 0) {
        metadata[existingIndex] = documentMetadata;
      } else {
        metadata.push(documentMetadata);
      }

      localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to update metadata:', error);
    }
  }

  private async getDocumentMetadata(id: string): Promise<DocumentMetadata | null> {
    const metadata = this.getMetadata();
    return metadata.find(m => m.id === id) || null;
  }

  private async removeFromMetadata(id: string): Promise<void> {
    try {
      const metadata = this.getMetadata().filter(m => m.id !== id);
      localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to remove from metadata:', error);
    }
  }

  private getMetadata(): DocumentMetadata[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.METADATA);
      if (!stored) return [];
      
      return JSON.parse(stored) as DocumentMetadata[];
    } catch (error) {
      console.warn('Failed to load metadata:', error);
      return [];
    }
  }

  private deserializeDocument(doc: any): Document {
    return {
      ...doc,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt)
    };
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

  async getStorageInfo(): Promise<{ localStorage: number; indexedDB: number; total: number }> {
    const indexedDBSize = await indexedDBHelper.getStorageSize();
    
    // Estimate localStorage usage
    let localStorageSize = 0;
    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      console.warn('Could not calculate localStorage size:', error);
    }

    return {
      localStorage: localStorageSize,
      indexedDB: indexedDBSize,
      total: localStorageSize + indexedDBSize
    };
  }
}

export const storageManager = new StorageManager();