#!/usr/bin/env node
/**
 * Domain 4 Batch 4 Fixes — from Ryan's review
 * Applies: 2 factual errors, 2 ambiguous fixes, 21 typo/grammar fixes
 */
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const CANONICAL = './question-bank-canonical-2026-04-08.json';
const SOURCE = './circle-questions-export.json';

const bank = JSON.parse(readFileSync(CANONICAL, 'utf8'));
const source = JSON.parse(readFileSync(SOURCE, 'utf8'));

// Get domain 4 questions (in order within the canonical bank)
const d4Indices = [];
bank.forEach((q, i) => { if (String(q.domain) === '4') d4Indices.push(i); });
console.log(`Domain 4: ${d4Indices.length} questions`);

// Helper: get bank index for D4-Q# (1-based)
const d4idx = (qnum) => d4Indices[qnum - 1];

const changelog = [];

function fix(qnum, desc, mutator) {
  const idx = d4idx(qnum);
  const q = bank[idx];
  const before = JSON.stringify(q);
  mutator(q);
  const after = JSON.stringify(q);
  if (before !== after) {
    changelog.push({ d4q: qnum, bankIdx: idx, desc });
    console.log(`  ✅ D4-Q${qnum}: ${desc}`);
  } else {
    console.log(`  ⚠️ D4-Q${qnum}: no change — ${desc}`);
  }
}

console.log('\n🔴 FACTUAL ERRORS:');

// D4-Q132: Wrong answer key (2→1) + typo in option 0
fix(132, 'Fix answer key: iron deficiency cause = blood loss (was B12/folate)', q => {
  q.correct_answer = 1;
});
fix(132, 'Fix typo: Execessive → Excessive', q => {
  q.options[0] = q.options[0].replace('Execessive', 'Excessive');
});

// D4-Q173: neuropathy → nephropathy
fix(173, 'Fix terminology: Diabetic neuropathy → Diabetic nephropathy', q => {
  q.options[2] = q.options[2].replace('neuropathy', 'nephropathy');
});

console.log('\n🟡 AMBIGUOUS (resolved with high confidence):');

// D4-Q17: "support infections" → "help fight infections"
fix(17, 'Fix backwards wording: "support infections" → "help fight infections"', q => {
  q.options[1] = q.options[1].replace('can support infections', 'can help fight infections');
});

// D4-Q175: Latin name typos
fix(175, 'Fix Latin: Oenthera biennis → Oenothera biennis', q => {
  q.options[1] = q.options[1].replace('Oenthera biennis', 'Oenothera biennis');
});
fix(175, 'Fix Latin: Leonurus cardiac → Leonurus cardiaca', q => {
  q.options[2] = q.options[2].replace('Leonurus cardiac', 'Leonurus cardiaca');
});

console.log('\n📝 TYPOS & GRAMMAR:');

fix(7, 'progress → progressive', q => {
  // Find the option or question text containing "progress loss of memory"
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('progress loss of memory', 'progressive loss of memory');
  }
  q.question_text = q.question_text.replace('progress loss of memory', 'progressive loss of memory');
});

fix(9, 'Remove leftover "Option" prefix from Anaphylaxis', q => {
  for (let i = 0; i < q.options.length; i++) {
    if (q.options[i].match(/^Option\s+Anaphylaxis/i)) {
      q.options[i] = 'Anaphylaxis';
    }
  }
});

fix(12, 'Nigh shade → Nightshade', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('Nigh shade', 'Nightshade');
  }
});

fix(16, 'well support for → well supported for', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('well support for reducing', 'well supported for reducing');
  }
  q.question_text = q.question_text.replace('well support for reducing', 'well supported for reducing');
});

fix(19, 'while is appears → while it appears', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('while is appears', 'while it appears');
  }
  q.question_text = q.question_text.replace('while is appears', 'while it appears');
});

fix(38, 'primary symptoms → primary symptom (subject-verb agreement)', q => {
  q.question_text = q.question_text.replace('What is the primary symptoms', 'What is the primary symptom');
});

fix(71, 'Mmilk → Milk', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('Mmilk', 'Milk');
  }
});

fix(79, 'the follow will not → the following will not', q => {
  q.question_text = q.question_text.replace('the follow will not', 'the following will not');
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('the follow will not', 'the following will not');
  }
});

