import { Document, DocumentSummary, EditorSettings } from '../types/EditorTypes';
import { storageManager } from './StorageManager';

class DocumentManager {
  // Document operations
  async saveDocument(document: Document): Promise<void> {
    return await storageManager.saveDocument(document);
  }
  
  async loadDocument(id: string): Promise<Document | null> {
    return await storageManager.loadDocument(id);
  }
  
  async getAllDocuments(): Promise<Document[]> {
    return await storageManager.getAllDocuments();
  }
  
  async getDocumentSummaries(): Promise<DocumentSummary[]> {
    const documents = await this.getAllDocuments();
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
  
  async deleteDocument(id: string): Promise<void> {
    return await storageManager.deleteDocument(id);
  }
  
  getCurrentDocumentId(): string | null {
    return storageManager.getCurrentDocumentId();
  }
  
  // Settings operations
  saveSettings(settings: EditorSettings): void {
    storageManager.saveSettings(settings);
  }
  
  loadSettings(): EditorSettings {
    return storageManager.loadSettings();
  }
  
  // Utility methods
  createNewDocument(title = 'Untitled'): Document {
    const now = new Date();
    return {
      id: this.generateId(),
      title,
      content: '',
      editorState: undefined,
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
        editorState: data.editorState || undefined,
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

  createDocumentFromGlobalBrainItem(item: any): Document {
    const content = `${item.text}

${item.description}

${item.tags ? item.tags.map((tag: string) => `#${tag}`).join(' ') : ''}`;

    const document: Document = {
      id: this.generateId(),
      title: item.text,
      content: content.trim(),
      editorState: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 0,
      concepts: item.tags || []
    };
    return this.updateWordCount(document);
  }
  
  // Private methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
}

export const documentManager = new DocumentManager();