#!/usr/bin/env node
/**
 * Sync Pass 2 fixes to Supabase
 * Matches by question_text (fuzzy) and updates:
 * - question_text (question mark additions)
 * - question_type (true_false fixes)
 * - domain reassignments for comprehensive exam questions
 * - typo fixes in options
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uvzfhksyjqadkxypcocq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) { console.error('Set SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const cleanupLog = JSON.parse(readFileSync('./cleanup-log.json', 'utf8'));
const localBank = JSON.parse(readFileSync('./circle-questions-export.json', 'utf8'));

const actions = cleanupLog.pass2.actions.filter(a => a.index !== undefined);
console.log(`Processing ${actions.length} pass-2 changelog entries...`);

// Get all affected indices
const affectedIndices = [...new Set(actions.map(a => a.index))];
console.log(`Unique questions affected: ${affectedIndices.length}`);

// For each affected question, find it in Supabase and update
let updated = 0;
let notFound = 0;
let errors = 0;

const ANSWER_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const DOMAIN_TOPICS = {
  1: 'Food and Nutrition',
  2: 'Anatomy, Physiology, and Biochemistry',
  3: 'Counseling, Ethics, and Scope of Practice',
  4: 'Nutrition in Practice',
  5: 'Research',
};

// Process in batches
for (let i = 0; i < affectedIndices.length; i++) {
  const idx = affectedIndices[i];
  const localQ = localBank[idx];
  
  // Try to find in Supabase by original question text (before our edits)
  // Use a fuzzy approach: search by the first 50 chars of the question
  const searchText = localQ.question_text.replace(/\?$/, '').slice(0, 50);
  
  const { data: matches, error: searchError } = await sb
    .from('questions')
    .select('id, question_text, domain, question_type, options')
    .ilike('question_text', `${searchText}%`)
    .limit(5);
  
  if (searchError) {
    console.error(`Search error for [${idx}]:`, searchError.message);
    errors++;
    continue;
  }
  
  if (!matches || matches.length === 0) {
    // Try shorter prefix
    const shortSearch = localQ.question_text.replace(/\?$/, '').slice(0, 30);
    const { data: matches2 } = await sb
      .from('questions')
      .select('id, question_text, domain, question_type, options')
      .ilike('question_text', `${shortSearch}%`)
      .limit(5);
    
    if (!matches2 || matches2.length === 0) {
      notFound++;
      continue;
    }
    
    // Use first match
    const match = matches2[0];
    const updates = buildUpdates(localQ, match);
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await sb.from('questions').update(updates).eq('id', match.id);
      if (updateError) { errors++; } else { updated++; }
    }
    continue;
  }
  
  // Pick best match
  const match = matches[0];
  const updates = buildUpdates(localQ, match);
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await sb.from('questions').update(updates).eq('id', match.id);
    if (updateError) { errors++; } else { updated++; }
  }
  
  if ((i + 1) % 20 === 0) process.stdout.write(`\r  Progress: ${i + 1}/${affectedIndices.length}`);
}

function buildUpdates(localQ, supaQ) {
  const updates = {};
  
  // Update question_text if different
  if (localQ.question_text !== supaQ.question_text) {
    updates.question_text = localQ.question_text;
  }
  
  // Update question_type if local is true_false
  if (localQ.question_type === 'true_false' && supaQ.question_type === 'mc') {
    updates.question_type = 'tf';
  }
  
  // Update domain for comprehensive exam questions
  if (localQ.exam_source === 'Full Length Comprehensive Exam' && localQ.domain !== supaQ.domain) {
    updates.domain = localQ.domain;
    updates.topic = DOMAIN_TOPICS[localQ.domain];
  }
  
  // Update options if different (typo fixes)
  if (JSON.stringify(localQ.options) !== JSON.stringify(supaQ.options)) {
    updates.options = localQ.options;
  }
  
  return updates;
}

console.log(`\n\n=== SUPABASE SYNC COMPLETE ===`);
console.log(`Updated: ${updated}`);
console.log(`Not found: ${notFound}`);
console.log(`Errors: ${errors}`);
