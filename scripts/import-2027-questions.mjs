#!/usr/bin/env node
/**
 * Import question-bank-canonical-2027-11-16.json into Supabase.
 *
 * Dry-run is the default. It does not connect to Supabase.
 *
 *   node scripts/import-2027-questions.mjs
 *   node scripts/import-2027-questions.mjs --apply
 *
 * --apply reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment.
 * It refuses the production project (uvzfhksyjqadkxypcocq) unless
 * ALLOW_PROD_SUPABASE=yes is also set. Sean sets that when he is ready.
 * Do not print the service-role key.
 *
 * correct_answer is stored as a letter, matching import-circle-questions.mjs.
 * The canonical JSON keeps a 0-based index. Rows are skipped when the same
 * question_text is already in the questions table.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROD_PROJECT = "uvzfhksyjqadkxypcocq";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function letterFor(question) {
  if (question.correct_letter) return String(question.correct_letter).toUpperCase();
  if (typeof question.correct_answer === "number") return LETTERS[question.correct_answer] || "";
  return String(question.correct_answer || "").toUpperCase();
}

function toRow(question) {
  const difficulty = question.difficulty === "easy" ? 1 : question.difficulty === "hard" ? 3 : 2;
  return {
    domain: question.domain,
    topic: question.topic,
    subtopic: question.subtopic || null,
    difficulty,
    cognitive_level: "recall",
    question_type: "mc",
    question_text: question.question_text,
    options: question.options,
    correct_answer: letterFor(question),
    explanation: question.explanation || null,
    textbook_reference: question.textbook_reference || null,
    exam_track: question.exam_track || "2027",
  };
}

function summarize(questions) {
  const byDomain = {};
  const proposed = questions.filter((question) => question.domain_mapping_status === "proposed").length;
  for (const question of questions) byDomain[question.domain] = (byDomain[question.domain] || 0) + 1;
  return { total: questions.length, byDomain, proposed };
}

async function existingTexts(supabase) {
  const texts = new Set();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("questions")
      .select("question_text")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    for (const row of data || []) texts.add(row.question_text);
    if (!data || data.length < pageSize) break;
  }
  return texts;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const questions = JSON.parse(readFileSync(join(root, "question-bank-canonical-2027-11-16.json"), "utf8"));
  const rows = questions.map(toRow);
  const summary = summarize(questions);
  console.log(apply ? "APPLY" : "DRY RUN");
  console.log(JSON.stringify(summary));
  console.log("Krause domain tags in this file are a proposal. David has not confirmed them.");

  if (!apply) {
    console.log("No database connection. Re-run with --apply when Sean is ready to import.");
    return;
  }

  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The key is not printed.");
    process.exit(2);
  }
  if (url.includes(PROD_PROJECT) && process.env.ALLOW_PROD_SUPABASE !== "yes") {
    console.error(`Refusing to write to the production Supabase project ${PROD_PROJECT}.`);
    console.error("Sean can set ALLOW_PROD_SUPABASE=yes when he wants this import on production.");
    process.exit(2);
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(url, key);
  const already = await existingTexts(supabase);
  const fresh = rows.filter((row) => !already.has(row.question_text));
  const skipped = rows.length - fresh.length;
  console.log(`Already present: ${skipped}. To insert: ${fresh.length}.`);

  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < fresh.length; i += batchSize) {
    const batch = fresh.slice(i, i + batchSize);
    const { error } = await supabase.from("questions").insert(batch);
    if (error) {
      console.error(`Batch starting at ${i} failed: ${error.message}`);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${fresh.length}`);
  }
  console.log(`Done. Inserted ${inserted}. Skipped ${skipped} existing question texts.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
