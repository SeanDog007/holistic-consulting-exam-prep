const { getServiceClient, getUserClient, getCorsHeaders, extractToken } = require("./utils/supabase");

exports.handler = async (event) => {
  const cors = getCorsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const token = extractToken(event.headers);
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };

  // Verify caller is admin
  const userClient = getUserClient(token);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Invalid token" }) };

  const { data: profile } = await userClient.from("student_profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: "Admin access required" }) };

  const { email, displayName } = JSON.parse(event.body);
  if (!email || !displayName) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "email and displayName required" }) };
  }

  const serviceClient = getServiceClient();

  // Create user in Supabase Auth with a temporary password
  const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";
  const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
    email: email.toLowerCase(),
    password: tempPassword,
    email_confirm: true,
  });

  if (createErr) {
    if (createErr.message?.includes("already been registered")) {
      return { statusCode: 409, headers: cors, body: JSON.stringify({ error: "Email already registered" }) };
    }
    console.error("Create user error:", createErr);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: createErr.message }) };
  }

  // Create student profile
  const { error: profileErr } = await serviceClient.from("student_profiles").insert({
    id: newUser.user.id,
    display_name: displayName,
    email: email.toLowerCase(),
    is_admin: false,
    is_active: true,
  });

  if (profileErr) {
    console.error("Profile create error:", profileErr);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "User created but profile failed: " + profileErr.message }) };
  }

  return {
    statusCode: 201,
    headers: cors,
    body: JSON.stringify({
      success: true,
      userId: newUser.user.id,
      email: email.toLowerCase(),
      tempPassword,
      message: `Student created. Temporary password: ${tempPassword} — they should change it on first login.`,
    }),
  };
};
