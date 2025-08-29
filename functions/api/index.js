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
    isNew: Boolean(row.is_new)
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
  
  // Insert idea into database
  const stmt = env.DB.prepare(`
    INSERT INTO community_ideas 
    (id, text, description, type, priority, domain, category, tags, source, submitted_at, votes, is_new)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    true
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
    isNew: Boolean(row.is_new)
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

// Generate unique ID
function generateId() {
  return `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}