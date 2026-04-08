#!/usr/bin/env node
/**
 * Question Bank Cleanup Script
 * ============================
 * Performs safe, mechanical fixes on the question bank:
 * 1. Removes exact duplicates (keeps first occurrence)
 * 2. Fixes duplicate options within questions
 * 3. Normalizes formatting (trim whitespace, double spaces)
 * 4. Generates review-queue.json for SME review
 * 5. Generates review-status.json for tracking
 *
 * Usage:
 *   node cleanup-questions.mjs              # Dry run (show what would change)
 *   node cleanup-questions.mjs --apply      # Apply changes
 */

import { readFile, writeFile } from 'fs/promises';

const args = process.argv.slice(2);
const apply = args.includes('--apply');

const questions = JSON.parse(await readFile('circle-questions-export.json', 'utf8'));
const originalCount = questions.length;

const log = [];
function logAction(action, idx, detail) {
  log.push({ action, questionIndex: idx, detail });
}

// ============================================================
// 1. REMOVE EXACT DUPLICATES
// ============================================================
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

const seen = new Map();
const duplicateIndices = new Set();

for (let i = 0; i < questions.length; i++) {
  const norm = normalize(questions[i].question_text || '');
  if (seen.has(norm)) {
    duplicateIndices.add(i);
    logAction('remove-duplicate', i, `Exact duplicate of Q${seen.get(norm)}: "${(questions[i].question_text || '').substring(0, 80)}"`);
  } else {
    seen.set(norm, i);
  }
}

// Build cleaned array (without duplicates)
let cleaned = questions.filter((_, i) => !duplicateIndices.has(i));
console.log(`Exact duplicates removed: ${duplicateIndices.size} (${originalCount} → ${cleaned.length})`);

// ============================================================
// 2. FIX DUPLICATE OPTIONS WITHIN QUESTIONS
// ============================================================
// Q172 (post-dedup index will shift): Vitamin A | Vitamin E | Vitamin D | Vitamin E
// Q811: two identical "inhibit bile production" options
// Strategy: Only fix if we can identify the pattern safely.
// For Q172: Options C and D are "Vitamin E" — answer is index 2 (Vitamin D).
//   The duplicate "Vitamin E" at index 3 is clearly wrong. We'll mark it for review
//   but leave it rather than guess. Actually, the correct answer is Vitamin D (idx 2)
//   so having two "Vitamin E" is a distractor error. We can safely deduplicate
//   by noting it but the question still works since the answer is Vitamin D.
//   However, students see two identical options which is broken UX.
//   Safe fix: flag for manual review with a note.
// For Q811: Options 2 and 3 are identical. Answer is 0. Same issue — broken UX.

let dupOptionFixes = 0;
for (let i = 0; i < cleaned.length; i++) {
  const q = cleaned[i];
  if (!q.options) continue;
  
  const optNorm = q.options.map(o => o.toLowerCase().trim());
  const uniqueOpts = new Set(optNorm);
  
  if (uniqueOpts.size < optNorm.length) {
    // Find which options are duplicated
    const counts = {};
    optNorm.forEach((o, j) => {
      counts[o] = counts[o] || [];
      counts[o].push(j);
    });
    
    for (const [opt, indices] of Object.entries(counts)) {
      if (indices.length > 1) {
        // Check if the correct answer is one of the duplicates
        const correctIdx = q.correct_answer;
        const isCorrectDuplicated = indices.includes(correctIdx);
        
        if (!isCorrectDuplicated) {
          // Safe: correct answer is not the duplicated option.
          // Remove the last duplicate occurrence and shift answer if needed.
          const removeIdx = indices[indices.length - 1];
          q.options.splice(removeIdx, 1);
          // Adjust correct_answer if it was after the removed index
          if (q.correct_answer > removeIdx) {
            q.correct_answer--;
          }
          dupOptionFixes++;
          logAction('fix-duplicate-option', i, `Removed duplicate option "${opt}" at index ${removeIdx}. Question: "${q.question_text?.substring(0, 80)}"`);
        } else {
          // Correct answer IS the duplicate — too risky to auto-fix
          logAction('flag-duplicate-option', i, `Duplicate option "${opt}" includes correct answer — needs manual review. Question: "${q.question_text?.substring(0, 80)}"`);
        }
      }
    }
  }
}
console.log(`Duplicate options fixed: ${dupOptionFixes}`);

// ============================================================
// 3. NORMALIZE FORMATTING
// ============================================================
let formatFixes = 0;

