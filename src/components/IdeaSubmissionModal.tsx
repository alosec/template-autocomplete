import { useState, useCallback, useEffect } from 'react';
import { 
  NewIdeaSubmission, 
  ContentType, 
  Priority, 
  Domain, 
  SubmissionStatus 
} from '../types/GlobalBrainTypes';
import { 
  validateIdeaSubmission, 
  sanitizeIdeaSubmission, 
  generateTagSuggestions, 
  inferContentType, 
  inferPriority,
  parseDocumentStructure
} from '../utils/ideaSubmission';
import './IdeaSubmissionModal.css';

interface IdeaSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (idea: NewIdeaSubmission) => Promise<void>;
  submissionStatus: SubmissionStatus;
  submissionError?: string;
  prePopulatedContent?: string;
  documentTitle?: string;
  threadContext?: {
    parentId?: string;
    threadRootId?: string;
  };
}

const CONTENT_TYPES: { value: ContentType; label: string; description: string }[] = [
  { value: 'problem', label: 'Problem', description: 'A challenge that needs solving' },
  { value: 'challenge', label: 'Challenge', description: 'A complex problem requiring breakthrough solutions' },
  { value: 'question', label: 'Question', description: 'Something we need to understand better' },
  { value: 'research', label: 'Research', description: 'Active research area or topic' },
  { value: 'insight', label: 'Insight', description: 'A useful observation or understanding' },
  { value: 'item', label: 'General Idea', description: 'Any other interesting idea or concept' },
  { value: 'protocol', label: 'Protocol', description: 'A structured approach or methodology' },
  { value: 'investigation', label: 'Investigation', description: 'Something worth exploring deeper' },
];

const PRIORITIES: { value: Priority; label: string; description: string }[] = [
  { value: 'high', label: 'High', description: 'Critical, urgent, or breakthrough potential' },
  { value: 'medium', label: 'Medium', description: 'Important and interesting' },
  { value: 'low', label: 'Low', description: 'Nice to have or future consideration' },
];

const DOMAINS: { value: Domain; label: string }[] = [
  { value: 'medical', label: 'Medical & Health' },
  { value: 'scientific', label: 'Scientific Research' },
  { value: 'technical', label: 'Technical & Engineering' },
  { value: 'social', label: 'Social & Policy' },
  { value: 'philosophical', label: 'Philosophical' },
];

