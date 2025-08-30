import { useState, useEffect, useCallback, useMemo } from 'react';
import { CommunityIdea, AutocompleteItem, NewIdeaSubmission, GlobalBrainData } from '../types/GlobalBrainTypes';
import { API } from '../services/GlobalBrainAPI';

export const useGlobalBrain = () => {
  const [ideas, setIdeas] = useState<CommunityIdea[]>([]);
  const [jsonSuggestions, setJsonSuggestions] = useState<AutocompleteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load both JSON data and local storage data in parallel
        const [jsonResponse, localResult] = await Promise.all([
          fetch('/data/global-brain-autocomplete.json'),
          API.getAllCommunityIdeas()
        ]);
        
        // Parse JSON data
        let jsonData: AutocompleteItem[] = [];
        if (jsonResponse.ok) {
          const globalBrainData: GlobalBrainData = await jsonResponse.json();
          jsonData = globalBrainData.suggestions || [];
        } else {
          console.warn('Failed to load JSON Global Brain data:', jsonResponse.status);
        }
        
        // Get local storage data
        let localData: CommunityIdea[] = [];
        if (localResult.success) {
          localData = localResult.data || [];
        } else {
          console.warn('Failed to load local Global Brain data:', localResult.error);
        }
        
        setJsonSuggestions(jsonData);
        setIdeas(localData);
        
        console.log(`Loaded Global Brain data: ${jsonData.length} JSON suggestions, ${localData.length} local ideas`);
      } catch (err) {
        console.error('Error loading Global Brain data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Combine JSON suggestions and local ideas into unified suggestions list
  const allSuggestions = useMemo(() => {
    // Convert local ideas to AutocompleteItem format and combine with JSON suggestions
    const localAsAutocomplete: AutocompleteItem[] = ideas.map(idea => ({
      text: idea.text,
      type: idea.type,
      tags: idea.tags,
      description: idea.description,
      source: idea.source,
      priority: idea.priority || 'medium',
    }));
    
    // Combine JSON suggestions (from original file) with local suggestions
    // Put local suggestions first so they appear at the top
    return [...localAsAutocomplete, ...jsonSuggestions];
  }, [ideas, jsonSuggestions]);

  const getFilteredSuggestions = useCallback((query: string = '') => {
    if (!allSuggestions.length) return [];
    
    if (!query.trim()) return allSuggestions;
    
    const queryLower = query.toLowerCase();
    return allSuggestions.filter(suggestion => 
      suggestion.text.toLowerCase().includes(queryLower) ||
      suggestion.description?.toLowerCase().includes(queryLower) ||
      suggestion.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }, [allSuggestions]);

  const getSuggestionsByType = useCallback((type: string) => {
    if (!allSuggestions.length) return [];
    return allSuggestions.filter(suggestion => suggestion.type === type);
  }, [allSuggestions]);

  const getRandomSuggestions = useCallback((count: number = 10) => {
    if (!allSuggestions.length) return [];
    
    const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [allSuggestions]);

  const submitNewIdea = useCallback(async (newIdea: NewIdeaSubmission): Promise<boolean> => {
    try {
      // Submit to local storage
      const result = await API.submitIdea(newIdea);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit idea');
      }

      // Refresh the ideas list to include the new idea
      const updatedResult = await API.getAllCommunityIdeas();
      if (updatedResult.success) {
        setIdeas(updatedResult.data || []);
      }

      return true;
    } catch (err) {
      console.error('Error submitting new idea:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit idea');
      return false;
    }
  }, []);

  const refreshIdeas = useCallback(async () => {
    try {
      setLoading(true);
      
      // Reload both JSON data and local storage data
      const [jsonResponse, localResult] = await Promise.all([
        fetch('/data/global-brain-autocomplete.json'),
        API.getAllCommunityIdeas()
      ]);
      
      // Update JSON data
      if (jsonResponse.ok) {
        const globalBrainData: GlobalBrainData = await jsonResponse.json();
        setJsonSuggestions(globalBrainData.suggestions || []);
      }
      
      // Update local data
      if (localResult.success) {
        setIdeas(localResult.data || []);
        setError(null);
      } else {
        setError(localResult.error || 'Failed to refresh ideas');
      }
    } catch (err) {
      console.error('Error refreshing ideas:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh ideas');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ideas,
    loading,
    error,
    suggestions: allSuggestions,
    getFilteredSuggestions,
    getSuggestionsByType,
    getRandomSuggestions,
    submitNewIdea,
    refreshIdeas,
    totalItems: allSuggestions.length
  };
};