for (let i = 0; i < cleaned.length; i++) {
  const q = cleaned[i];
  
  // Trim whitespace in question text
  if (q.question_text && q.question_text !== q.question_text.trim()) {
    q.question_text = q.question_text.trim();
    formatFixes++;
    logAction('format-trim-question', i, 'Trimmed whitespace from question text');
  }
  
  // Fix double spaces in question text
  if (q.question_text && /\s{2,}/.test(q.question_text)) {
    const before = q.question_text;
    q.question_text = q.question_text.replace(/\s{2,}/g, ' ');
    formatFixes++;
    logAction('format-double-space', i, `Fixed double spaces in: "${before.substring(0, 60)}"`);
  }
  
  // Trim whitespace in options
  if (q.options) {
    for (let j = 0; j < q.options.length; j++) {
      if (q.options[j] !== q.options[j].trim()) {
        q.options[j] = q.options[j].trim();
        formatFixes++;
        logAction('format-trim-option', i, `Trimmed whitespace from option ${j}`);
      }
    }
  }
  
  // Remove leading question number artifacts (e.g., "48.\t" or "114.\t")
  if (q.question_text && /^\d+\.\s*\t/.test(q.question_text)) {
    const before = q.question_text;
    q.question_text = q.question_text.replace(/^\d+\.\s*\t/, '');
    formatFixes++;
    logAction('format-remove-number', i, `Removed leading number: "${before.substring(0, 40)}" → "${q.question_text.substring(0, 40)}"`);
  }
}
console.log(`Format fixes applied: ${formatFixes}`);

// ============================================================
// 4. GENERATE REVIEW STATUS TRACKER
// ============================================================
// Create a review-status.json that tracks each question's review state
let existingStatus = {};
try {
  existingStatus = JSON.parse(await readFile('review-status.json', 'utf8'));
} catch {
  // First run, start fresh
}

const reviewStatus = {
  generated: new Date().toISOString(),
  totalQuestions: cleaned.length,
  statusCounts: {},
  questions: {}
};

for (let i = 0; i < cleaned.length; i++) {
  const q = cleaned[i];
  const key = normalize(q.question_text || '');
  
  // Preserve existing status if question was already reviewed
  const existing = existingStatus.questions?.[key];
  
  reviewStatus.questions[key] = {
    index: i,
    questionPreview: (q.question_text || '').substring(0, 100),
    domain: q.domain,
    examSource: q.exam_source,
    status: existing?.status || 'pending',  // pending | reviewed | flagged | approved | rejected
    reviewedBy: existing?.reviewedBy || null,
    reviewedAt: existing?.reviewedAt || null,
    notes: existing?.notes || null,
  };
}

// Count statuses
for (const entry of Object.values(reviewStatus.questions)) {
  reviewStatus.statusCounts[entry.status] = (reviewStatus.statusCounts[entry.status] || 0) + 1;
}

// ============================================================
// 5. GENERATE REVIEW QUEUE (high-risk questions for SME review)
// ============================================================
const reviewQueue = {
  generated: new Date().toISOString(),
  description: 'High-risk questions requiring subject matter expert review. Prioritized by risk level.',
  totalQuestions: cleaned.length,
  queuedForReview: 0,
  categories: {
    'answer-key-risk': {
      description: 'Negative/exception questions where answer key may be inverted',
      questions: []
    },
    'duplicate-options': {
      description: 'Questions that had or still have duplicate answer options',
      questions: []
    },
    'near-duplicates': {
      description: 'Questions very similar to others — may need dedup or differentiation',
      questions: []
    },
    'anatomy-clinical': {
      description: 'Anatomy/clinical questions flagged for factual accuracy review',
      questions: []
    },
    'answer-key-skew': {
      description: 'Long runs of same answer or suspicious distribution patterns',
      questions: []
    },
    'domain-unassigned': {
      description: 'Questions with domain=0 that need classification',
      questions: []
    }
  }
};

// Negative/exception questions
const negativePatterns = [
  /which .* is (?:not|false)/i,
  /which .* (?:is not|are not|isn't|aren't)/i,
  /all .* except/i,
  /which .* incorrect/i,
  /which .* false/i,
  /none of the (?:above|following)/i,
  /not (?:true|well supported|appropriate|a well)/i,
];

for (let i = 0; i < cleaned.length; i++) {
  const q = cleaned[i];
  const qText = q.question_text || '';
  
  // Negative/exception
  if (negativePatterns.some(p => p.test(qText))) {
    reviewQueue.categories['answer-key-risk'].questions.push({
      index: i,
      question: qText.substring(0, 200),
      correctAnswer: q.correct_answer,
      correctOptionText: q.options?.[q.correct_answer] || 'N/A',
      options: q.options,
      domain: q.domain,
      examSource: q.exam_source,
      risk: 'high',
      reason: 'Negative/exception phrasing — verify answer key is correct (not inverted)'
    });
  }
  
  // Anatomy/clinical
  const anatomyTerms = ['hepatic', 'portal', 'renal', 'cardiac', 'pulmonary', 'gastric', 'intestinal', 'pancreatic', 'splenic', 'biliary'];
  if (anatomyTerms.some(t => qText.toLowerCase().includes(t))) {
    reviewQueue.categories['anatomy-clinical'].questions.push({
      index: i,
      question: qText.substring(0, 200),
      correctAnswer: q.correct_answer,
      correctOptionText: q.options?.[q.correct_answer] || 'N/A',
      options: q.options,
      domain: q.domain,
      examSource: q.exam_source,
      risk: 'medium',
      reason: 'Contains anatomy/clinical terms — verify factual accuracy'
    });
  }
  
  // Domain 0
  if (q.domain === 0) {
    reviewQueue.categories['domain-unassigned'].questions.push({
      index: i,
      question: qText.substring(0, 200),
      options: q.options,
      correctAnswer: q.correct_answer,
      examSource: q.exam_source,
      risk: 'low',
      reason: 'Needs domain classification'
    });
  }
}

