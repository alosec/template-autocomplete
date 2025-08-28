import { useState, useEffect, useCallback } from 'react';
import { GlobalBrainData, AutocompleteItem, NewIdeaSubmission } from '../types/GlobalBrainTypes';

export const useGlobalBrain = () => {
  const [data, setData] = useState<GlobalBrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load the Global Brain autocomplete data
        const response = await fetch('/data/global-brain-autocomplete.json');
        
        if (!response.ok) {
          throw new Error(`Failed to load Global Brain data: ${response.status}`);
        }
        
        const globalBrainData: GlobalBrainData = await response.json();
        setData(globalBrainData);
      } catch (err) {
        console.error('Error loading Global Brain data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getFilteredSuggestions = useCallback((query: string = '') => {
    if (!data?.suggestions) return [];
    
    if (!query.trim()) return data.suggestions;
    
    const queryLower = query.toLowerCase();
    return data.suggestions.filter(item => 
      item.text.toLowerCase().includes(queryLower)
    );
  }, [data]);

  const getSuggestionsByType = useCallback((type: string) => {
    if (!data?.suggestions) return [];
    return data.suggestions.filter(item => item.type === type);
  }, [data]);

  const getRandomSuggestions = useCallback((count: number = 10) => {
    if (!data?.suggestions) return [];
    
    const shuffled = [...data.suggestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [data]);

  const submitNewIdea = useCallback(async (newIdea: NewIdeaSubmission): Promise<boolean> => {
    try {
      if (!data) throw new Error('Global Brain data not loaded');

      // Create new autocomplete item with generated metadata
      const newItem: AutocompleteItem = {
        ...newIdea,
        source: 'global-brain-generic' as const,
      };

      // Update local state immediately for optimistic UI
      const updatedData: GlobalBrainData = {
        ...data,
        metadata: {
          ...data.metadata,
          totalItems: data.metadata.totalItems + 1,
          extractionStats: {
            ...data.metadata.extractionStats,
            totalItems: data.metadata.extractionStats.totalItems + 1,
            validItems: data.metadata.extractionStats.validItems + 1,
          }
        },
        suggestions: [newItem, ...data.suggestions]
      };

      setData(updatedData);

      // In a real implementation, this would POST to an API
      // For now, we'll simulate the submission
      console.log('New idea submitted:', newItem);
      
      // TODO: Replace with actual API call when deploying
      // await fetch('/api/ideas', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newItem)
      // });

      return true;
    } catch (err) {
      console.error('Error submitting new idea:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit idea');
      return false;
    }
  }, [data]);

  return {
    data,
    loading,
    error,
    suggestions: data?.suggestions || [],
    getFilteredSuggestions,
    getSuggestionsByType,
    getRandomSuggestions,
    submitNewIdea,
    totalItems: data?.metadata.totalItems || 0
  };
};