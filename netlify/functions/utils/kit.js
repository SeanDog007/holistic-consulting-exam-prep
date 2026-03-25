/**
 * Kit (ConvertKit) subscriber sync for Exam Prep purchases
 * Copied from CRM utils for independence.
 */
const KIT_BASE = "https://api.convertkit.com/v4";

function headers() {
  return {
    Authorization: `Bearer ${process.env.KIT_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function tagSubscriber(subscriberId, tagName) {
  try {
    const searchRes = await fetch(`${KIT_BASE}/tags?name=${encodeURIComponent(tagName)}`, { headers: headers() });
    if (!searchRes.ok) return { success: false, error: `Tag search failed: ${searchRes.status}` };

    const searchData = await searchRes.json();
    let tagId;

    if (searchData.tags && searchData.tags.length > 0) {
      tagId = searchData.tags[0].id;
    } else {
      const createRes = await fetch(`${KIT_BASE}/tags`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ name: tagName }),
      });
      if (!createRes.ok) return { success: false, error: `Tag creation failed: ${createRes.status}` };
      const createData = await createRes.json();
      tagId = createData.tag.id;
    }

    const tagRes = await fetch(`${KIT_BASE}/tags/${tagId}/subscribers`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ subscribers: [subscriberId] }),
    });
    if (!tagRes.ok) return { success: false, error: `Tagging failed: ${tagRes.status}` };

    return { success: true };
  } catch (err) {
    console.error(`[Kit] tagSubscriber error:`, err);
    return { success: false, error: err.message };
  }
}

async function addSubscriber({ email, firstName, tags = [] }) {
  try {
    const res = await fetch(`${KIT_BASE}/subscribers`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ email_address: email, first_name: firstName }),
    });
    if (!res.ok) return { success: false, error: `Subscriber creation failed: ${res.status}` };

    const data = await res.json();
    const subscriberId = data.subscriber.id;

    for (const tagName of tags) {
      const tagResult = await tagSubscriber(subscriberId, tagName);
      if (!tagResult.success) console.error(`[Kit] Could not apply tag "${tagName}"`);
    }

    return { success: true, subscriberId };
  } catch (err) {
    console.error(`[Kit] addSubscriber error:`, err);
    return { success: false, error: err.message };
  }
}

module.exports = { addSubscriber, tagSubscriber };
