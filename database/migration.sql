-- Migration to add threading support to existing community_ideas table

-- Add threading columns
ALTER TABLE community_ideas ADD COLUMN parent_id TEXT;
ALTER TABLE community_ideas ADD COLUMN thread_root_id TEXT;
ALTER TABLE community_ideas ADD COLUMN thread_order INTEGER DEFAULT 0;

-- Add indexes for threading support
CREATE INDEX IF NOT EXISTS idx_community_ideas_parent_id ON community_ideas(parent_id);
CREATE INDEX IF NOT EXISTS idx_community_ideas_thread_root_id ON community_ideas(thread_root_id);
CREATE INDEX IF NOT EXISTS idx_community_ideas_thread_order ON community_ideas(thread_order);