fix(91, 'more that 2 times → more than 2 times', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('more that 2 times', 'more than 2 times');
  }
  q.question_text = q.question_text.replace('more that 2 times', 'more than 2 times');
});

fix(91, 'the follow recommendations → the following recommendations', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('the follow recommendations', 'the following recommendations');
  }
  q.question_text = q.question_text.replace('the follow recommendations', 'the following recommendations');
});

fix(92, 'free or stimulants → free of stimulants', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('free or stimulants', 'free of stimulants');
  }
  q.question_text = q.question_text.replace('free or stimulants', 'free of stimulants');
});

fix(117, 'negatively impact on → negative impact on', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('negatively impact on', 'negative impact on');
  }
  q.question_text = q.question_text.replace('negatively impact on', 'negative impact on');
});

fix(117, 'and and functions → and functions', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('and and functions', 'and functions');
  }
  q.question_text = q.question_text.replace('and and functions', 'and functions');
});

fix(121, 'the follow will likely → the following will likely', q => {
  q.question_text = q.question_text.replace('the follow will likely', 'the following will likely');
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('the follow will likely', 'the following will likely');
  }
});

fix(125, 'conversation of T4 → conversion of T4', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('conversation of T4', 'conversion of T4');
  }
  q.question_text = q.question_text.replace('conversation of T4', 'conversion of T4');
});

fix(125, 'will ____ are needed → while ____ are needed', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace(/will ([\w_]+) are needed/, 'while $1 are needed');
  }
  q.question_text = q.question_text.replace(/will ([\w_]+) are needed/, 'while $1 are needed');
});

fix(127, 'Capitalize "too little" at sentence start', q => {
  for (let i = 0; i < q.options.length; i++) {
    if (q.options[i].startsWith('too little')) {
      q.options[i] = 'Too little' + q.options[i].slice(10);
    }
  }
});

fix(148, 'Thryoid → Thyroid', q => {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i] = q.options[i].replace('Thryoid', 'Thyroid');
  }
  q.question_text = q.question_text.replace('Thryoid', 'Thyroid');
});

// Summary
console.log(`\n📊 Total changes applied: ${changelog.length}`);

// Write updated canonical
writeFileSync(CANONICAL, JSON.stringify(bank, null, 2));
console.log(`✅ Wrote ${CANONICAL}`);

// Also update source bank if it exists and has domain 4
try {
  const srcD4 = [];
  source.forEach((q, i) => { if (String(q.domain) === '4') srcD4.push(i); });
  if (srcD4.length === d4Indices.length) {
    // Mirror all changes to source
    for (const c of changelog) {
      const srcIdx = srcD4[c.d4q - 1];
      source[srcIdx] = JSON.parse(JSON.stringify(bank[d4idx(c.d4q)]));
    }
    writeFileSync(SOURCE, JSON.stringify(source, null, 2));
    console.log(`✅ Wrote ${SOURCE} (source bank synced)`);
  } else {
    console.log(`⚠️ Source bank domain 4 count mismatch (${srcD4.length} vs ${d4Indices.length}) — skipping source sync`);
  }
} catch (e) {
  console.log(`⚠️ Source sync error: ${e.message}`);
}

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
    const q = bank[d4idx(c.d4q)];
    // Match by question text (use original if we changed it, or current)
    const searchText = q.question_text.substring(0, 80);
    
    const { data, error } = await sb
      .from('questions')
      .select('id, question_text')
      .eq('domain', 4)
      .ilike('question_text', `${searchText}%`)
      .limit(1);
    
    if (error) { errs++; continue; }
    if (!data || data.length === 0) { notFound++; continue; }
    
    const row = data[0];
    const { error: updateErr } = await sb
      .from('questions')
      .update({
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
      })
      .eq('id', row.id);
    
    if (updateErr) { errs++; console.log(`  ❌ D4-Q${c.d4q}: ${updateErr.message}`); }
    else { synced++; }
  }
  
  console.log(`\n📊 Supabase sync: ${synced} updated, ${notFound} not found, ${errs} errors`);
}

// Write changelog
writeFileSync('./review/batch4-changelog.json', JSON.stringify(changelog, null, 2));
console.log('✅ Wrote review/batch4-changelog.json');
