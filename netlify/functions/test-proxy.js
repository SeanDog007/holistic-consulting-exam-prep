const { getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  try {
    // Step 1: Check if module loaded
    const steps = ["module_loaded"];

    // Step 2: Try getting user client
    const token = extractToken(event.headers);
    steps.push("token_extracted:" + (token ? "yes" : "no"));

    if (!token) {
      return { statusCode: 200, headers: cors, body: JSON.stringify({ steps, status: "no_token" }) };
    }

    const userClient = getUserClient(token);
    steps.push("client_created");
    steps.push("auth_type:" + typeof userClient.auth);
    steps.push("from_type:" + typeof userClient.from);

    // Step 3: Try auth
    const { data, error } = await userClient.auth.getUser();
    steps.push("auth_result:" + (data?.user ? "user_found" : "no_user"));
    if (error) steps.push("auth_error:" + error.message);

    // Step 4: Try a simple query
    if (data?.user) {
      const { data: profile, error: dbErr } = await userClient
        .from("student_profiles")
        .select("id, display_name, is_admin")
        .eq("id", data.user.id)
        .single();
      steps.push("db_result:" + (profile ? "found" : "null"));
      if (dbErr) steps.push("db_error:" + dbErr.message + ":" + dbErr.code);
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ steps }) };
  } catch (err) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ error: err.message, stack: err.stack?.split("\n").slice(0, 5) }) };
  }
};
