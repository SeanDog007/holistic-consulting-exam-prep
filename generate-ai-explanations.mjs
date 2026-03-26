import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";

// --- Config (reads from .env) ---
const envLines = readFileSync('.env','utf8').split('\n');
for (const line of envLines) { const t=line.trim(); if (!t||t.startsWith('#')) continue; const i=t.indexOf('='); if (i===-1) continue; process.env[t.slice(0,i).trim()]=t.slice(i+1).trim(); }
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY env var required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PROGRESS_FILE = "./explanation-progress.json";
const BATCH_SIZE = 10; // concurrent OpenAI calls per batch
const DELAY_BETWEEN_BATCHES_MS = 500;

const DOMAIN_NAMES = {
  1: "Foundations of Nutrition",
  2: "Anatomy & Physiology",
  3: "Professional Practice & Ethics",
  4: "Clinical Nutrition & Pathophysiology",
  5: "Research Methods & Evidence-Based Practice",
};

// --- Progress tracking ---
function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
  }
  return { completed: [], failed: [] };
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// --- OpenAI call ---
async function callOpenAI(prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert tutor for the BCHN (Board Certified in Holistic Nutrition) exam. Generate concise, educational explanations for exam questions. Be specific and factual — reference the actual content, not generic statements. 2-3 sentences max.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body}`);
  }

  const json = await res.json();
  return json.choices[0].message.content.trim();
}

// --- Build prompt for a question ---
function buildPrompt(q) {
  const domainName = DOMAIN_NAMES[q.domain] || `Domain ${q.domain}`;
  const correctIndex = q.correct_answer.toLowerCase().charCodeAt(0) - 97;
  const letters = ["A", "B", "C", "D", "E"];

  const optionsText = q.options
    .map((opt, i) => `${letters[i]}. ${opt}`)
    .join("\n");

  const correctLetter = letters[correctIndex] || q.correct_answer.toUpperCase();
  const correctText = q.options[correctIndex] || "N/A";

  let prompt = `Domain: ${domainName}\n`;
  if (q.textbook_reference) prompt += `Reference: ${q.textbook_reference}\n`;
  prompt += `\nQuestion: ${q.question_text}\n\nOptions:\n${optionsText}\n\nCorrect Answer: ${correctLetter}. ${correctText}\n\n`;
  prompt += `Write a 2-3 sentence explanation. Cover: (1) why the correct answer is right with specific facts, (2) the key concept students should know, and (3) briefly why the most tempting wrong answer is incorrect. Be specific — no generic "this is the correct answer" statements.`;

  return prompt;
}

// --- Process a single question ---
async function processQuestion(q) {
  const prompt = buildPrompt(q);
  const explanation = await callOpenAI(prompt);

  const { error } = await supabase
    .from("questions")
    .update({ explanation })
    .eq("id", q.id);

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
  return explanation;
}

// --- Main ---
async function main() {
  console.log("Fetching questions with NULL explanations...");

  let allQuestions = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, domain, question_text, options, correct_answer, textbook_reference")
      .is("explanation", null)
      .order("domain", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) { console.error("Fetch error:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allQuestions = allQuestions.concat(data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // Filter out already-completed from progress file
  const progress = loadProgress();
  const completedSet = new Set(progress.completed);
  const remaining = allQuestions.filter((q) => !completedSet.has(q.id));

  console.log(`Total NULL: ${allQuestions.length} | Already done: ${completedSet.size} | Remaining: ${remaining.length}\n`);

  if (remaining.length === 0) {
    console.log("All done!");
    return;
  }

  let updated = 0;
  let errors = 0;
  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} Qs)... `);

    const results = await Promise.allSettled(
      batch.map((q) => processQuestion(q))
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const qId = batch[j].id;
      if (r.status === "fulfilled") {
        updated++;
        progress.completed.push(qId);
      } else {
        errors++;
        progress.failed.push({ id: qId, error: r.reason?.message || String(r.reason) });
        console.error(`\n  FAIL ${qId}: ${r.reason?.message || r.reason}`);
      }
    }

    // Save progress after every batch
    saveProgress(progress);
    console.log(`✓ ${updated}/${remaining.length} done, ${errors} errors`);

    // Rate limit delay
    if (i + BATCH_SIZE < remaining.length) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors:  ${errors}`);
  console.log(`Total:   ${remaining.length}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
