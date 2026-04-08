#!/usr/bin/env node
/**
 * update-tracker.mjs
 * 
 * Update master-review-tracker.json from reviewed batch files or direct CLI input.
 * 
 * Usage:
 *   # Mark a single question by bank index:
 *   node review/update-tracker.mjs --index 42 --status approved --reviewer Sean --notes "Looks good"
 * 
 *   # Mark a range:
 *   node review/update-tracker.mjs --range 0-37 --status approved --reviewer Sean
 * 
 *   # Mark an entire batch:
 *   node review/update-tracker.mjs --batch 1 --status approved --reviewer Sean
 * 
 *   # Flag a question:
 *   node review/update-tracker.mjs --index 105 --status flagged --reviewer Sean --notes "Answer might be wrong — check source"
 * 
 *   # Mark as revised with fix description:
 *   node review/update-tracker.mjs --index 105 --status revised --reviewer Dwight --fix "Changed answer from B to C"
 * 
 *   # Show progress summary:
 *   node review/update-tracker.mjs --summary
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const trackerPath = join(ROOT, 'review', 'master-review-tracker.json');

// Parse args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}
const hasFlag = (name) => args.includes('--' + name);

// Load tracker
if (!existsSync(trackerPath)) {
  console.error('Tracker not found. Run generate-review-system.mjs first.');
  process.exit(1);
}
const tracker = JSON.parse(readFileSync(trackerPath, 'utf-8'));

// Summary mode
if (hasFlag('summary')) {
  const counts = { pending: 0, reviewed: 0, approved: 0, revised: 0, flagged: 0 };
  tracker.questions.forEach(q => { counts[q.status] = (counts[q.status] || 0) + 1; });
  const done = counts.approved + counts.reviewed + counts.revised;
  console.log(`\n📊 Review Progress: ${done}/${tracker.total_questions} (${(done/tracker.total_questions*100).toFixed(1)}%)`);
  console.log(`  ⬜ Pending:  ${counts.pending}`);
  console.log(`  ✅ Approved: ${counts.approved + counts.reviewed}`);
  console.log(`  🔧 Revised:  ${counts.revised}`);
  console.log(`  🚩 Flagged:  ${counts.flagged}`);
  
  // Per-domain
  console.log('\nPer Domain:');
  [1,2,3,4,5].forEach(d => {
    const dq = tracker.questions.filter(q => q.domain === d);
    const ddone = dq.filter(q => ['approved','reviewed','revised'].includes(q.status)).length;
    console.log(`  Domain ${d}: ${ddone}/${dq.length} (${(ddone/dq.length*100).toFixed(1)}%)`);
  });

  // Per batch (derive from exam_source)
  const batchMap = {};
  tracker.questions.forEach(q => {
    if (!batchMap[q.exam_source]) batchMap[q.exam_source] = { total: 0, done: 0 };
    batchMap[q.exam_source].total++;
    if (['approved','reviewed','revised'].includes(q.status)) batchMap[q.exam_source].done++;
  });
  console.log('\nPer Batch:');
  Object.keys(batchMap).sort().forEach(k => {
    const b = batchMap[k];
    const pct = (b.done/b.total*100).toFixed(0);
    const bar = b.done === b.total ? '✅' : b.done > 0 ? '🟡' : '⬜';
    console.log(`  ${bar} ${k}: ${b.done}/${b.total} (${pct}%)`);
  });
  process.exit(0);
}

// Determine indices to update
let indices = [];

if (getArg('index') !== null) {
  indices = [parseInt(getArg('index'))];
} else if (getArg('range') !== null) {
  const [start, end] = getArg('range').split('-').map(Number);
  for (let i = start; i <= end; i++) indices.push(i);
} else if (getArg('batch') !== null) {
  const batchNum = parseInt(getArg('batch'));
  // Read batch files to find which batch number maps to which exam_source
  const batchDir = join(ROOT, 'review', 'batches');
  const files = readdirSync(batchDir).filter(f => f.startsWith('batch-')).sort();
  if (batchNum < 1 || batchNum > files.length) {
    console.error(`Batch ${batchNum} not found. Valid: 1-${files.length}`);
    process.exit(1);
  }
  const batchFile = files[batchNum - 1];
  // Extract exam_source from the batch file content
  const content = readFileSync(join(batchDir, batchFile), 'utf-8');
  const bankIndexMatches = [...content.matchAll(/Bank Index: (\d+)/g)];
  indices = bankIndexMatches.map(m => parseInt(m[1]));
  console.log(`Batch ${batchNum} (${batchFile}): ${indices.length} questions`);
} else {
  console.log('Usage: node review/update-tracker.mjs --index N|--range N-M|--batch N --status STATUS --reviewer NAME [--notes TEXT] [--fix TEXT]');
  console.log('       node review/update-tracker.mjs --summary');
  process.exit(0);
}

const status = getArg('status');
const reviewer = getArg('reviewer');
const notes = getArg('notes');
const fix = getArg('fix');

if (!status || !['approved', 'reviewed', 'revised', 'flagged', 'pending'].includes(status)) {
  console.error('--status required: approved|reviewed|revised|flagged|pending');
  process.exit(1);
}

const now = new Date().toISOString().split('T')[0];
let updated = 0;

indices.forEach(idx => {
  const entry = tracker.questions.find(q => q.index === idx);
  if (!entry) {
    console.warn(`Index ${idx} not found in tracker, skipping.`);
    return;
  }
  entry.status = status;
  entry.reviewer = reviewer || entry.reviewer;
  entry.review_date = now;
  if (notes) entry.notes = notes;
  if (fix) entry.fix_applied = fix;
  if (status === 'approved' || status === 'reviewed') entry.confidence = 'high';
  updated++;
});

tracker.last_updated = new Date().toISOString();
writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));
console.log(`✅ Updated ${updated} questions to status: ${status}`);

// Show quick summary
const counts = { pending: 0, reviewed: 0, approved: 0, revised: 0, flagged: 0 };
tracker.questions.forEach(q => { counts[q.status] = (counts[q.status] || 0) + 1; });
const done = counts.approved + counts.reviewed + counts.revised;
console.log(`📊 Progress: ${done}/${tracker.total_questions} (${(done/tracker.total_questions*100).toFixed(1)}%)`);
