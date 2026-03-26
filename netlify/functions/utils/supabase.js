const { createClient } = require("@supabase/supabase-js");

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getUserClient(token) {
  // Magic-link cookie auth: return a synthetic client that fakes Supabase auth
  if (token && token.startsWith('__MAGIC_LINK__:')) {
    const email = token.slice('__MAGIC_LINK__:'.length);
    const sc = getServiceClient();
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'direct-' + email, email } }, error: null }),
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
  const email = getSessionUser(headers);
  if (email) return '__MAGIC_LINK__:' + email;
  
  return null;
}

// Extract magic-link session email from cookie (for direct Stripe purchases)
function extractMagicLinkEmail(headers) {
  const { getSessionUser } = require("./auth");
  return getSessionUser(headers);
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
