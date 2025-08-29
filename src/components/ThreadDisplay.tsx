import { Thread, ThreadPost } from '../types/EditorTypes';
import './ThreadDisplay.css';

interface ThreadDisplayProps {
  thread: Thread;
  onReplyToPost?: (post: ThreadPost) => void;
  className?: string;
}

export default function ThreadDisplay({ thread, onReplyToPost, className = '' }: ThreadDisplayProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderPost = (post: ThreadPost, isRoot = false) => (
    <div key={post.id} className={`thread-post ${isRoot ? 'root-post' : 'reply-post'}`}>
      <div className="post-header">
        <span className="post-id">#{post.id.slice(-6)}</span>
        <span className="post-date">{formatDate(post.submittedAt)}</span>
        <span className="post-votes">👍 {post.votes}</span>
      </div>
      
      <div className="post-content">
        <h4 className="post-title">{post.text}</h4>
        <p className="post-description">{post.description}</p>
        
        {post.tags.length > 0 && (
          <div className="post-tags">
            {post.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}
        
        <div className="post-meta">
          <span className="post-type">{post.type}</span>
          <span className="post-priority">{post.priority}</span>
          {post.domain && <span className="post-domain">{post.domain}</span>}
        </div>
      </div>
      
      {onReplyToPost && (
        <div className="post-actions">
          <button 
            className="reply-btn"
            onClick={() => onReplyToPost(post)}
            title="Reply to this post"
          >
            💬 Reply
          </button>
        </div>
      )}
    </div>
  );

  if (!thread) {
    return null;
  }

  return (
    <div className={`thread-display ${className}`}>
      <div className="thread-header">
        <h3>🧵 Thread Discussion</h3>
        <span className="thread-stats">{thread.totalPosts} posts</span>
      </div>
      
      <div className="thread-content">
        {/* Root post */}
        {renderPost(thread.rootPost, true)}
        
        {/* Replies with horizontal rule separators */}
        {thread.posts.map((post) => (
          <div key={post.id}>
            <hr className="thread-separator" />
            {renderPost(post)}
          </div>
        ))}
      </div>
    </div>
  );
}