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
  | 'global-brain-generic';

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