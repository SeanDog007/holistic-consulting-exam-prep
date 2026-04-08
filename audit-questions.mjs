#!/usr/bin/env node
/**
 * Question Bank Audit Script
 * ==========================
 * First-pass automated QA for the HCQ Exam Prep question bank.
 * Checks structural integrity, detects suspicious patterns, finds
 * duplicates, and flags content that needs human review.
 *
 * Usage:
 *   node audit-questions.mjs                    # Run full audit
 *   node audit-questions.mjs --json             # Output JSON report
 *   node audit-questions.mjs --category dupes   # Run single category
 *
 * Categories: structural, dupes, content, answer-key, format
 */

import { readFile, writeFile } from 'fs/promises';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const categoryFilter = args.includes('--category') ? args[args.indexOf('--category') + 1] : null;

const questions = JSON.parse(await readFile('circle-questions-export.json', 'utf8'));

const issues = [];

function flag(category, severity, questionIndex, message, detail = null) {
  issues.push({ category, severity, questionIndex, message, detail });
}

// ============================================================
// 1. STRUCTURAL CHECKS
// ============================================================
function runStructuralChecks() {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Missing or empty question text
    if (!q.question_text || q.question_text.trim().length < 10) {
      flag('structural', 'error', i, 'Question text is missing or too short', q.question_text);
    }

    // No options or too few
    if (!q.options || q.options.length < 2) {
      flag('structural', 'error', i, `Only ${q.options?.length ?? 0} options`, q.question_text);
    }

    // correct_answer out of bounds
    if (typeof q.correct_answer === 'number' && q.correct_answer >= (q.options?.length ?? 0)) {
      flag('structural', 'error', i, `correct_answer=${q.correct_answer} but only ${q.options?.length} options`, q.question_text);
    }

    // Empty options
    if (q.options) {
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j] || q.options[j].trim() === '') {
          flag('structural', 'error', i, `Option ${j} is empty`, q.question_text);
        }
      }
    }

    // Domain 0 (unassigned)
    if (q.domain === 0) {
      flag('structural', 'warning', i, 'Domain is 0 (unassigned)', q.question_text?.substring(0, 80));
    }

    // Only 2 options (likely True/False masquerading as MC)
    if (q.options?.length === 2) {
      const opts = q.options.map(o => o.toLowerCase().trim());
      const isTF = (opts.includes('true') && opts.includes('false'));
      flag('structural', 'info', i,
        isTF ? 'True/False question stored as MC' : 'Only 2 options (binary question)',
        `Options: ${q.options.join(' | ')}`
      );
    }
  }
}

