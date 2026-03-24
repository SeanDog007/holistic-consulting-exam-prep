import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const SUPABASE_URL = "https://uvzfhksyjqadkxypcocq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const questionsPath = join(__dirname, "circle-questions-export.json");

async function main() {
  console.log("Reading questions from:", questionsPath);
  const raw = await readFile(questionsPath, "utf-8");
  const questions = JSON.parse(raw);
  console.log(`Loaded ${questions.length} questions total.`);

  // Filter out domain 0 (comprehensive) and correctAnswer -1
  const valid = questions.filter((q) => {
    if (q.domain === 0) return false;
    if (q.correct_answer === -1) return false;
    return true;
  });

  console.log(`${valid.length} questions after filtering (skipped ${questions.length - valid.length}).`);

  // Convert to flashcards — structured data for interactive quiz mode
  const flashcards = valid.map((q) => ({
    domain: q.domain,
    topic: q.topic,
    front_text: q.question_text,
    back_text: JSON.stringify({
      options: q.options,
      correctIndex: q.correct_answer,
      correctText: q.options[q.correct_answer],
    }),
    card_type: "text",
    is_active: true,
  }));

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < flashcards.length; i += BATCH_SIZE) {
    const batch = flashcards.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(flashcards.length / BATCH_SIZE);

    console.log(`Inserting batch ${batchNum}/${totalBatches} (${batch.length} cards)...`);

    const { data, error } = await supabase.from("flashcards").insert(batch).select("id");

    if (error) {
      console.error(`Error on batch ${batchNum}:`, error.message);
      process.exit(1);
    }

    inserted += data.length;
    console.log(`  Batch ${batchNum} done. Total inserted: ${inserted}/${flashcards.length}`);
  }

  console.log(`\nComplete! Inserted ${inserted} flashcards into Supabase.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
