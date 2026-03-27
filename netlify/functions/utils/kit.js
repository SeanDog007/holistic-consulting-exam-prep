/**
 * Kit (ConvertKit) subscriber sync — v3 API
 */
const KIT_BASE = "https://api.convertkit.com/v3";

function getSecret() {
  return process.env.KIT_API_SECRET || process.env.KIT_API_KEY;
}

async function findOrCreateTag(tagName) {
  // List all tags
  const res = await fetch(`${KIT_BASE}/tags?api_secret=${getSecret()}`);
  if (!res.ok) throw new Error(`Tag list failed: ${res.status}`);
  const data = await res.json();

  const existing = (data.tags || []).find(t => t.name === tagName);
  if (existing) return existing.id;

  // Create tag
  const createRes = await fetch(`${KIT_BASE}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_secret: getSecret(), tag: { name: tagName } }),
  });
  if (!createRes.ok) throw new Error(`Tag creation failed: ${createRes.status}`);
  const createData = await createRes.json();
  return createData.tag?.id || createData.id;
}

async function addSubscriber({ email, firstName, tags = [] }) {
  try {
    // Tag-based subscription: for each tag, subscribe the email to that tag
    // This creates the subscriber if they don't exist
    if (tags.length > 0) {
      for (const tagName of tags) {
        const tagId = await findOrCreateTag(tagName);
        const res = await fetch(`${KIT_BASE}/tags/${tagId}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_secret: getSecret(),
            email,
            first_name: firstName || "",
          }),
        });
        if (!res.ok) {
          console.error(`[Kit] Tag subscribe failed for "${tagName}": ${res.status}`);
        }
      }
    } else {
      // No tags — just create/update subscriber via form or direct
      // Use tags endpoint with a generic tag
      const tagId = await findOrCreateTag("hcq-subscriber");
      await fetch(`${KIT_BASE}/tags/${tagId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_secret: getSecret(),
          email,
          first_name: firstName || "",
        }),
      });
    }

    return { success: true };
  } catch (err) {
    console.error(`[Kit] addSubscriber error:`, err);
    return { success: false, error: err.message };
  }
}

module.exports = { addSubscriber };