// ============================================================
// 2. DUPLICATE / NEAR-DUPLICATE DETECTION
// ============================================================
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function jaccard(a, b) {
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function runDuplicateChecks() {
  const normalized = questions.map((q, i) => ({ i, text: normalize(q.question_text || '') }));

  // Exact duplicates
  const seen = new Map();
  for (const { i, text } of normalized) {
    if (seen.has(text)) {
      flag('dupes', 'error', i, `Exact duplicate of question ${seen.get(text)}`,
        questions[i].question_text?.substring(0, 100));
    } else {
      seen.set(text, i);
    }
  }

  // Near-duplicates (Jaccard > 0.8, different questions)
  // Only check within same domain to keep O(n²) manageable
  const byDomain = {};
  for (const item of normalized) {
    const d = questions[item.i].domain;
    (byDomain[d] = byDomain[d] || []).push(item);
  }

  for (const domain of Object.keys(byDomain)) {
    const group = byDomain[domain];
    for (let a = 0; a < group.length; a++) {
      for (let b = a + 1; b < group.length; b++) {
        const sim = jaccard(group[a].text, group[b].text);
        if (sim > 0.8 && group[a].text !== group[b].text) {
          flag('dupes', 'warning', group[b].i,
            `Near-duplicate of Q${group[a].i} (similarity: ${(sim * 100).toFixed(0)}%)`,
            `A: ${questions[group[a].i].question_text?.substring(0, 80)}\nB: ${questions[group[b].i].question_text?.substring(0, 80)}`
          );
        }
      }
    }
  }

  // Same correct answer text appearing in different questions with different answer keys
  // (catches copy-paste errors)
}

// ============================================================
// 3. CONTENT / SELF-CONTRADICTION CHECKS
// ============================================================
function runContentChecks() {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qText = (q.question_text || '').toLowerCase();
    const correctIdx = q.correct_answer;
    const correctText = (q.options?.[correctIdx] || '').toLowerCase();

    // "NOT" / "false" / "except" questions — high-risk for answer key errors
    const negativePatterns = [
      /which .* is (?:not|false)/i,
      /which .* (?:is not|are not|isn't|aren't)/i,
      /all .* except/i,
      /which .* incorrect/i,
      /which .* false/i,
      /none of the (?:above|following)/i,
    ];
    const isNegativeQ = negativePatterns.some(p => p.test(q.question_text || ''));
    if (isNegativeQ) {
      flag('content', 'review', i, 'Negative/exception question — high-risk for answer key errors',
        q.question_text?.substring(0, 100));
    }

    // "All of the above" as an option
    if (q.options?.some(o => /all of the above/i.test(o))) {
      flag('content', 'review', i, '"All of the above" option present — verify carefully',
        `Correct: option ${correctIdx}`);
    }

    // "None of the above" as an option
    if (q.options?.some(o => /none of the above/i.test(o))) {
      flag('content', 'review', i, '"None of the above" option present — verify carefully',
        `Correct: option ${correctIdx}`);
    }

    // Correct answer says "true" for a "which is FALSE" question (or vice versa)
    if (/which .* (?:is false|are false|is not true)/i.test(q.question_text || '')) {
      if (/^true$/i.test(correctText.trim())) {
        flag('content', 'error', i, 'Correct answer is "True" for a "which is false" question',
          q.question_text?.substring(0, 100));
      }
    }

    // Duplicate options within the same question
    const optNorm = (q.options || []).map(o => o.toLowerCase().trim());
    const optSet = new Set(optNorm);
    if (optSet.size < optNorm.length) {
      flag('content', 'error', i, 'Duplicate options within the same question',
        `Options: ${q.options.join(' | ')}`);
    }

    // Very short options (possibly incomplete)
    if (q.options?.some(o => o.trim().length < 2)) {
      flag('content', 'warning', i, 'Very short option (< 2 chars)',
        `Options: ${q.options.join(' | ')}`);
    }

    // Question text contains the answer verbatim (giveaway)
    if (correctText.length > 15 && qText.includes(correctText)) {
      flag('content', 'warning', i, 'Correct answer text appears verbatim in question',
        `Answer: "${q.options[correctIdx]}"`);
    }

    // Check for "hepatic portal" type errors — answer mentions organ/system that contradicts question
    // Generic: question asks about X, correct answer says Y where Y is a known contradiction
    // This is hard to automate perfectly, but we can flag anatomy-related questions for review
    const anatomyTerms = ['hepatic', 'portal', 'renal', 'cardiac', 'pulmonary', 'gastric', 'intestinal', 'pancreatic', 'splenic', 'biliary'];
    if (anatomyTerms.some(t => qText.includes(t))) {
      flag('content', 'review', i, 'Anatomy-related question — manual accuracy review recommended',
        q.question_text?.substring(0, 100));
    }
  }
}

// ============================================================
// 4. ANSWER KEY DISTRIBUTION CHECKS
// ============================================================
function runAnswerKeyChecks() {
  // Check if answer key is suspiciously skewed
  const answerDist = {};
  for (const q of questions) {
    const k = q.correct_answer;
    answerDist[k] = (answerDist[k] || 0) + 1;
  }

  const total = questions.length;
  for (const [key, count] of Object.entries(answerDist)) {
    const pct = (count / total * 100).toFixed(1);
    if (count / total > 0.5) {
      flag('answer-key', 'warning', -1, `Answer key "${key}" appears ${pct}% of the time (${count}/${total}) — suspicious skew`);
    }
  }

  // Check for long runs of same answer within an exam_source
  const byExam = {};
  for (let i = 0; i < questions.length; i++) {
    const src = questions[i].exam_source || 'unknown';
    (byExam[src] = byExam[src] || []).push({ i, answer: questions[i].correct_answer });
  }

  for (const [exam, qs] of Object.entries(byExam)) {
    let run = 1;
    for (let j = 1; j < qs.length; j++) {
      if (qs[j].answer === qs[j - 1].answer) {
        run++;
        if (run >= 5) {
          flag('answer-key', 'warning', qs[j].i, `${run} consecutive same answer (${qs[j].answer}) in ${exam}`);
        }
      } else {
        run = 1;
      }
    }
  }

  // Per-exam answer distribution
  for (const [exam, qs] of Object.entries(byExam)) {
    const dist = {};
    for (const q of qs) {
      dist[q.answer] = (dist[q.answer] || 0) + 1;
    }
    const examTotal = qs.length;
    for (const [key, count] of Object.entries(dist)) {
      if (count / examTotal > 0.6 && examTotal > 10) {
        flag('answer-key', 'warning', -1,
          `In "${exam}": answer ${key} is correct ${(count / examTotal * 100).toFixed(0)}% of the time (${count}/${examTotal})`);
      }
    }
  }
}

