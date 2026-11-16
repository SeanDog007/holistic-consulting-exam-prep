#!/usr/bin/env node
/**
 * Apply David's completed review CSV to the question bank.
 *
 * Dry-run is the default. It does not connect to Supabase.
 *
 *   node scripts/apply-david-review.mjs
 *   node scripts/apply-david-review.mjs --file review/2026-questions-presort-for-david.csv --apply
 *
 * David_decision:
 *   Keep  → exam_track 'both' (shown on 2026 and 2027)
 *   Edit  → exam_track 'both', and apply question, options, correct, explanation,
 *           or textbook_reference when David changed them
 *   Retire → exam_track stays '2026'
 *   blank → skip
 *
 * Rows are matched by the original question text in review/2026-question-id-map.json,
 * so an edited question cell still finds the database row.
 *
 * --apply uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * It refuses production (uvzfhksyjqadkxypcocq) unless ALLOW_PROD_SUPABASE=yes.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROD_PROJECT = "uvzfhksyjqadkxypcocq";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((values) => {
    const record = {};
    header.forEach((name, index) => {
      record[name] = values[index] || "";
    });
    return record;
  });
}

function decisionOf(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "keep") return "keep";
  if (text === "edit") return "edit";
  if (text === "retire") return "retire";
  return "";
}

function optionsFrom(record) {
  return ["option_a", "option_b", "option_c", "option_d"]
    .map((key) => record[key] || "")
    .filter((value, index, all) => value || all.slice(index + 1).some(Boolean));
}

function sameList(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function buildUpdate(record, original) {
  const decision = decisionOf(record.David_decision);
  if (!decision) return null;
  if (decision === "retire") return { exam_track: "2026", decision };
  const update = { exam_track: "both", decision };
  if (decision === "edit") {
    if (record.question && record.question !== original.question_text) update.question_text = record.question;
    const options = optionsFrom(record).filter(Boolean);
    if (options.length >= 2 && !sameList(options, original.options || [])) update.options = options;
    const correct = String(record.correct || "").trim().toUpperCase();
    if (correct && LETTERS.includes(correct) && correct !== original.correct) update.correct_answer = correct;
    if (record.explanation && record.explanation.trim()) update.explanation = record.explanation.trim();
    const reference = record.current_textbook_reference || "";
    if (reference && !reference.startsWith("Not stored on the canonical JSON row")) {
      update.textbook_reference = reference;
    }
  }
  return update;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const fileFlag = process.argv.indexOf("--file");
  const csvPath = fileFlag >= 0
    ? process.argv[fileFlag + 1]
    : join(root, "review/2026-questions-presort-for-david.csv");
  const records = parseCsv(readFileSync(csvPath, "utf8"));
  const idMap = JSON.parse(readFileSync(join(root, "review/2026-question-id-map.json"), "utf8"));
  const byId = new Map(idMap.map((row) => [row.id, row]));

  const planned = [];
  const unknown = [];
  let blank = 0;
  for (const record of records) {
    const decision = decisionOf(record.David_decision);
    if (!decision) {
      blank += 1;
      continue;
    }
    const original = byId.get(record.id);
    if (!original) {
      unknown.push(record.id || "(missing id)");
      continue;
    }
    planned.push({ id: record.id, original, update: buildUpdate(record, original) });
  }

  const counts = { keep: 0, edit: 0, retire: 0 };
  for (const item of planned) counts[item.update.decision] += 1;
  console.log(apply ? "APPLY" : "DRY RUN");
  console.log(JSON.stringify({ rows: records.length, blank, unknown: unknown.length, ...counts }));
  if (unknown.length) console.log("Unknown ids:", unknown.slice(0, 10).join(", "));

  if (!apply) {
    console.log("No database connection. Re-run with --apply after David fills David_decision.");
    return;
  }
  if (planned.length === 0) {
    console.log("Nothing to apply.");
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
    console.error("Sean can set ALLOW_PROD_SUPABASE=yes when he wants this update on production.");
    process.exit(2);
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(url, key);
  let updated = 0;
  let missing = 0;
  for (const item of planned) {
    const { data: found, error: findError } = await supabase
      .from("questions")
      .select("id")
      .eq("question_text", item.original.question_text);
    if (findError) {
      console.error(findError.message);
      process.exit(1);
    }
    if (!found || found.length !== 1) {
      missing += 1;
      console.log(`Skip ${item.id}: found ${found ? found.length : 0} rows for the original question text.`);
      continue;
    }
    const { decision, ...patch } = item.update;
    const { error } = await supabase.from("questions").update(patch).eq("id", found[0].id);
    if (error) {
      console.error(`${item.id}: ${error.message}`);
      process.exit(1);
    }
    updated += 1;
  }
  console.log(`Updated ${updated}. Skipped ${missing} that did not match exactly one row.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
