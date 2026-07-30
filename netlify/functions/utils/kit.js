/**
 * Kit (ConvertKit) subscriber sync — v4 API
 * Base: https://api.kit.com/v4  ·  Auth: X-Kit-Api-Key header
 * (Mirrors the CRM's utils/kit.js — the v3 api_secret flow is deprecated.)
 */
const KIT_BASE = "https://api.kit.com/v4";

function authHeaders() {
  return {
    "X-Kit-Api-Key": process.env.KIT_API_KEY || process.env.KIT_API_SECRET,
    "Content-Type": "application/json",
  };
}

// Fetch every tag once and return a name -> id map (paginated).
async function fetchAllTags() {
  const map = new Map();
  let after = null;
  do {
    const url = new URL(`${KIT_BASE}/tags`);
    url.searchParams.set("per_page", "500");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Tag list failed: ${res.status}`);
    const data = await res.json();

    for (const t of data.tags || []) map.set(t.name, t.id);
    const pg = data.pagination || {};
    after = pg.has_next_page ? pg.end_cursor : null;
  } while (after);
  return map;
}

async function createTag(name) {
  const res = await fetch(`${KIT_BASE}/tags`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Tag creation failed for "${name}": ${res.status}`);
  const data = await res.json();
  return data.tag?.id ?? data.id;
}

async function tagSubscriber(tagId, email) {
  // v4: tagging by email creates the subscriber if they don't already exist.
  const res = await fetch(`${KIT_BASE}/tags/${tagId}/subscribers`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email_address: email }),
  });
  return res.ok;
}

async function addSubscriber({ email, firstName, tags = [] }) {
  try {
    // Upsert the subscriber first so the first name is captured.
    await fetch(`${KIT_BASE}/subscribers`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email_address: email, first_name: firstName || "" }),
    });

    const names = tags.length > 0 ? tags : ["hcq-subscriber"];
    const tagMap = await fetchAllTags();

    for (const name of names) {
      let tagId = tagMap.get(name);
      if (!tagId) {
        tagId = await createTag(name);
        tagMap.set(name, tagId);
      }
      const ok = await tagSubscriber(tagId, email);
      if (!ok) console.error(`[Kit] Tag subscribe failed for "${name}"`);
    }

    return { success: true };
  } catch (err) {
    console.error(`[Kit] addSubscriber error:`, err);
    return { success: false, error: err.message };
  }
}

module.exports = { addSubscriber };
