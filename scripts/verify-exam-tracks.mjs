#!/usr/bin/env node
/**
 * Check the track split against the JSON banks. Does not connect to Supabase.
 *
 *   node scripts/verify-exam-tracks.mjs
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  questionVisibleOnTrack,
  fullExamPlan,
  resolveStudentTrack,
  DOMAIN_DISTRIBUTION,
} = require("../netlify/functions/utils/exam-track.js");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bank2026 = JSON.parse(readFileSync(join(root, "question-bank-canonical-2026-04-08.json"), "utf8"))
  .map((question) => ({ ...question, exam_track: "2026" }));
const bank2027 = JSON.parse(readFileSync(join(root, "question-bank-canonical-2027-11-16.json"), "utf8"));

function counts(questions) {
  const by = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const question of questions) by[question.domain] = (by[question.domain] || 0) + 1;
  return by;
}

function visible(questions, track) {
  return questions.filter((question) => questionVisibleOnTrack(question.exam_track, track));
}

const combined = [...bank2026, ...bank2027];
const seenBy2026 = visible(combined, "2026");
const seenBy2027 = visible(combined, "2027");
const failures = [];

if (seenBy2026.some((question) => question.exam_track === "2027")) {
  failures.push("A 2026 student can see a 2027-only question.");
}
if (seenBy2027.some((question) => question.exam_track === "2026")) {
  failures.push("A 2027 student can see a 2026-only question.");
}
if (seenBy2026.length !== bank2026.length) failures.push("2026 visibility count does not match the 2026 bank.");
if (seenBy2027.length !== bank2027.length) failures.push("2027 visibility count does not match the 2027 bank.");

const bothProbe = { exam_track: "both", domain: 1 };
if (!questionVisibleOnTrack(bothProbe.exam_track, "2026") || !questionVisibleOnTrack(bothProbe.exam_track, "2027")) {
  failures.push("A both-tagged question is hidden from one track.");
}

const plan2026 = fullExamPlan(counts(seenBy2026));
const plan2027 = fullExamPlan(counts(seenBy2027));
if (!plan2026.ok) failures.push("The 2026 bank cannot fill a 151-question NANP exam.");
if (plan2027.ok) failures.push("The 2027 bank unexpectedly fills every NANP domain target.");

const student2026 = resolveStudentTrack({ target_exam_date: "2026-12-15" }, { today: "2026-11-16" });
const student2027 = resolveStudentTrack({ target_exam_date: "2027-02-01" }, { today: "2026-11-16" });
if (student2026.track !== "2026" || student2027.track !== "2027") {
  failures.push("Exam dates did not resolve to the expected tracks.");
}

const normalized = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
const oldTexts = new Set(bank2026.map((question) => normalized(question.question_text)));
const overlaps = bank2027.filter((question) => oldTexts.has(normalized(question.question_text)));

const proposed = bank2027.filter((question) => question.domain_mapping_status === "proposed").length;
const labeled = bank2027.filter((question) => question.domain_mapping_status === "labeled_in_source_file").length;

console.log("2026 bank by domain", counts(bank2026), "total", bank2026.length);
console.log("2027 bank by domain", counts(bank2027), "total", bank2027.length);
console.log("2027 labeled in David's file", labeled, "; Krause proposed domain tags", proposed);
console.log("2026 full exam", plan2026.ok ? `ready (${Object.values(DOMAIN_DISTRIBUTION).reduce((a, b) => a + b, 0)})` : plan2026.shortfall);
console.log("2027 full exam shortfall", plan2027.shortfall);
console.log("Exact stem overlaps between the banks", overlaps.length);
console.log("Sample profiles", student2026.label, "|", student2027.label);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Track filter checks passed.");
