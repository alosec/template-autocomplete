export type ContentType = 
  | 'category' 
  | 'investigation' 
  | 'research' 
  | 'protocol' 
  | 'insight' 
  | 'problem' 
  | 'challenge' 
  | 'question' 
  | 'item' 
  | 'list' 
  | 'reference' 
  | 'discussion' 
  | 'resource'
  | 'guide';

export type Priority = 'high' | 'medium' | 'low';

export type DataSource = 
  | 'global-brain' 
  | 'global-brain-investigations' 
  | 'global-brain-problems' 
  | 'global-brain-generic'
  | 'community-submission';

export type Domain = 'medical' | 'technical' | 'philosophical' | 'social' | 'scientific';

export type Urgency = 'critical' | 'important' | 'interesting';

export interface AutocompleteItem {
  text: string;
  type: ContentType;
  description: string;
  source: DataSource;
  tags: string[];
  priority: Priority;
  domain?: Domain;
  urgency?: Urgency;
  category?: string;
  itemCount?: number;
}

export interface GlobalBrainMetadata {
  generatedAt: string;
  source: string;
  url: string;
  totalItems: number;
  extractionStats: {
    filesProcessed: number;
    totalItems: number;
    validItems: number;
    duplicatesRemoved: number;
  };
}

export interface GlobalBrainData {
  metadata: GlobalBrainMetadata;
  suggestions: AutocompleteItem[];
}

export interface NewIdeaSubmission {
  text: string;
  type: ContentType;
  description: string;
  tags: string[];
  priority: Priority;
  domain?: Domain;
  category?: string;
}

// Social features types
export type SubmissionStatus = 'pending' | 'submitting' | 'success' | 'error';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'stale';

export interface SubmissionState {
  status: SubmissionStatus;
  error?: string;
  isModalOpen: boolean;
}

export interface SyncState {
  status: SyncStatus;
  lastSync?: Date;
  error?: string;
}

export interface CommunityStats {
  totalSubmissions: number;
  recentSubmissions: number;
  lastUpdated: Date;
}

export interface CommunityIdea extends AutocompleteItem {
  id: string;
  submittedAt: string;
  votes?: number;
  isNew?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface IdeaSubmissionResponse {
  id: string;
  submittedAt: string;
  status: 'accepted' | 'pending_review';
}

export interface SyncResponse {
  newIdeas: CommunityIdea[];
  totalCount: number;
  lastSyncTimestamp: string;
}