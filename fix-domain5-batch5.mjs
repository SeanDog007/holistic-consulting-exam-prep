#!/usr/bin/env node
/**
 * Domain 5 Batch 5 Fixes — Final batch from Ryan's review
 * Applies: 3 typo/grammar, 2 placeholder removals, 1 wording consistency fix
 * This is the LAST batch — completes the full 836-question review cycle.
 */
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const CANONICAL = './question-bank-canonical-2026-04-08.json';
const SOURCE = './circle-questions-export.json';

const bank = JSON.parse(readFileSync(CANONICAL, 'utf8'));
const source = JSON.parse(readFileSync(SOURCE, 'utf8'));

const d5Indices = [];
bank.forEach((q, i) => { if (String(q.domain) === '5') d5Indices.push(i); });
console.log(`Domain 5: ${d5Indices.length} questions`);

const d5idx = (qnum) => d5Indices[qnum - 1];

const changelog = [];

function fix(qnum, desc, mutator) {
  const idx = d5idx(qnum);
  const q = bank[idx];
  const before = JSON.stringify(q);
  mutator(q);
  const after = JSON.stringify(q);
  if (before !== after) {
    changelog.push({ d5q: qnum, bankIdx: idx, desc });
    console.log(`  ✅ D5-Q${qnum}: ${desc}`);
  } else {
    console.log(`  ⚠️ D5-Q${qnum}: no change — ${desc}`);
  }
}

console.log('\n📝 TYPOS & GRAMMAR:');

// D5-Q22: "includes book" → "includes books"
fix(22, 'Fix plural: "includes book" → "includes books"', q => {
  q.question_text = q.question_text.replace('includes book,', 'includes books,');
});

// D5-Q23: Remove double verb "includes utilizes" + consolidate awkward phrasing
fix(23, 'Fix double verb + awkward phrasing', q => {
  q.question_text = 'What type of research utilizes secondary sources, such as textbooks and Wikipedia, to make reports?';
});

// D5-Q46: "change" → "chance"
fix(46, 'Fix typo: "change" → "chance"', q => {
  q.question_text = q.question_text.replace('same change of', 'same chance of');
});

console.log('\n📝 STRUCTURAL — PLACEHOLDER REMOVALS:');

// D5-Q58: Remove "Option 3" from T/F question
fix(58, 'Remove placeholder "Option 3" from T/F', q => {
  q.options = q.options.filter(o => o !== 'Option 3');
});

// D5-Q60: Remove "Option 3" from T/F question
fix(60, 'Remove placeholder "Option 3" from T/F', q => {
  q.options = q.options.filter(o => o !== 'Option 3');
});

console.log('\n🟡 WORDING CONSISTENCY:');

// D5-Q51: "Specific principles" → "General principles" (to match Q31)
fix(51, 'Fix inconsistency: "Specific principles" → "General principles" (matches Q31/Toulmin)', q => {
  q.options[1] = q.options[1].replace('Specific principles', 'General principles');
});

// Summary
console.log(`\n📊 Total changes applied: ${changelog.length}`);

// Write updated canonical
writeFileSync(CANONICAL, JSON.stringify(bank, null, 2));
console.log(`✅ Wrote ${CANONICAL}`);

// Sync source bank
try {
  const srcD5 = [];
  source.forEach((q, i) => { if (String(q.domain) === '5') srcD5.push(i); });
  if (srcD5.length === d5Indices.length) {
    for (const c of changelog) {
      const srcIdx = srcD5[c.d5q - 1];
      source[srcIdx] = JSON.parse(JSON.stringify(bank[d5idx(c.d5q)]));
    }
    writeFileSync(SOURCE, JSON.stringify(source, null, 2));
    console.log(`✅ Wrote ${SOURCE} (source bank synced)`);
  } else {
    console.log(`⚠️ Source bank domain 5 count mismatch (${srcD5.length} vs ${d5Indices.length}) — skipping source sync`);
  }
} catch (e) {
  console.log(`⚠️ Source sync error: ${e.message}`);
}

// Also update data.json
writeFileSync('./data.json', JSON.stringify(bank, null, 2));
console.log(`✅ Wrote data.json`);

// Supabase sync
const SUPABASE_URL = 'https://uvzfhksyjqadkxypcocq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.log('\n⚠️ SUPABASE_SERVICE_ROLE_KEY not set — skipping live sync');
  console.log('   Run with env var to sync to Supabase');
} else {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  console.log('\n🔄 Syncing to Supabase...');
  
  let synced = 0, notFound = 0, errs = 0;
  
  for (const c of changelog) {
    const q = bank[d5idx(c.d5q)];
    const searchText = q.question_text.substring(0, 80);
    
    const { data, error } = await sb
      .from('questions')
      .select('id, question_text')
      .eq('domain', 5)
      .ilike('question_text', `${searchText}%`)
      .limit(1);
    
    if (error) { errs++; console.log(`  ❌ D5-Q${c.d5q} fetch: ${error.message}`); continue; }
    if (!data || data.length === 0) { notFound++; console.log(`  ⚠️ D5-Q${c.d5q}: not found in Supabase`); continue; }
    
    const row = data[0];
    const { error: updateErr } = await sb
      .from('questions')
      .update({
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
      })
      .eq('id', row.id);
    
    if (updateErr) { errs++; console.log(`  ❌ D5-Q${c.d5q}: ${updateErr.message}`); }
    else { synced++; console.log(`  ✅ D5-Q${c.d5q}: synced to Supabase (id=${row.id})`); }
  }
  
  console.log(`\n📊 Supabase sync: ${synced} updated, ${notFound} not found, ${errs} errors`);
}

// Write changelog
writeFileSync('./review/batch5-changelog.json', JSON.stringify(changelog, null, 2));
console.log('✅ Wrote review/batch5-changelog.json');

console.log('\n🎉 Domain 5 — FINAL BATCH COMPLETE');
console.log('   Full 836-question review cycle is now fully patched.');
