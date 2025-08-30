import { Document } from '../types/EditorTypes';
import { CommunityIdea } from '../types/GlobalBrainTypes';

const DB_NAME = 'MinimalEditorDB';
const DB_VERSION = 2;
const DOCUMENTS_STORE = 'documents';
const GLOBAL_BRAIN_STORE = 'globalBrainIdeas';

export class IndexedDBHelper {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create documents store if it doesn't exist
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const store = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        
        // Create global brain ideas store if it doesn't exist
        if (!db.objectStoreNames.contains(GLOBAL_BRAIN_STORE)) {
          const store = db.createObjectStore(GLOBAL_BRAIN_STORE, { keyPath: 'id' });
          store.createIndex('submittedAt', 'submittedAt', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  async saveDocument(document: Document): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite');
    const store = transaction.objectStore(DOCUMENTS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.put({
        ...document,
        // Serialize dates for IndexedDB
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadDocument(id: string): Promise<Document | null> {
    const db = await this.initDB();
    const transaction = db.transaction([DOCUMENTS_STORE], 'readonly');
    const store = transaction.objectStore(DOCUMENTS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Deserialize dates from IndexedDB
          resolve({
            ...result,
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt)
          });
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDocuments(): Promise<Document[]> {
    const db = await this.initDB();
    const transaction = db.transaction([DOCUMENTS_STORE], 'readonly');
    const store = transaction.objectStore(DOCUMENTS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const results = request.result.map((doc: any) => ({
          ...doc,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt)
        }));
        resolve(results);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite');
    const store = transaction.objectStore(DOCUMENTS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageSize(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
    } catch (error) {
      console.warn('Could not estimate storage usage:', error);
    }
    return 0;
  }

  // Global Brain Ideas methods
  async saveGlobalBrainIdea(idea: CommunityIdea): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([GLOBAL_BRAIN_STORE], 'readwrite');
    const store = transaction.objectStore(GLOBAL_BRAIN_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.put(idea);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllGlobalBrainIdeas(): Promise<CommunityIdea[]> {
    const db = await this.initDB();
    const transaction = db.transaction([GLOBAL_BRAIN_STORE], 'readonly');
    const store = transaction.objectStore(GLOBAL_BRAIN_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getGlobalBrainIdea(id: string): Promise<CommunityIdea | null> {
    const db = await this.initDB();
    const transaction = db.transaction([GLOBAL_BRAIN_STORE], 'readonly');
    const store = transaction.objectStore(GLOBAL_BRAIN_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async searchGlobalBrainIdeasByTag(tag: string): Promise<CommunityIdea[]> {
    const db = await this.initDB();
    const transaction = db.transaction([GLOBAL_BRAIN_STORE], 'readonly');
    const store = transaction.objectStore(GLOBAL_BRAIN_STORE);
    const index = store.index('tags');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(tag);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async searchGlobalBrainIdeasByType(type: string): Promise<CommunityIdea[]> {
    const db = await this.initDB();
    const transaction = db.transaction([GLOBAL_BRAIN_STORE], 'readonly');
    const store = transaction.objectStore(GLOBAL_BRAIN_STORE);
    const index = store.index('type');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(type);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteGlobalBrainIdea(id: string): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([GLOBAL_BRAIN_STORE], 'readwrite');
    const store = transaction.objectStore(GLOBAL_BRAIN_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDBHelper = new IndexedDBHelper();