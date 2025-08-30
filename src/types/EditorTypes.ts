// Editor Types - Clean schema based on Global Brain data structure

export interface Concept {
  id: string;
  text: string;
  category: 'investigation' | 'problem' | 'progress' | 'suggestion' | 'concept';
  priority?: number;
  tags?: string[];
  description?: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  editorState?: string; // JSON string of the lexical editor state
  createdAt: Date;
  updatedAt: Date;
  concepts?: Concept[];
  wordCount: number;
  metadata?: {
    author?: string;
    tags?: string[];
    category?: string;
  };
  storageInfo?: {
    storageType: 'localStorage' | 'indexedDB';
    size: number;
    compressed?: boolean;
  };
}

export interface EditorState {
  currentDocument: Document | null;
  documents: Document[];
  isModified: boolean;
  autocompleteEnabled: boolean;
  settings: EditorSettings;
}

export interface EditorSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  lineNumbers: boolean;
  wordWrap: boolean;
  autoSave: boolean;
}

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: Date;
  wordCount: number;
  preview: string; // First 100 chars
}

// Action types for clean state management
export type EditorAction =
  | { type: 'NEW_DOCUMENT' }
  | { type: 'LOAD_DOCUMENT'; document: Document }
  | { type: 'SAVE_DOCUMENT'; document: Document }
  | { type: 'UPDATE_CONTENT'; content: string }
  | { type: 'UPDATE_TITLE'; title: string }
  | { type: 'DELETE_DOCUMENT'; id: string }
  | { type: 'SET_MODIFIED'; isModified: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<EditorSettings> };

// Threading types
export interface ThreadPost {
  id: string;
  text: string;
  description: string;
  type: string;
  priority: string;
  domain?: string;
  category?: string;
  tags: string[];
  source: string;
  submittedAt: string;
  votes: number;
  isNew: boolean;
  parentId?: string;
  threadRootId?: string;
  threadOrder: number;
}

export interface Thread {
  rootPost: ThreadPost;
  posts: ThreadPost[];
  totalPosts: number;
}

export interface ThreadContext {
  threadRootId?: string;
  parentId?: string;
  threadOrder?: number;
}

// Utility types
export type ConceptCategory = Concept['category'];
export type DocumentMetadata = NonNullable<Document['metadata']>;