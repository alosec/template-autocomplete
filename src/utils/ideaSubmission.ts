import { ContentType, Priority, Domain, NewIdeaSubmission } from '../types/GlobalBrainTypes';

export const validateIdeaSubmission = (submission: Partial<NewIdeaSubmission>): string[] => {
  const errors: string[] = [];
  
  if (!submission.text || submission.text.trim().length < 3) {
    errors.push('Idea text must be at least 3 characters long');
  }
  
  if (submission.text && submission.text.length > 200) {
    errors.push('Idea text must be less than 200 characters');
  }
  
  if (!submission.type) {
    errors.push('Idea type is required');
  }
  
  if (!submission.description || submission.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }
  
  if (submission.description && submission.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  if (!submission.priority) {
    errors.push('Priority is required');
  }
  
  if (!submission.tags || submission.tags.length === 0) {
    errors.push('At least one tag is required');
  }
  
  if (submission.tags && submission.tags.some(tag => tag.length > 50)) {
    errors.push('Tags must be less than 50 characters each');
  }
  
  return errors;
};

export const sanitizeIdeaSubmission = (submission: NewIdeaSubmission): NewIdeaSubmission => {
  return {
    text: submission.text.trim(),
    type: submission.type,
    description: submission.description.trim(),
    tags: submission.tags.map(tag => tag.trim().toLowerCase()).filter(Boolean),
    priority: submission.priority,
    domain: submission.domain,
    category: submission.category?.trim(),
  };
};

export const generateTagSuggestions = (text: string, description: string): string[] => {
  const combined = `${text} ${description}`.toLowerCase();
  const suggestions: string[] = [];
  
  // Common domain keywords
  const domainKeywords = {
    medical: ['health', 'medical', 'disease', 'treatment', 'therapy', 'clinical', 'patient', 'diagnosis'],
    technical: ['technology', 'engineering', 'software', 'hardware', 'system', 'development', 'programming'],
    scientific: ['research', 'study', 'science', 'experiment', 'analysis', 'discovery', 'laboratory'],
    social: ['society', 'community', 'social', 'policy', 'public', 'culture', 'human'],
    environmental: ['environment', 'climate', 'sustainable', 'green', 'ecology', 'conservation'],
    economic: ['economy', 'financial', 'business', 'market', 'economic', 'commerce', 'trade'],
  };
  
  Object.entries(domainKeywords).forEach(([domain, keywords]) => {
    if (keywords.some(keyword => combined.includes(keyword))) {
      suggestions.push(domain);
    }
  });
  
  // Extract potential tags from text (simple approach)
  const words = combined.split(/\s+/).filter(word => 
    word.length > 3 && 
    word.length < 20 && 
    !/^\d+$/.test(word) && 
    !['the', 'and', 'or', 'but', 'for', 'with', 'this', 'that', 'they', 'them'].includes(word)
  );
  
  suggestions.push(...words.slice(0, 5));
  
  return [...new Set(suggestions)]; // Remove duplicates
};

export const inferContentType = (text: string, description: string): ContentType => {
  const combined = `${text} ${description}`.toLowerCase();
  
  if (combined.includes('how to') || combined.includes('problem') || combined.includes('challenge')) {
    return combined.includes('challenge') ? 'challenge' : 'problem';
  }
  
  if (combined.includes('research') || combined.includes('study') || combined.includes('investigation')) {
    return 'investigation';
  }
  
  if (combined.includes('protocol') || combined.includes('guide') || combined.includes('method')) {
    return 'protocol';
  }
  
  if (combined.includes('insight') || combined.includes('observation') || combined.includes('reflection')) {
    return 'insight';
  }
  
  if (combined.includes('question') || combined.includes('what is') || combined.includes('why')) {
    return 'question';
  }
  
  return 'item'; // Default fallback
};

export const parseDocumentStructure = (content: string): { title: string; description: string; tags: string[] } => {
  if (!content || content.trim().length === 0) {
    return { title: '', description: '', tags: [] };
  }

  const lines = content.trim().split('\n').filter(line => line.trim().length > 0);
  
  // First line becomes title
  const title = lines[0]?.trim() || '';
  
  // Rest becomes description
  const descriptionLines = lines.slice(1);
  const description = descriptionLines.join('\n').trim();
  
  // Extract hashtags from entire content
  const hashtagRegex = /#(\w+)/g;
  const tags: string[] = [];
  let match;
  
  while ((match = hashtagRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return {
    title: title.slice(0, 200), // Maintain title length limit
    description: description.slice(0, 500), // Maintain description length limit
    tags
  };
};

export const inferPriority = (text: string, description: string, domain?: Domain): Priority => {
  const combined = `${text} ${description}`.toLowerCase();
  
  const highPriorityKeywords = [
    'critical', 'urgent', 'crisis', 'emergency', 'breakthrough', 
    'revolutionary', 'game-changing', 'life-saving', 'essential'
  ];
  
  const lowPriorityKeywords = [
    'nice to have', 'optional', 'future', 'someday', 'minor', 
    'trivial', 'cosmetic', 'aesthetic'
  ];
  
  if (highPriorityKeywords.some(keyword => combined.includes(keyword))) {
    return 'high';
  }
  
  if (lowPriorityKeywords.some(keyword => combined.includes(keyword))) {
    return 'low';
  }
  
  // Domain-based priority inference
  if (domain === 'medical' && (combined.includes('treatment') || combined.includes('cure'))) {
    return 'high';
  }
  
  return 'medium'; // Default fallback
};