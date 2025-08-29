// Global Brain API - Cloudflare Worker
export default {
  async fetch(request, env) {
    // Enable CORS for all requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Route handling
      if (path === '/api/health') {
        return handleHealth(env, corsHeaders);
      }
      
      if (path === '/api/ideas') {
        if (request.method === 'GET') {
          return handleGetIdeas(request, env, corsHeaders);
        }
        if (request.method === 'POST') {
          return handleSubmitIdea(request, env, corsHeaders);
        }
      }

      if (path === '/api/sync') {
        return handleSync(request, env, corsHeaders);
      }

      if (path === '/api/stats') {
        return handleStats(env, corsHeaders);
      }

      // Thread endpoints
      if (path.startsWith('/api/threads/')) {
        const threadId = path.split('/')[3];
        return handleGetThread(threadId, env, corsHeaders);
      }

      if (path.match(/^\/api\/posts\/[^\/]+\/replies$/)) {
        const postId = path.split('/')[3];
        return handleGetThreadReplies(postId, env, corsHeaders);
      }

      // 404 Not Found
      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    } catch (error) {
      console.error('API Error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error.message 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
  }
};

// Health check endpoint
async function handleHealth(env, corsHeaders) {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    }
  );
}

// Get all community ideas
async function handleGetIdeas(request, env, corsHeaders) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const stmt = env.DB.prepare(`
    SELECT * FROM community_ideas 
    ORDER BY submitted_at DESC 
    LIMIT ? OFFSET ?
  `);
  
  const result = await stmt.bind(limit, offset).all();
  
  const ideas = result.results.map(row => ({
    id: row.id,
    text: row.text,
    description: row.description,
    type: row.type,
    priority: row.priority,
    domain: row.domain,
    category: row.category,
    tags: row.tags ? JSON.parse(row.tags) : [],
    source: row.source,
    submittedAt: row.submitted_at,
    votes: row.votes,
    isNew: Boolean(row.is_new),
    parentId: row.parent_id,
    threadRootId: row.thread_root_id,
    threadOrder: row.thread_order || 0
  }));

  return new Response(
    JSON.stringify(ideas),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    }
  );
}

