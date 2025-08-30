-- Global Brain Community Ideas Database Schema

CREATE TABLE community_ideas (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT NOT NULL,
    domain TEXT,
    category TEXT,
    tags TEXT, -- JSON array as string
    source TEXT DEFAULT 'community-submission',
    submitted_at TEXT NOT NULL, -- ISO timestamp
    votes INTEGER DEFAULT 0,
    is_new BOOLEAN DEFAULT TRUE,
    parent_id TEXT, -- References parent post for threading
    thread_root_id TEXT, -- References the root post of the thread
    thread_order INTEGER DEFAULT 0, -- Order within thread
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES community_ideas(id),
    FOREIGN KEY (thread_root_id) REFERENCES community_ideas(id)
);

-- Index for better query performance
CREATE INDEX idx_community_ideas_submitted_at ON community_ideas(submitted_at);
CREATE INDEX idx_community_ideas_type ON community_ideas(type);
CREATE INDEX idx_community_ideas_priority ON community_ideas(priority);
CREATE INDEX idx_community_ideas_domain ON community_ideas(domain);
CREATE INDEX idx_community_ideas_votes ON community_ideas(votes);
CREATE INDEX idx_community_ideas_parent_id ON community_ideas(parent_id);
CREATE INDEX idx_community_ideas_thread_root_id ON community_ideas(thread_root_id);
CREATE INDEX idx_community_ideas_thread_order ON community_ideas(thread_order);

-- Optional: Community stats table for caching
CREATE TABLE community_stats (
    id INTEGER PRIMARY KEY,
    total_ideas INTEGER DEFAULT 0,
    recent_ideas INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Initialize stats
INSERT INTO community_stats (id, total_ideas, recent_ideas) VALUES (1, 0, 0);