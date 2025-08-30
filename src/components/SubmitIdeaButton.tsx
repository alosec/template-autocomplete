import { useState } from 'react';
import { NewIdeaSubmission, SubmissionStatus } from '../types/GlobalBrainTypes';
import { API } from '../services/GlobalBrainAPI';
import { useToast } from '../hooks/useToast';
import IdeaSubmissionModal from './IdeaSubmissionModal';
import './SubmitIdeaButton.css';

interface SubmitIdeaButtonProps {
  className?: string;
  onSubmissionSuccess?: () => void;
  prePopulatedContent?: string;
  threadContext?: {
    parentId?: string;
    threadRootId?: string;
  };
}

export default function SubmitIdeaButton({ 
  className = '', 
  onSubmissionSuccess,
  prePopulatedContent = '',
  threadContext
}: SubmitIdeaButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('pending');
  const [submissionError, setSubmissionError] = useState<string | undefined>();
  const { success, error } = useToast();

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSubmissionStatus('pending');
    setSubmissionError(undefined);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSubmissionStatus('pending');
    setSubmissionError(undefined);
  };

  const handleSubmitIdea = async (idea: NewIdeaSubmission) => {
    setSubmissionStatus('submitting');
    setSubmissionError(undefined);

    try {
      const response = await API.submitIdea(idea);
      
      if (response.success) {
        setSubmissionStatus('success');
        
        // Show success toast
        success(
          'Idea shared successfully!', 
          'Your idea has been added to the Global Brain and is now available for search and autocomplete.',
          4000
        );
        
        // Close modal immediately
        setIsModalOpen(false);
        onSubmissionSuccess?.();
      } else {
        setSubmissionStatus('error');
        const errorMsg = response.error || 'Failed to submit idea';
        setSubmissionError(errorMsg);
        
        // Show error toast
        error(
          'Failed to share idea',
          errorMsg,
          6000
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setSubmissionStatus('error');
      setSubmissionError(errorMsg);
      
      // Show error toast
      error(
        'Failed to share idea',
        errorMsg,
        6000
      );
    }
  };

  return (
    <>
      <button
        className={`submit-idea-btn ${className}`}
        onClick={handleOpenModal}
        title="Share your idea with the global brain community"
        type="button"
      >
        <span className="btn-icon">📝</span>
        <span className="btn-text">Share</span>
      </button>

      <IdeaSubmissionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitIdea}
        submissionStatus={submissionStatus}
        submissionError={submissionError}
        prePopulatedContent={prePopulatedContent}
        threadContext={threadContext}
      />
    </>
  );
}