/**
 * Import extracted Circle questions into Supabase
 * Run: SUPABASE_SERVICE_ROLE_KEY=xxx node import-circle-questions.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uvzfhksyjqadkxypcocq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var.');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const ANSWER_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const DOMAIN_TOPICS = {
  1: 'Food and Nutrition',
  2: 'Anatomy, Physiology, and Biochemistry',
  3: 'Counseling, Ethics, and Scope of Practice',
  4: 'Nutrition in Practice',
  5: 'Research',
};

// Comprehensive exam questions (domain 0) need to be assigned to a domain.
// We'll use keyword-based heuristics to classify them.
function classifyComprehensiveQuestion(text) {
  const lower = text.toLowerCase();

  // Domain 5: Research
  if (/\b(research|study design|peer review|evidence.based|pubmed|bibliography|journal|hypothesis|variable|statistical|p-value|meta.analysis|randomized|control group|blind|cohort|case.study|qualitative|quantitative)\b/.test(lower)) return 5;

  // Domain 3: Counseling/Ethics/Scope
  if (/\b(scope of practice|ethic|counsel|client relationship|informed consent|confidential|referral|motivational interview|hipaa|liability|professional boundar|code of conduct|licensure|certification)\b/.test(lower)) return 3;

  // Domain 2: A&P/Biochemistry
  if (/\b(anatomy|physiology|biochem|mitochondri|krebs|atp|enzyme|hormone|endocrine|thyroid|adrenal|cortisol|insulin|glucagon|neurotransmit|serotonin|dopamine|receptor|cell membrane|organelle|dna|rna|protein synthesis|amino acid|glycolysis|oxidative phosphorylation)\b/.test(lower)) return 2;

  // Domain 4: Nutrition in Practice
  if (/\b(assessment|diet.?ary recall|food diary|supplement|protocol|treatment plan|case|clinical|functional|detox|elimination diet|therapeutic|condition|disease|disorder|deficiency|toxicity|lab test|blood work|practitioner|client|patient)\b/.test(lower)) return 4;

  // Domain 1: Food and Nutrition (default for food/nutrient questions)
  return 1;
}

async function main() {
  const data = JSON.parse(readFileSync(new URL('./circle-questions-export.json', import.meta.url)));
  console.log(`Loaded ${data.length} questions from export file\n`);

  // Check for existing questions to avoid duplicates
  const { count: existingCount } = await sb
    .from('questions')
    .select('id', { count: 'exact', head: true });
  console.log(`Existing questions in Supabase: ${existingCount || 0}\n`);

  // Transform to Supabase schema
  const rows = data.map(q => {
    // Assign domain (classify comprehensive questions)
    let domain = q.domain;
    if (domain === 0) {
      domain = classifyComprehensiveQuestion(q.question_text);
    }

    // Convert correctAnswer index to letter
    const correctLetter = ANSWER_LETTERS[q.correct_answer] || 'A';

    return {
      domain,
      topic: DOMAIN_TOPICS[domain],
      subtopic: q.exam_source,
      difficulty: 2, // medium
      cognitive_level: 'recall',
      question_type: 'mc',
      question_text: q.question_text,
      options: q.options, // jsonb array
      correct_answer: correctLetter,
      explanation: null, // to be added later
      textbook_reference: null,
    };
  });

  // Domain distribution summary
  console.log('Domain distribution:');
  for (const [d, topic] of Object.entries(DOMAIN_TOPICS)) {
    const count = rows.filter(r => r.domain === Number(d)).length;
    console.log(`  Domain ${d} (${topic}): ${count}`);
  }
  console.log(`  Total: ${rows.length}\n`);

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await sb.from('questions').insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      process.stdout.write(`\rInserted: ${inserted}/${rows.length}`);
    }
  }

  console.log(`\n\n=== IMPORT COMPLETE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);

  // Verify final count
  const { count: finalCount } = await sb
    .from('questions')
    .select('id', { count: 'exact', head: true });
  console.log(`Total questions in Supabase: ${finalCount}`);
}

main().catch(console.error);
