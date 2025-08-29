import { useState } from 'react';
import { NewIdeaSubmission, SubmissionStatus } from '../types/GlobalBrainTypes';
import { API } from '../services/GlobalBrainAPI';
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
        // Close modal after brief success display
        setTimeout(() => {
          setIsModalOpen(false);
          onSubmissionSuccess?.();
        }, 1500);
      } else {
        setSubmissionStatus('error');
        setSubmissionError(response.error || 'Failed to submit idea');
      }
    } catch (error) {
      setSubmissionStatus('error');
      setSubmissionError(error instanceof Error ? error.message : 'Unknown error occurred');
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