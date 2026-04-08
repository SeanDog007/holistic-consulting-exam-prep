#!/usr/bin/env node
/**
 * generate-review-system.mjs
 * 
 * Generates the full-bank manual review tracking system:
 * 1. master-review-tracker.json — per-question review status for all 836 questions
 * 2. Batch markdown files in review/batches/ — reviewer-ready checklists grouped by exam_source
 * 3. review-dashboard.md — summary dashboard
 * 
 * Run: node review/generate-review-system.mjs
 * Re-run is safe — it will NOT overwrite existing review decisions in the tracker.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load question bank
const questions = JSON.parse(readFileSync(join(ROOT, 'circle-questions-export.json'), 'utf-8'));
console.log(`Loaded ${questions.length} questions from canonical bank.`);

// Load existing tracker if present (preserve prior decisions)
const trackerPath = join(ROOT, 'review', 'master-review-tracker.json');
let existingTracker = {};
if (existsSync(trackerPath)) {
  const existing = JSON.parse(readFileSync(trackerPath, 'utf-8'));
  existing.questions.forEach(q => { existingTracker[q.index] = q; });
  console.log(`Loaded existing tracker with ${Object.keys(existingTracker).length} entries — will preserve decisions.`);
}

// Load factual-review-tracker.csv for previously reviewed items
const csvPath = join(ROOT, 'factual-review-tracker.csv');
const csvReviewed = new Set();
if (existsSync(csvPath)) {
  const csvLines = readFileSync(csvPath, 'utf-8').split('\n').slice(1);
  csvLines.forEach(line => {
    const match = line.match(/^Q(\d+),/);
    if (match) csvReviewed.add(parseInt(match[1]));
  });
  console.log(`Found ${csvReviewed.size} questions with prior factual review records.`);
}

// Build tracker entries
const trackerEntries = questions.map((q, idx) => {
  // Check if this question was already reviewed in prior pass
  const existing = existingTracker[idx];
  if (existing && existing.status !== 'pending') {
    return existing; // Preserve prior decisions
  }

  // Determine prior review status from CSV
  // CSV uses question IDs like Q0, Q10 etc — we need to figure out mapping
  // The CSV Q numbers appear to be original IDs, not array indices
  // For now, mark all as pending — reviewer will work through batches

  return {
    index: idx,
    domain: q.domain,
    topic: q.topic,
    exam_source: q.exam_source,
    question_type: q.question_type,
    question_preview: q.question_text.substring(0, 80) + (q.question_text.length > 80 ? '...' : ''),
    status: 'pending',       // pending | reviewed | approved | revised | flagged
    reviewer: null,          // who reviewed (e.g. "Sean", "Betsy", "Dwight")
    review_date: null,       // ISO date string
    notes: null,             // free-text notes
    issues_found: null,      // null or description of issues
    fix_applied: null,       // null or description of fix
    confidence: null         // high | moderate | low
  };
});

// Write master tracker
const tracker = {
  generated: new Date().toISOString(),
  canonical_source: 'question-bank-canonical-2026-04-08.json',
  total_questions: trackerEntries.length,
  schema_version: 1,
  status_legend: {
    pending: 'Not yet reviewed',
    reviewed: 'Reviewed — no issues found, awaiting final approval',
    approved: 'Reviewed and approved — no changes needed',
    revised: 'Reviewed, issue found, fix applied',
    flagged: 'Reviewed, issue found, needs discussion or expert input'
  },
  questions: trackerEntries
};

writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));
console.log(`Wrote master tracker: ${trackerEntries.length} questions`);

// --- Generate batch files ---
const batchDir = join(ROOT, 'review', 'batches');
mkdirSync(batchDir, { recursive: true });

// Group by exam_source (natural batches of 20-50 questions)
const batches = {};
trackerEntries.forEach((entry, idx) => {
  const key = entry.exam_source;
  if (!batches[key]) batches[key] = [];
  batches[key].push({ ...entry, fullQuestion: questions[idx] });
});

const batchNames = Object.keys(batches).sort((a, b) => {
  // Sort: Domain 1 Exam 1, Domain 1 Exam 2, ..., Full Length Comprehensive Exam
  const da = a.match(/Domain (\d+) Exam (\d+)/);
  const db = b.match(/Domain (\d+) Exam (\d+)/);
  if (da && db) return (da[1]*10 + +da[2]) - (db[1]*10 + +db[2]);
  if (da) return -1;
  if (db) return 1;
  return a.localeCompare(b);
});

let batchSummary = [];

batchNames.forEach((batchName, batchIdx) => {
  const items = batches[batchName];
  const slug = batchName.toLowerCase().replace(/\s+/g, '-');
  const filename = `batch-${String(batchIdx + 1).padStart(2, '0')}-${slug}.md`;

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const approvedCount = items.filter(i => i.status === 'approved' || i.status === 'reviewed').length;
  const revisedCount = items.filter(i => i.status === 'revised').length;
  const flaggedCount = items.filter(i => i.status === 'flagged').length;

  batchSummary.push({
    batch: batchIdx + 1,
    name: batchName,
    file: filename,
    total: items.length,
    pending: pendingCount,
    approved: approvedCount,
    revised: revisedCount,
    flagged: flaggedCount
  });

  let md = `# Review Batch ${batchIdx + 1}: ${batchName}\n\n`;
  md += `**Domain:** ${items[0].domain} | **Topic:** ${items[0].topic} | **Questions:** ${items.length}\n\n`;
  md += `## Status Summary\n`;
  md += `- ⬜ Pending: ${pendingCount}\n`;
  md += `- ✅ Approved: ${approvedCount}\n`;
  md += `- 🔧 Revised: ${revisedCount}\n`;
  md += `- 🚩 Flagged: ${flaggedCount}\n\n`;
  md += `## Instructions\n`;
  md += `For each question:\n`;
  md += `1. Read the question, all options, and the marked correct answer\n`;
  md += `2. Verify the correct answer is actually correct\n`;
  md += `3. Check all distractors are actually wrong\n`;
  md += `4. Check for ambiguity, typos, duplicate options\n`;
  md += `5. Mark status: ✅ APPROVED, 🔧 REVISED (describe fix), or 🚩 FLAGGED (describe issue)\n\n`;
  md += `---\n\n`;

  items.forEach((item, i) => {
    const q = item.fullQuestion;
    const answerLetter = ['A', 'B', 'C', 'D'][q.correct_answer];
    const answerText = q.options[q.correct_answer] || '???';

    md += `### Q${i + 1} (Bank Index: ${item.index}) — ${item.status === 'pending' ? '⬜' : item.status === 'approved' ? '✅' : item.status === 'revised' ? '🔧' : item.status === 'flagged' ? '🚩' : '📋'}\n\n`;
    md += `**${q.question_text}**\n\n`;
    q.options.forEach((opt, oi) => {
      const marker = oi === q.correct_answer ? ' ✅' : '';
      md += `- ${['A', 'B', 'C', 'D'][oi]}. ${opt}${marker}\n`;
    });
    md += `\n**Correct Answer:** ${answerLetter}. ${answerText}\n`;
    md += `**Type:** ${q.question_type} | **Difficulty:** ${q.difficulty}\n\n`;
    md += `**Review Status:** ${item.status}\n`;
    md += `**Reviewer:** ________________  **Date:** ________________\n`;
    md += `**Notes:** ________________\n\n`;
    md += `---\n\n`;
  });

  writeFileSync(join(batchDir, filename), md);
});

console.log(`Generated ${batchNames.length} batch files in review/batches/`);

// --- Generate dashboard ---
const totalPending = trackerEntries.filter(e => e.status === 'pending').length;
const totalApproved = trackerEntries.filter(e => e.status === 'approved' || e.status === 'reviewed').length;
const totalRevised = trackerEntries.filter(e => e.status === 'revised').length;
const totalFlagged = trackerEntries.filter(e => e.status === 'flagged').length;

let dashboard = `# HCQ Exam Prep — Full Bank Review Dashboard\n\n`;
dashboard += `**Generated:** ${new Date().toISOString()}\n`;
dashboard += `**Canonical Source:** question-bank-canonical-2026-04-08.json\n`;
dashboard += `**Total Questions:** ${trackerEntries.length}\n\n`;
dashboard += `## Overall Progress\n\n`;
dashboard += `| Status | Count | % |\n`;
dashboard += `|--------|-------|---|\n`;
dashboard += `| ⬜ Pending | ${totalPending} | ${(totalPending/trackerEntries.length*100).toFixed(1)}% |\n`;
dashboard += `| ✅ Approved | ${totalApproved} | ${(totalApproved/trackerEntries.length*100).toFixed(1)}% |\n`;
dashboard += `| 🔧 Revised | ${totalRevised} | ${(totalRevised/trackerEntries.length*100).toFixed(1)}% |\n`;
dashboard += `| 🚩 Flagged | ${totalFlagged} | ${(totalFlagged/trackerEntries.length*100).toFixed(1)}% |\n\n`;

const pct = ((totalApproved + totalRevised) / trackerEntries.length * 100).toFixed(1);
dashboard += `**Completion:** ${pct}% (${totalApproved + totalRevised}/${trackerEntries.length})\n\n`;

dashboard += `## Batch Breakdown\n\n`;
dashboard += `| # | Batch | Total | ⬜ | ✅ | 🔧 | 🚩 | File |\n`;
dashboard += `|---|-------|-------|----|----|----|----|----- |\n`;
batchSummary.forEach(b => {
  dashboard += `| ${b.batch} | ${b.name} | ${b.total} | ${b.pending} | ${b.approved} | ${b.revised} | ${b.flagged} | \`batches/${b.file}\` |\n`;
});

dashboard += `\n## Domain Summary\n\n`;
[1,2,3,4,5].forEach(d => {
  const domItems = trackerEntries.filter(e => e.domain === d);
  const dp = domItems.filter(e => e.status === 'pending').length;
  const da = domItems.filter(e => e.status === 'approved' || e.status === 'reviewed').length;
  dashboard += `- **Domain ${d}:** ${domItems.length} questions — ${dp} pending, ${da} approved\n`;
});

dashboard += `\n## Review Workflow\n\n`;
dashboard += `### How to Review\n`;
dashboard += `1. Open a batch file from \`review/batches/\`\n`;
dashboard += `2. Work through each question — verify correct answer, check distractors, check for ambiguity\n`;
dashboard += `3. Mark each question: ✅ APPROVED, 🔧 REVISED, or 🚩 FLAGGED\n`;
dashboard += `4. After completing a batch, run \`node review/update-tracker.mjs <batch-file>\` to sync decisions back to tracker\n`;
dashboard += `5. Re-run \`node review/generate-review-system.mjs\` to refresh dashboard\n\n`;
dashboard += `### Recommended Review Order\n`;
dashboard += `1. Start with Domain 5 (smallest — 66 questions, 3 batches) to warm up\n`;
dashboard += `2. Then Domain 3 (112 questions, 3 batches)\n`;
dashboard += `3. Then Domain 2 (192 questions, 5 batches)\n`;
dashboard += `4. Then Domain 4 (175 questions, 3 batches)\n`;
dashboard += `5. Then Domain 1 (291 questions, 6 batches)\n`;
dashboard += `6. Finally: Full Length Comprehensive Exam (115 questions, 1 batch)\n\n`;
dashboard += `### Status Definitions\n`;
dashboard += `- **⬜ Pending** — Not yet reviewed\n`;
dashboard += `- **✅ Approved** — Reviewed, correct, no changes needed\n`;
dashboard += `- **🔧 Revised** — Issue found, fix applied\n`;
dashboard += `- **🚩 Flagged** — Issue found, needs discussion or expert input\n`;

writeFileSync(join(ROOT, 'review', 'review-dashboard.md'), dashboard);
console.log('Wrote review-dashboard.md');

// Summary
console.log('\n=== REVIEW SYSTEM GENERATED ===');
console.log(`Total questions: ${trackerEntries.length}`);
console.log(`Batches: ${batchNames.length}`);
console.log(`Pending: ${totalPending}`);
console.log(`Already reviewed: ${totalApproved + totalRevised + totalFlagged}`);
batchSummary.forEach(b => console.log(`  Batch ${b.batch}: ${b.name} (${b.total} questions)`));
