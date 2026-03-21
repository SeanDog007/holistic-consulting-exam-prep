const { createClient } = require("@supabase/supabase-js");

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getUserClient(token) {
  // Service client bypasses RLS (avoids infinite recursion in admin policies on
  // student_profiles). All functions verify auth via getUser() and use explicit
  // user_id filters, so application-level security is maintained.
  const sc = getServiceClient();
  return {
    auth: {
      // Pass token explicitly — server-side has no session storage, so
      // getUser() without args can't find the JWT from global headers.
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
  return null;
}

module.exports = { getServiceClient, getUserClient, getAdminClient, getCorsHeaders, extractToken };