// ============================================================
// 5. FORMAT / QUALITY CHECKS
// ============================================================
function runFormatChecks() {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const text = q.question_text || '';

    // Missing question mark
    if (!text.includes('?') && !text.includes('___') && !text.includes('…') && !text.includes('...')) {
      flag('format', 'info', i, 'No question mark and no fill-in-the-blank marker',
        text.substring(0, 80));
    }

    // HTML artifacts
    if (/<[^>]+>/.test(text) || q.options?.some(o => /<[^>]+>/.test(o))) {
      flag('format', 'warning', i, 'HTML tags in question or options', text.substring(0, 80));
    }

    // Very long question (> 500 chars)
    if (text.length > 500) {
      flag('format', 'info', i, `Very long question (${text.length} chars)`, text.substring(0, 100));
    }

    // Typo patterns
    if (/\s{2,}/.test(text)) {
      flag('format', 'info', i, 'Double spaces in question text');
    }

    // Options with inconsistent capitalization
    if (q.options?.length > 2) {
      const startsUpper = q.options.filter(o => /^[A-Z]/.test(o.trim())).length;
      const startsLower = q.options.filter(o => /^[a-z]/.test(o.trim())).length;
      if (startsUpper > 0 && startsLower > 0 && Math.min(startsUpper, startsLower) === 1) {
        // One oddball capitalization
        flag('format', 'info', i, 'Inconsistent option capitalization',
          q.options.join(' | '));
      }
    }

    // Trailing/leading whitespace in options
    if (q.options?.some(o => o !== o.trim())) {
      flag('format', 'info', i, 'Option has leading/trailing whitespace');
    }
  }
}

// ============================================================
// RUN AUDIT
// ============================================================
const checks = {
  structural: runStructuralChecks,
  dupes: runDuplicateChecks,
  content: runContentChecks,
  'answer-key': runAnswerKeyChecks,
  format: runFormatChecks,
};

if (categoryFilter && checks[categoryFilter]) {
  checks[categoryFilter]();
} else {
  Object.values(checks).forEach(fn => fn());
}

// ============================================================
// REPORT
// ============================================================
const bySeverity = { error: [], warning: [], review: [], info: [] };
for (const issue of issues) {
  (bySeverity[issue.severity] = bySeverity[issue.severity] || []).push(issue);
}

const byCategory = {};
for (const issue of issues) {
  (byCategory[issue.category] = byCategory[issue.category] || []).push(issue);
}

if (jsonOutput) {
  const report = {
    timestamp: new Date().toISOString(),
    totalQuestions: questions.length,
    totalIssues: issues.length,
    bySeverity: Object.fromEntries(Object.entries(bySeverity).map(([k, v]) => [k, v.length])),
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, v.length])),
    issues,
  };
  await writeFile('audit-report.json', JSON.stringify(report, null, 2));
  console.log(`Report written to audit-report.json (${issues.length} issues)`);
} else {
  console.log('═══════════════════════════════════════════════');
  console.log('  HCQ EXAM PREP — QUESTION BANK AUDIT REPORT');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total questions: ${questions.length}`);
  console.log(`  Domains: ${JSON.stringify(Object.fromEntries(Object.entries(
    questions.reduce((acc, q) => { acc[q.domain] = (acc[q.domain] || 0) + 1; return acc; }, {})
  ).sort(([a], [b]) => a - b)))}`);
  console.log(`  Total issues found: ${issues.length}`);
  console.log('');

  console.log('  SEVERITY SUMMARY:');
  console.log(`    🔴 Errors:   ${bySeverity.error.length}`);
  console.log(`    🟡 Warnings: ${bySeverity.warning.length}`);
  console.log(`    🔍 Review:   ${bySeverity.review?.length || 0}`);
  console.log(`    ℹ️  Info:     ${bySeverity.info.length}`);
  console.log('');

  console.log('  CATEGORY SUMMARY:');
  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(`    ${cat}: ${items.length}`);
  }
  console.log('');

  // Print errors and warnings in detail
  for (const severity of ['error', 'warning', 'review']) {
    const items = bySeverity[severity] || [];
    if (items.length === 0) continue;
    const icon = severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : '🔍';
    console.log(`\n${icon} ${severity.toUpperCase()} ITEMS (${items.length}):`);
    console.log('─'.repeat(50));
    for (const item of items) {
      const qRef = item.questionIndex >= 0 ? `Q${item.questionIndex}` : 'GLOBAL';
      console.log(`  [${qRef}] [${item.category}] ${item.message}`);
      if (item.detail) {
        console.log(`    → ${item.detail.substring(0, 120)}`);
      }
    }
  }

  // Summary of info items (just counts)
  if (bySeverity.info.length > 0) {
    console.log(`\nℹ️  INFO ITEMS (${bySeverity.info.length}) — grouped:`);
    console.log('─'.repeat(50));
    const infoGrouped = {};
    for (const item of bySeverity.info) {
      const key = item.message.replace(/\d+/g, '#');
      (infoGrouped[key] = infoGrouped[key] || []).push(item);
    }
    for (const [msg, items] of Object.entries(infoGrouped)) {
      console.log(`  (${items.length}x) ${msg}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════');
}
