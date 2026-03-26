const { createClient } = require("@supabase/supabase-js");

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getUserClient(token) {
  // Magic-link cookie auth: look up the real Supabase auth user by email
  if (token && token.startsWith('__MAGIC_LINK__:')) {
    const email = token.slice('__MAGIC_LINK__:'.length);
    const sc = getServiceClient();
    
    // Look up real auth.users record so FK constraints work
    const lookupUser = async () => {
      try {
        // Try to find existing auth user
        const { data, error } = await sc.auth.admin.listUsers();
        if (!error && data && data.users) {
          const existing = data.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
          if (existing) return { id: existing.id, email: existing.email };
        }
        // If not found, create one
        const { data: created, error: createErr } = await sc.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: { source: 'direct-stripe' },
        });
        if (!createErr && created && created.user) return { id: created.user.id, email: created.user.email };
      } catch (e) {
        console.error('[getUserClient] Auth user lookup failed:', e.message);
      }
      // Last resort: deterministic UUID
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update('direct:' + email).digest('hex');
      const fallbackId = [hash.slice(0,8), hash.slice(8,12), '4' + hash.slice(13,16), '8' + hash.slice(17,20), hash.slice(20,32)].join('-');
      return { id: fallbackId, email };
    };

    return {
      auth: {
        getUser: async () => {
          const user = await lookupUser();
          return { data: { user }, error: null };
        },
        signOut: () => Promise.resolve(),
      },
      from: sc.from.bind(sc),
      rpc: sc.rpc.bind(sc),
    };
  }

  // Standard Supabase JWT auth
  const sc = getServiceClient();
  return {
    auth: {
      getUser: () => sc.auth.getUser(token),
      signOut: () => sc.auth.signOut(),
    },
    from: sc.from.bind(sc),
    rpc: sc.rpc.bind(sc),
  };
}

function getAdminClient(token) {
  // Validates token via user client, but uses service role for admin operations
  return {
    userClient: getUserClient(token),
    serviceClient: getServiceClient(),
  };
}

function getCorsHeaders(origin) {
  const allowed =
    origin &&
    (origin.endsWith(".holisticconsultinghq.com") ||
      origin === "https://holisticconsultinghq.com" ||
      origin.startsWith("http://localhost"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://holisticconsultinghq.com",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function extractToken(headers) {
  const auth = headers.authorization || headers.Authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  
  // Fallback: check magic-link cookie
  const { getSessionUser } = require("./auth");
  const result = getSessionUser(headers);
  if (result && result.email) return '__MAGIC_LINK__:' + result.email;
  
  return null;
}

// Extract magic-link session email from cookie (for direct Stripe purchases)
function extractMagicLinkEmail(headers) {
  const { getSessionUser } = require("./auth");
  const result = getSessionUser(headers);
  return result ? result.email : null;
}

// Unified auth: returns { email, userId, source } or null
// Checks magic-link cookie first, then Supabase JWT
async function getAuthUser(event) {
  const headers = event.headers || {};

  // 1. Try magic-link cookie auth
  const mlEmail = extractMagicLinkEmail(headers);
  if (mlEmail) {
    return { email: mlEmail, userId: 'direct-' + mlEmail, source: 'magic-link' };
  }

  // 2. Try Supabase JWT
  const token = extractToken(headers);
  if (token) {
    const userClient = getUserClient(token);
    const { data: { user }, error } = await userClient.auth.getUser();
    if (!error && user) {
      return { email: user.email, userId: user.id, source: 'supabase' };
    }
  }

  return null;
}

module.exports = { getServiceClient, getUserClient, getAdminClient, getCorsHeaders, extractToken, extractMagicLinkEmail, getAuthUser };