export default function IdeaSubmissionModal({
  isOpen,
  onClose,
  onSubmit,
  submissionStatus,
  submissionError,
  prePopulatedContent = '',
  documentTitle,
  threadContext,
}: IdeaSubmissionModalProps) {
  const [formData, setFormData] = useState<NewIdeaSubmission>({
    text: '',
    type: 'item',
    description: '',
    tags: [],
    priority: 'medium',
  });
  
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isAutoInferring, setIsAutoInferring] = useState(true);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const parsedContent = parseDocumentStructure(prePopulatedContent || '', documentTitle);
      setFormData({
        text: parsedContent.title,
        type: 'item',
        description: parsedContent.description,
        tags: parsedContent.tags,
        priority: 'medium',
        parentId: threadContext?.parentId,
        threadRootId: threadContext?.threadRootId,
        threadOrder: threadContext?.parentId ? 1 : 0,
      });
      setTagInput('');
      setValidationErrors([]);
      setIsAutoInferring(true);
    }
  }, [isOpen, prePopulatedContent, documentTitle, threadContext]);

  // Auto-infer content type and priority based on text and description
  useEffect(() => {
    if (!isAutoInferring || !formData.text || !formData.description) return;

    const inferredType = inferContentType(formData.text, formData.description);
    const inferredPriority = inferPriority(formData.text, formData.description, formData.domain);
    
    setFormData(prev => ({
      ...prev,
      type: inferredType,
      priority: inferredPriority,
    }));
  }, [formData.text, formData.description, formData.domain, isAutoInferring]);

  // Generate tag suggestions when text or description changes
  useEffect(() => {
    if (formData.text || formData.description) {
      const suggestions = generateTagSuggestions(formData.text, formData.description);
      setSuggestedTags(suggestions.filter(tag => !formData.tags.includes(tag)));
    }
  }, [formData.text, formData.description, formData.tags]);

  const handleTextChange = (field: keyof NewIdeaSubmission, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
  };

  const handleTypeChange = (type: ContentType) => {
    setFormData(prev => ({ ...prev, type }));
    setIsAutoInferring(false); // Disable auto-inference once user manually selects
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateIdeaSubmission(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const sanitizedData = sanitizeIdeaSubmission(formData);
    await onSubmit(sanitizedData);
  }, [formData, onSubmit]);

  const canSubmit = submissionStatus !== 'submitting' && validationErrors.length === 0;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content idea-submission-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🧠 Contribute to the Global Brain</h2>
          {threadContext?.parentId && (
            <div className="thread-indicator">
              🧵 Adding to thread
            </div>
          )}
          <button 
            className="close-btn" 
            onClick={onClose}
            disabled={submissionStatus === 'submitting'}
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="submission-form">
          <div className="form-group">
            <label htmlFor="idea-text">Idea Title *</label>
            <input
              id="idea-text"
              type="text"
              value={formData.text}
              onChange={(e) => handleTextChange('text', e.target.value)}
              placeholder="e.g., Developing room-temperature superconductors"
              maxLength={200}
              disabled={submissionStatus === 'submitting'}
            />
            <div className="char-count">{formData.text.length}/200</div>
          </div>

          <div className="form-group">
            <label htmlFor="idea-description">Description *</label>
            <textarea
              id="idea-description"
              value={formData.description}
              onChange={(e) => handleTextChange('description', e.target.value)}
              placeholder="Describe your idea in more detail. What makes it interesting? What problem does it solve?"
              maxLength={500}
              rows={3}
              disabled={submissionStatus === 'submitting'}
            />
            <div className="char-count">{formData.description.length}/500</div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="idea-type">Type</label>
              <select
                id="idea-type"
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value as ContentType)}
                disabled={submissionStatus === 'submitting'}
              >
                {CONTENT_TYPES.map(type => (
                  <option key={type.value} value={type.value} title={type.description}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="idea-priority">Priority</label>
              <select
                id="idea-priority"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                disabled={submissionStatus === 'submitting'}
              >
                {PRIORITIES.map(priority => (
                  <option key={priority.value} value={priority.value} title={priority.description}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="idea-domain">Domain (optional)</label>
              <select
                id="idea-domain"
                value={formData.domain || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  domain: e.target.value ? e.target.value as Domain : undefined 
                }))}
                disabled={submissionStatus === 'submitting'}
              >
                <option value="">Any</option>
                {DOMAINS.map(domain => (
                  <option key={domain.value} value={domain.value}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tag-input">Tags *</label>
            <div className="tag-input-container">
              <input
                id="tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Add tags (press Enter or comma to add)"
                disabled={submissionStatus === 'submitting'}
              />
              <button
                type="button"
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim() || submissionStatus === 'submitting'}
                className="add-tag-btn"
              >
                Add
              </button>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="current-tags">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      disabled={submissionStatus === 'submitting'}
                      className="remove-tag-btn"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {suggestedTags.length > 0 && (
              <div className="suggested-tags">
                <span className="label">Suggested: </span>
                {suggestedTags.slice(0, 5).map((tag, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    disabled={submissionStatus === 'submitting'}
                    className="suggested-tag"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {validationErrors.length > 0 && (
            <div className="validation-errors">
              {validationErrors.map((error, index) => (
                <div key={index} className="error-message">{error}</div>
              ))}
            </div>
          )}

          {submissionError && (
            <div className="submission-error">
              Failed to submit: {submissionError}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={submissionStatus === 'submitting'}
              className="cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="submit-btn"
            >
              {submissionStatus === 'submitting' ? 'Submitting...' : 'Share with Global Brain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}