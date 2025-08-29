import { 
  NewIdeaSubmission, 
  ApiResponse, 
  IdeaSubmissionResponse, 
  SyncResponse, 
  CommunityIdea 
} from '../types/GlobalBrainTypes';
import { Thread, ThreadPost } from '../types/EditorTypes';

const API_BASE_URL = import.meta.env.VITE_GLOBAL_BRAIN_API_URL || 'http://localhost:8787';

export class GlobalBrainAPI {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown network error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Submit a new idea to the community global brain
   */
  static async submitIdea(idea: NewIdeaSubmission): Promise<ApiResponse<IdeaSubmissionResponse>> {
    return this.request<IdeaSubmissionResponse>('/api/ideas', {
      method: 'POST',
      body: JSON.stringify({
        ...idea,
        submittedAt: new Date().toISOString(),
      }),
    });
  }

  /**
   * Sync with community ideas (get new/updated ideas since last sync)
   */
  static async syncCommunityIdeas(lastSync?: Date): Promise<ApiResponse<SyncResponse>> {
    const params = new URLSearchParams();
    if (lastSync) {
      params.set('since', lastSync.toISOString());
    }
    
    const endpoint = `/api/sync${params.toString() ? `?${params}` : ''}`;
    return this.request<SyncResponse>(endpoint);
  }

  /**
   * Get community statistics
   */
  static async getCommunityStats(): Promise<ApiResponse<{ 
    totalIdeas: number; 
    recentIdeas: number;
    lastUpdated: string;
  }>> {
    return this.request('/api/stats');
  }

  /**
   * Health check for the API
   */
  static async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request('/api/health');
  }

  /**
   * Get all community ideas (for initial load or full refresh)
   */
  static async getAllCommunityIdeas(): Promise<ApiResponse<CommunityIdea[]>> {
    return this.request<CommunityIdea[]>('/api/ideas');
  }

  /**
   * Get a specific thread by ID
   */
  static async getThread(threadRootId: string): Promise<ApiResponse<Thread>> {
    return this.request<Thread>(`/api/threads/${threadRootId}`);
  }

  /**
   * Get all replies for a specific post
   */
  static async getThreadReplies(postId: string): Promise<ApiResponse<ThreadPost[]>> {
    return this.request<ThreadPost[]>(`/api/posts/${postId}/replies`);
  }

  /**
   * Add a reply to an existing thread
   */
  static async addToThread(
    parentId: string, 
    idea: NewIdeaSubmission
  ): Promise<ApiResponse<IdeaSubmissionResponse>> {
    return this.request<IdeaSubmissionResponse>('/api/ideas', {
      method: 'POST',
      body: JSON.stringify({
        ...idea,
        parentId,
        submittedAt: new Date().toISOString(),
      }),
    });
  }
}

// Utility functions for local development/fallback
export class LocalFallbackAPI {
  private static readonly LOCAL_STORAGE_KEY = 'global-brain-community-ideas';
  
  static async submitIdea(idea: NewIdeaSubmission): Promise<ApiResponse<IdeaSubmissionResponse>> {
    try {
      const existingIdeas = this.getLocalIdeas();
      const newIdea: CommunityIdea = {
        ...idea,
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        submittedAt: new Date().toISOString(),
        source: 'community-submission',
        isNew: true,
      };
      
      existingIdeas.push(newIdea);
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(existingIdeas));
      
      return {
        success: true,
        data: {
          id: newIdea.id,
          submittedAt: newIdea.submittedAt,
          status: 'accepted',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Local storage error',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  static async getAllCommunityIdeas(): Promise<ApiResponse<CommunityIdea[]>> {
    return {
      success: true,
      data: this.getLocalIdeas(),
      timestamp: new Date().toISOString(),
    };
  }
  
  private static getLocalIdeas(): CommunityIdea[] {
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

// Smart API client that falls back to local storage in development
export const API = {
  async submitIdea(idea: NewIdeaSubmission): Promise<ApiResponse<IdeaSubmissionResponse>> {
    // Try production API first
    const result = await GlobalBrainAPI.submitIdea(idea);
    
    // If production fails and we're in development, use local fallback
    if (!result.success && import.meta.env.DEV) {
      console.warn('Production API failed, using local fallback:', result.error);
      return LocalFallbackAPI.submitIdea(idea);
    }
    
    return result;
  },
  
  async syncCommunityIdeas(lastSync?: Date): Promise<ApiResponse<SyncResponse>> {
    const result = await GlobalBrainAPI.syncCommunityIdeas(lastSync);
    
    if (!result.success && import.meta.env.DEV) {
      // For local fallback, return local ideas as sync response
      const localResult = await LocalFallbackAPI.getAllCommunityIdeas();
      if (localResult.success) {
        return {
          success: true,
          data: {
            newIdeas: localResult.data || [],
            totalCount: (localResult.data || []).length,
            lastSyncTimestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };
      }
    }
    
    return result;
  },
  
  getCommunityStats: GlobalBrainAPI.getCommunityStats.bind(GlobalBrainAPI),
  healthCheck: GlobalBrainAPI.healthCheck.bind(GlobalBrainAPI),
  getThread: GlobalBrainAPI.getThread.bind(GlobalBrainAPI),
  getThreadReplies: GlobalBrainAPI.getThreadReplies.bind(GlobalBrainAPI),
  addToThread: GlobalBrainAPI.addToThread.bind(GlobalBrainAPI),
};