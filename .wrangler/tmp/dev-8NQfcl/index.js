var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-ik3Rad/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// functions/api/index.js
var api_default = {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      if (path === "/api/health") {
        return handleHealth(env, corsHeaders);
      }
      if (path === "/api/ideas") {
        if (request.method === "GET") {
          return handleGetIdeas(request, env, corsHeaders);
        }
        if (request.method === "POST") {
          return handleSubmitIdea(request, env, corsHeaders);
        }
      }
      if (path === "/api/sync") {
        return handleSync(request, env, corsHeaders);
      }
      if (path === "/api/stats") {
        return handleStats(env, corsHeaders);
      }
      if (path.startsWith("/api/threads/")) {
        const threadId = path.split("/")[3];
        return handleGetThread(threadId, env, corsHeaders);
      }
      if (path.match(/^\/api\/posts\/[^\/]+\/replies$/)) {
        const postId = path.split("/")[3];
        return handleGetThreadReplies(postId, env, corsHeaders);
      }
      return new Response(
        JSON.stringify({ error: "Endpoint not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    } catch (error) {
      console.error("API Error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }
  }
};
async function handleHealth(env, corsHeaders) {
  return new Response(
    JSON.stringify({
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      database: "connected"
    }),
    {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    }
  );
}
__name(handleHealth, "handleHealth");
async function handleGetIdeas(request, env, corsHeaders) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const stmt = env.DB.prepare(`
    SELECT * FROM community_ideas 
    ORDER BY submitted_at DESC 
    LIMIT ? OFFSET ?
  `);
  const result = await stmt.bind(limit, offset).all();
  const ideas = result.results.map((row) => ({
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
      headers: { "Content-Type": "application/json", ...corsHeaders }
    }
  );
}
__name(handleGetIdeas, "handleGetIdeas");
async function handleSubmitIdea(request, env, corsHeaders) {
  const idea = await request.json();
  if (!idea.text || !idea.description || !idea.type || !idea.priority) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: text, description, type, priority"
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
  const id = generateId();
  const submittedAt = (/* @__PURE__ */ new Date()).toISOString();
  let threadOrder = 0;
  let threadRootId = idea.threadRootId || null;
  if (idea.parentId) {
    const parentStmt = env.DB.prepare("SELECT thread_root_id, thread_order FROM community_ideas WHERE id = ?");
    const parent = await parentStmt.bind(idea.parentId).first();
    if (parent) {
      threadRootId = parent.thread_root_id || idea.parentId;
      const orderStmt = env.DB.prepare("SELECT MAX(thread_order) as max_order FROM community_ideas WHERE thread_root_id = ?");
      const orderResult = await orderStmt.bind(threadRootId).first();
      threadOrder = (orderResult.max_order || 0) + 1;
    }
  }
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
    idea.tags ? JSON.stringify(idea.tags) : "[]",
    "community-submission",
    submittedAt,
    0,
    true,
    idea.parentId || null,
    threadRootId,
    threadOrder
  ).run();
  await updateStats(env);
  return new Response(
    JSON.stringify({
      id,
      submittedAt,
      status: "accepted"
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    }
  );
}
__name(handleSubmitIdea, "handleSubmitIdea");
async function handleSync(request, env, corsHeaders) {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
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
  const newIdeas = result.results.map((row) => ({
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
  const countResult = await env.DB.prepare("SELECT COUNT(*) as total FROM community_ideas").first();
  return new Response(
    JSON.stringify({
      newIdeas,
      totalCount: countResult.total,
      lastSyncTimestamp: (/* @__PURE__ */ new Date()).toISOString()
    }),
    {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    }
  );
}
__name(handleSync, "handleSync");
async function handleStats(env, corsHeaders) {
  const totalResult = await env.DB.prepare("SELECT COUNT(*) as total FROM community_ideas").first();
  const recentResult = await env.DB.prepare(`
    SELECT COUNT(*) as recent FROM community_ideas 
    WHERE submitted_at > datetime('now', '-7 days')
  `).first();
  return new Response(
    JSON.stringify({
      totalIdeas: totalResult.total,
      recentIdeas: recentResult.recent,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    }),
    {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    }
  );
}
__name(handleStats, "handleStats");
async function updateStats(env) {
  const totalResult = await env.DB.prepare("SELECT COUNT(*) as total FROM community_ideas").first();
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
__name(updateStats, "updateStats");
async function handleGetThread(threadRootId, env, corsHeaders) {
  try {
    const rootStmt = env.DB.prepare(`
      SELECT * FROM community_ideas 
      WHERE id = ? AND (parent_id IS NULL OR id = thread_root_id)
    `);
    const rootPost = await rootStmt.bind(threadRootId).first();
    if (!rootPost) {
      return new Response(
        JSON.stringify({ error: "Thread not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }
    const repliesStmt = env.DB.prepare(`
      SELECT * FROM community_ideas 
      WHERE thread_root_id = ? AND parent_id IS NOT NULL
      ORDER BY thread_order ASC
    `);
    const replies = await repliesStmt.bind(threadRootId).all();
    const formatPost = /* @__PURE__ */ __name((row) => ({
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
    }), "formatPost");
    const thread = {
      rootPost: formatPost(rootPost),
      posts: replies.results.map(formatPost),
      totalPosts: replies.results.length + 1
    };
    return new Response(
      JSON.stringify(thread),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error) {
    console.error("Error getting thread:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get thread" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
}
__name(handleGetThread, "handleGetThread");
async function handleGetThreadReplies(postId, env, corsHeaders) {
  try {
    const stmt = env.DB.prepare(`
      SELECT * FROM community_ideas 
      WHERE parent_id = ?
      ORDER BY thread_order ASC
    `);
    const replies = await stmt.bind(postId).all();
    const formattedReplies = replies.results.map((row) => ({
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
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error) {
    console.error("Error getting thread replies:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get thread replies" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
}
__name(handleGetThreadReplies, "handleGetThreadReplies");
function generateId() {
  return `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
__name(generateId, "generateId");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ik3Rad/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = api_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ik3Rad/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