// Submit new idea
async function handleSubmitIdea(request, env, corsHeaders) {
  const idea = await request.json();
  
  // Validate required fields
  if (!idea.text || !idea.description || !idea.type || !idea.priority) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required fields: text, description, type, priority' 
      }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }

  const id = generateId();
  const submittedAt = new Date().toISOString();
  
  // Calculate thread order for replies
  let threadOrder = 0;
  let threadRootId = idea.threadRootId || null;
  
  if (idea.parentId) {
    // If this is a reply, get the thread info and calculate order
    const parentStmt = env.DB.prepare('SELECT thread_root_id, thread_order FROM community_ideas WHERE id = ?');
    const parent = await parentStmt.bind(idea.parentId).first();
    
    if (parent) {
      threadRootId = parent.thread_root_id || idea.parentId;
      
      // Get the highest order in this thread
      const orderStmt = env.DB.prepare('SELECT MAX(thread_order) as max_order FROM community_ideas WHERE thread_root_id = ?');
      const orderResult = await orderStmt.bind(threadRootId).first();
      threadOrder = (orderResult.max_order || 0) + 1;
    }
  }

  // Insert idea into database
  const stmt = env.DB.prepare(`
    INSERT INTO community_ideas 
    (id, text, description, type, priority, domain, category, tags, source, submitted_at, votes, is_new, parent_id, thread_root_id, thread_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  await stmt.bind(
    id,
    idea.text,
    idea.description,
    idea.type,
    idea.priority,
    idea.domain || null,
    idea.category || null,
    idea.tags ? JSON.stringify(idea.tags) : '[]',
    'community-submission',
    submittedAt,
    0,
    true,
    idea.parentId || null,
    threadRootId,
    threadOrder
  ).run();

  // Update stats
  await updateStats(env);

  return new Response(
    JSON.stringify({
      id,
      submittedAt,
      status: 'accepted'
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    }
  );
}

// Sync endpoint - get ideas since timestamp
async function handleSync(request, env, corsHeaders) {
  const url = new URL(request.url);
  const since = url.searchParams.get('since');
  
  let stmt;
  let bind_params = [];
  
  if (since) {
    stmt = env.DB.prepare(`
      SELECT * FROM community_ideas 
      WHERE submitted_at > ? 
      ORDER BY submitted_at DESC 
      LIMIT 100
    `);
    bind_params = [since];
  } else {
    stmt = env.DB.prepare(`
      SELECT * FROM community_ideas 
      ORDER BY submitted_at DESC 
      LIMIT 20
    `);
  }
  
  const result = await stmt.bind(...bind_params).all();
  
  const newIdeas = result.results.map(row => ({
    id: row.id,
    text: row.text,
    description: row.description,
    type: row.type,
    priority: row.priority,
    domain: row.domain,
    category: row.category,
    tags: row.tags ? JSON.parse(row.tags) : [],
    source: row.source,
    submittedAt: row.submitted_at,
    votes: row.votes,
    isNew: Boolean(row.is_new),
    parentId: row.parent_id,
    threadRootId: row.thread_root_id,
    threadOrder: row.thread_order || 0
  }));

  // Get total count
  const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM community_ideas').first();
  
  return new Response(
    JSON.stringify({
      newIdeas,
      totalCount: countResult.total,
      lastSyncTimestamp: new Date().toISOString()
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    }
  );
}

// Get community stats
async function handleStats(env, corsHeaders) {
  const totalResult = await env.DB.prepare('SELECT COUNT(*) as total FROM community_ideas').first();
  
  const recentResult = await env.DB.prepare(`
    SELECT COUNT(*) as recent FROM community_ideas 
    WHERE submitted_at > datetime('now', '-7 days')
  `).first();
  
  return new Response(
    JSON.stringify({
      totalIdeas: totalResult.total,
      recentIdeas: recentResult.recent,
      lastUpdated: new Date().toISOString()
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    }
  );
}

// Update community stats table
async function updateStats(env) {
  const totalResult = await env.DB.prepare('SELECT COUNT(*) as total FROM community_ideas').first();
  const recentResult = await env.DB.prepare(`
    SELECT COUNT(*) as recent FROM community_ideas 
    WHERE submitted_at > datetime('now', '-7 days')
  `).first();
  
  await env.DB.prepare(`
    UPDATE community_stats 
    SET total_ideas = ?, recent_ideas = ?, last_updated = CURRENT_TIMESTAMP 
    WHERE id = 1
  `).bind(totalResult.total, recentResult.recent).run();
}

// Get a specific thread and its replies
async function handleGetThread(threadRootId, env, corsHeaders) {
  try {
    // Get root post
    const rootStmt = env.DB.prepare(`
      SELECT * FROM community_ideas 
      WHERE id = ? AND (parent_id IS NULL OR id = thread_root_id)
    `);
    const rootPost = await rootStmt.bind(threadRootId).first();
    
    if (!rootPost) {
      return new Response(
        JSON.stringify({ error: 'Thread not found' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Get all replies in the thread
    const repliesStmt = env.DB.prepare(`
      SELECT * FROM community_ideas 
      WHERE thread_root_id = ? AND parent_id IS NOT NULL
      ORDER BY thread_order ASC
    `);
    const replies = await repliesStmt.bind(threadRootId).all();

    const formatPost = (row) => ({
      id: row.id,
      text: row.text,
      description: row.description,
      type: row.type,
      priority: row.priority,
      domain: row.domain,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      source: row.source,
      submittedAt: row.submitted_at,
      votes: row.votes,
      isNew: Boolean(row.is_new),
      parentId: row.parent_id,
      threadRootId: row.thread_root_id,
      threadOrder: row.thread_order
    });

    const thread = {
      rootPost: formatPost(rootPost),
      posts: replies.results.map(formatPost),
      totalPosts: replies.results.length + 1
    };

    return new Response(
      JSON.stringify(thread),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  } catch (error) {
    console.error('Error getting thread:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get thread' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
}

// Get replies for a specific post
async function handleGetThreadReplies(postId, env, corsHeaders) {
  try {
    const stmt = env.DB.prepare(`
      SELECT * FROM community_ideas 
      WHERE parent_id = ?
      ORDER BY thread_order ASC
    `);
    const replies = await stmt.bind(postId).all();

    const formattedReplies = replies.results.map(row => ({
      id: row.id,
      text: row.text,
      description: row.description,
      type: row.type,
      priority: row.priority,
      domain: row.domain,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      source: row.source,
      submittedAt: row.submitted_at,
      votes: row.votes,
      isNew: Boolean(row.is_new),
      parentId: row.parent_id,
      threadRootId: row.thread_root_id,
      threadOrder: row.thread_order
    }));

    return new Response(
      JSON.stringify(formattedReplies),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  } catch (error) {
    console.error('Error getting thread replies:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get thread replies' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
}

// Generate unique ID
function generateId() {
  return `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}