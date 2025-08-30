import { 
  NewIdeaSubmission, 
  ApiResponse, 
  IdeaSubmissionResponse, 
  SyncResponse, 
  CommunityIdea 
} from '../types/GlobalBrainTypes';
import { Thread, ThreadPost } from '../types/EditorTypes';
import { storageManager } from '../utils/StorageManager';

// Local storage-based implementation for Global Brain
export class GlobalBrainAPI {
  /**
   * Submit a new idea to the local global brain
   */
  static async submitIdea(idea: NewIdeaSubmission): Promise<ApiResponse<IdeaSubmissionResponse>> {
    try {
      const savedIdea = await storageManager.saveGlobalBrainIdea(idea);
      
      return {
        success: true,
        data: {
          id: savedIdea.id,
          submittedAt: savedIdea.submittedAt,
          status: 'accepted',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save idea locally',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Sync with local ideas (returns all local ideas)
   */
  static async syncCommunityIdeas(lastSync?: Date): Promise<ApiResponse<SyncResponse>> {
    try {
      const allIdeas = await storageManager.getAllGlobalBrainIdeas();
      
      // Filter by lastSync if provided
      const filteredIdeas = lastSync 
        ? allIdeas.filter(idea => new Date(idea.submittedAt) > lastSync)
        : allIdeas;
      
      return {
        success: true,
        data: {
          newIdeas: filteredIdeas,
          totalCount: allIdeas.length,
          lastSyncTimestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync local ideas',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get community statistics
   */
  static async getCommunityStats(): Promise<ApiResponse<{ 
    totalIdeas: number; 
    recentIdeas: number;
    lastUpdated: string;
  }>> {
    try {
      const allIdeas = await storageManager.getAllGlobalBrainIdeas();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentIdeas = allIdeas.filter(
        idea => new Date(idea.submittedAt) > oneWeekAgo
      );
      
      return {
        success: true,
        data: {
          totalIdeas: allIdeas.length,
          recentIdeas: recentIdeas.length,
          lastUpdated: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get local stats',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Health check - always returns healthy for local storage
   */
  static async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all community ideas from local storage
   */
  static async getAllCommunityIdeas(): Promise<ApiResponse<CommunityIdea[]>> {
    try {
      const allIdeas = await storageManager.getAllGlobalBrainIdeas();
      
      return {
        success: true,
        data: allIdeas,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get local ideas',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get a specific thread by ID - simplified for local storage
   */
  static async getThread(threadRootId: string): Promise<ApiResponse<Thread>> {
    try {
      const allIdeas = await storageManager.getAllGlobalBrainIdeas();
      const threadIdeas = allIdeas.filter(
        idea => idea.threadRootId === threadRootId || idea.id === threadRootId
      );
      
      if (threadIdeas.length === 0) {
        return {
          success: false,
          error: 'Thread not found',
          timestamp: new Date().toISOString(),
        };
      }

      // Convert CommunityIdea to Thread structure
      const rootIdea = threadIdeas.find(idea => idea.id === threadRootId) || threadIdeas[0];
      const replies = threadIdeas.filter(idea => idea.parentId && idea.id !== threadRootId);
      
      const thread: Thread = {
        rootPost: {
          id: rootIdea.id,
          text: rootIdea.text,
          description: rootIdea.description || '',
          tags: rootIdea.tags,
          type: rootIdea.type,
          submittedAt: rootIdea.submittedAt,
          threadOrder: 0,
          priority: rootIdea.priority || 'medium',
          source: rootIdea.source,
          votes: 0,
          isNew: rootIdea.isNew || false,
        },
        posts: replies.map((idea, index) => ({
          id: idea.id,
          text: idea.text,
          description: idea.description || '',
          tags: idea.tags,
          type: idea.type,
          submittedAt: idea.submittedAt,
          threadOrder: index + 1,
          parentId: idea.parentId,
          priority: idea.priority || 'medium',
          source: idea.source,
          votes: 0,
          isNew: idea.isNew || false,
        })),
        totalPosts: threadIdeas.length,
      };

      return {
        success: true,
        data: thread,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get thread',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get all replies for a specific post
   */
  static async getThreadReplies(postId: string): Promise<ApiResponse<ThreadPost[]>> {
    try {
      const allIdeas = await storageManager.getAllGlobalBrainIdeas();
      const replies = allIdeas
        .filter(idea => idea.parentId === postId)
        .map((idea, index) => ({
          id: idea.id,
          text: idea.text,
          description: idea.description || '',
          tags: idea.tags,
          type: idea.type,
          submittedAt: idea.submittedAt,
          threadOrder: index,
          parentId: idea.parentId,
          priority: idea.priority || 'medium',
          source: idea.source,
          votes: 0,
          isNew: idea.isNew || false,
        }));
      
      return {
        success: true,
        data: replies,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get replies',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Add a reply to an existing thread
   */
  static async addToThread(
    parentId: string, 
    idea: NewIdeaSubmission
  ): Promise<ApiResponse<IdeaSubmissionResponse>> {
    try {
      const ideaWithParent = { ...idea, parentId };
      return await this.submitIdea(ideaWithParent);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add to thread',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export simplified API that uses local storage only
export const API = {
  submitIdea: GlobalBrainAPI.submitIdea.bind(GlobalBrainAPI),
  syncCommunityIdeas: GlobalBrainAPI.syncCommunityIdeas.bind(GlobalBrainAPI),
  getCommunityStats: GlobalBrainAPI.getCommunityStats.bind(GlobalBrainAPI),
  healthCheck: GlobalBrainAPI.healthCheck.bind(GlobalBrainAPI),
  getAllCommunityIdeas: GlobalBrainAPI.getAllCommunityIdeas.bind(GlobalBrainAPI),
  getThread: GlobalBrainAPI.getThread.bind(GlobalBrainAPI),
  getThreadReplies: GlobalBrainAPI.getThreadReplies.bind(GlobalBrainAPI),
  addToThread: GlobalBrainAPI.addToThread.bind(GlobalBrainAPI),
};