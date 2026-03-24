import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uvzfhksyjqadkxypcocq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY required"); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tokenize a string into meaningful words (lowercase, 3+ chars, no common stop words)
const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was",
  "one", "our", "out", "has", "his", "how", "its", "may", "new", "now", "old", "see",
  "way", "who", "did", "get", "let", "say", "she", "too", "use", "with", "from",
  "that", "this", "what", "which", "about", "into", "more", "other", "than", "them",
  "then", "these", "some", "each", "make", "like", "over", "such", "take", "most",
  "only", "come", "could", "will", "does", "been", "have", "many", "well", "also",
  "back", "based", "during", "between", "following", "practice", "nutrition",
]);

function tokenize(str) {
  if (!str) return [];
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

// Score how well a question's topic matches a lesson
function matchScore(questionTokens, lessonTokens, subtitleTokens) {
  if (questionTokens.length === 0 || lessonTokens.length === 0) return 0;
  const lessonSet = new Set([...lessonTokens, ...subtitleTokens]);
  let matches = 0;
  for (const t of questionTokens) {
    if (lessonSet.has(t)) matches++;
    // Partial match: check if any lesson token contains or is contained by question token
    else {
      for (const lt of lessonSet) {
        if (lt.includes(t) || t.includes(lt)) { matches += 0.5; break; }
      }
    }
  }
  return matches;
}

async function main() {
  console.log("Loading lessons with modules...");
  const { data: lessons, error: lesErr } = await sb
    .from("study_lessons")
    .select("id, title, subtitle, study_modules(domain)")
    .order("id");
  if (lesErr) { console.error("Failed to load lessons:", lesErr); process.exit(1); }
  console.log(`Loaded ${lessons.length} lessons`);

  // Pre-tokenize lessons
  const lessonIndex = lessons.map(l => ({
    id: l.id,
    domain: l.study_modules?.domain,
    title: l.title,
    titleTokens: tokenize(l.title),
    subtitleTokens: tokenize(l.subtitle),
  }));

  console.log("Loading questions...");
  const { data: questions, error: qErr } = await sb
    .from("questions")
    .select("id, domain, topic, subtopic")
    .order("id");
  if (qErr) { console.error("Failed to load questions:", qErr); process.exit(1); }
  console.log(`Loaded ${questions.length} questions`);

  let mapped = 0;
  let unmapped = 0;
  const unmappedList = [];
  const updates = []; // { id, lesson_id }

  for (const q of questions) {
    const qTokens = tokenize(q.topic);
    const qSubtopicTokens = tokenize(q.subtopic);
    const allQTokens = [...new Set([...qTokens, ...qSubtopicTokens])];

    // Only consider lessons in the same domain
    const candidates = lessonIndex.filter(l => l.domain === q.domain);

    let bestScore = 0;
    let bestLesson = null;

    for (const lesson of candidates) {
      const score = matchScore(allQTokens, lesson.titleTokens, lesson.subtitleTokens);
      if (score > bestScore) {
        bestScore = score;
        bestLesson = lesson;
      }
    }

    if (bestLesson && bestScore >= 0.5) {
      updates.push({ id: q.id, lesson_id: bestLesson.id });
      mapped++;
    } else {
      unmapped++;
      unmappedList.push({ id: q.id, domain: q.domain, topic: q.topic, subtopic: q.subtopic });
    }
  }

  console.log(`\nMapping results: ${mapped} mapped, ${unmapped} unmapped`);

  if (unmappedList.length > 0) {
    console.log("\n--- UNMAPPED QUESTIONS (need manual review) ---");
    for (const u of unmappedList) {
      console.log(`  [D${u.domain}] topic="${u.topic}" subtopic="${u.subtopic}" id=${u.id}`);
    }
  }

  // Batch update in groups of 50
  console.log(`\nUpdating ${updates.length} questions with lesson_id...`);
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    for (const u of batch) {
      const { error } = await sb.from("questions").update({ lesson_id: u.lesson_id }).eq("id", u.id);
      if (error) console.error(`  Failed to update question ${u.id}:`, error.message);
    }
    console.log(`  Updated ${Math.min(i + 50, updates.length)} / ${updates.length}`);
  }

  // Summary by domain
  console.log("\n--- SUMMARY BY DOMAIN ---");
  const byDomain = {};
  for (const q of questions) {
    const d = q.domain;
    if (!byDomain[d]) byDomain[d] = { total: 0, mapped: 0 };
    byDomain[d].total++;
  }
  for (const u of updates) {
    const q = questions.find(q => q.id === u.id);
    if (q) byDomain[q.domain].mapped++;
  }
  for (const [d, s] of Object.entries(byDomain)) {
    console.log(`  Domain ${d}: ${s.mapped}/${s.total} mapped (${Math.round(s.mapped/s.total*100)}%)`);
  }

  console.log("\nDone!");
}

main().catch(err => { console.error(err); process.exit(1); });