// Near-duplicates (re-detect on cleaned set)
const cleanedNorm = cleaned.map((q, i) => ({ i, text: normalize(q.question_text || '') }));
const byDomain = {};
for (const item of cleanedNorm) {
  const d = cleaned[item.i].domain;
  (byDomain[d] = byDomain[d] || []).push(item);
}

function jaccard(a, b) {
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

for (const domain of Object.keys(byDomain)) {
  const group = byDomain[domain];
  for (let a = 0; a < group.length; a++) {
    for (let b = a + 1; b < group.length; b++) {
      const sim = jaccard(group[a].text, group[b].text);
      if (sim > 0.8 && group[a].text !== group[b].text) {
        reviewQueue.categories['near-duplicates'].questions.push({
          indexA: group[a].i,
          indexB: group[b].i,
          similarity: Math.round(sim * 100),
          questionA: cleaned[group[a].i].question_text?.substring(0, 120),
          questionB: cleaned[group[b].i].question_text?.substring(0, 120),
          domain: parseInt(domain),
          risk: 'medium',
          reason: 'Near-duplicate — verify if intentionally different or should be merged'
        });
      }
    }
  }
}

// Answer key skew detection on cleaned set
const byExam = {};
for (let i = 0; i < cleaned.length; i++) {
  const src = cleaned[i].exam_source || 'unknown';
  (byExam[src] = byExam[src] || []).push({ i, answer: cleaned[i].correct_answer });
}
for (const [exam, qs] of Object.entries(byExam)) {
  let run = 1;
  for (let j = 1; j < qs.length; j++) {
    if (qs[j].answer === qs[j - 1].answer) {
      run++;
      if (run >= 5) {
        reviewQueue.categories['answer-key-skew'].questions.push({
          index: qs[j].i,
          examSource: exam,
          runLength: run,
          answer: qs[j].answer,
          risk: 'low',
          reason: `${run} consecutive questions with answer=${qs[j].answer} in ${exam}`
        });
      }
    } else {
      run = 1;
    }
  }
}

// Count totals
let totalQueued = 0;
for (const cat of Object.values(reviewQueue.categories)) {
  totalQueued += cat.questions.length;
}
reviewQueue.queuedForReview = totalQueued;

// ============================================================
// OUTPUT
// ============================================================
console.log('\n--- SUMMARY ---');
console.log(`Original questions: ${originalCount}`);
console.log(`After dedup: ${cleaned.length}`);
console.log(`Duplicates removed: ${duplicateIndices.size}`);
console.log(`Duplicate options fixed: ${dupOptionFixes}`);
console.log(`Format fixes: ${formatFixes}`);
console.log(`Review queue items: ${totalQueued}`);
console.log(`  - Answer key risk: ${reviewQueue.categories['answer-key-risk'].questions.length}`);
console.log(`  - Duplicate options: ${reviewQueue.categories['duplicate-options'].questions.length}`);
console.log(`  - Near-duplicates: ${reviewQueue.categories['near-duplicates'].questions.length}`);
console.log(`  - Anatomy/clinical: ${reviewQueue.categories['anatomy-clinical'].questions.length}`);
console.log(`  - Answer key skew: ${reviewQueue.categories['answer-key-skew'].questions.length}`);
console.log(`  - Domain unassigned: ${reviewQueue.categories['domain-unassigned'].questions.length}`);

if (apply) {
  // Backup original
  await writeFile('circle-questions-export.backup.json', 
    JSON.stringify(questions, null, 2));
  console.log('\n✅ Backup saved: circle-questions-export.backup.json');
  
  // Write cleaned questions
  await writeFile('circle-questions-export.json', 
    JSON.stringify(cleaned, null, 2));
  console.log('✅ Cleaned questions saved: circle-questions-export.json');
  
  // Write review status
  await writeFile('review-status.json', 
    JSON.stringify(reviewStatus, null, 2));
  console.log('✅ Review status saved: review-status.json');
  
  // Write review queue
  await writeFile('review-queue.json', 
    JSON.stringify(reviewQueue, null, 2));
  console.log('✅ Review queue saved: review-queue.json');
  
  // Write cleanup log
  await writeFile('cleanup-log.json', 
    JSON.stringify({ timestamp: new Date().toISOString(), actions: log }, null, 2));
  console.log('✅ Cleanup log saved: cleanup-log.json');
  
  console.log('\n🎯 Done! Run `node audit-questions.mjs` to verify improvements.');
} else {
  console.log('\n⚠️  DRY RUN — no changes written. Use --apply to commit changes.');
  console.log('Actions that would be taken:');
  const actionCounts = {};
  for (const entry of log) {
    actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
  }
  for (const [action, count] of Object.entries(actionCounts)) {
    console.log(`  ${action}: ${count}`);
  }
}
