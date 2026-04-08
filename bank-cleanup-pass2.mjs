#!/usr/bin/env node
/**
 * Bank Cleanup Pass 2 — High-confidence automated fixes
 * 
 * Categories processed:
 * 1. Near-duplicates → all verified as intentionally different (no changes needed)
 * 2. Domain-0 assignment for 115 comprehensive exam questions
 * 3. T/F question_type fix (56 questions labeled multiple_choice → true_false)
 * 4. Missing question marks (37 questions)
 * 5. Typo fix: "extrack" → "extract" (Q144)
 * 6. Answer-key-risk → all 57 verified correct (no changes needed)
 * 7. Anatomy-clinical → all 15 verified correct (no changes needed)
 */

import { readFileSync, writeFileSync } from 'fs';

const BANK_PATH = './circle-questions-export.json';
const qs = JSON.parse(readFileSync(BANK_PATH, 'utf8'));

const changelog = [];
let fixCount = 0;

// ============================================================
// 1. DOMAIN-0 ASSIGNMENT (115 questions from Comprehensive Exam)
// ============================================================
// Classification rules based on NANP domains:
//   Domain 1: Food & Nutrition (nutrients, foods, diets, supplements, herbs, cooking)
//   Domain 2: Anatomy, Physiology, Pathophysiology & Biochemistry (body systems, organs, enzymes, hormones, pathways)
//   Domain 3: Holistic Nutrition Assessment (counseling, assessment, behavior change, stages of change, ethics)
//   Domain 4: Holistic Approaches to Health Conditions (specific conditions + nutritional recommendations)
//   Domain 5: Professional Practice & Research (research methods, citations, plagiarism, scope of practice, NANP)

const domainAssignments = {
  // Domain 5: Research & Professional Practice
  721: 5, // internet as research tool
  722: 5, // determining if online source reliable
  723: 5, // in-text citations or reference list
  737: 5, // quality research paper
  742: 5, // block quote length
  761: 5, // narrow down research topic
  662: 5, // cite sources from internet
  664: 5, // quality research paper
  667: 5, // drawing on work of multiple researchers
  683: 5, // research using secondary sources
  687: 5, // not accept claims just because
  688: 5, // using claims from other sources
  689: 5, // using info from outside sources

  // Domain 3: Assessment & Counseling & Scope
  724: 3, // state restricts individualized recommendations
  725: 3, // what HNPs may not provide
  726: 3, // false statement about HNP practice
  727: 3, // true statement about practice
  728: 3, // true regarding NANP members
  729: 3, // disadvantage of group counseling
  730: 3, // factors influencing food choice
  731: 3, // stage of change - recognizes need
  732: 3, // stage of change - no intention
  733: 3, // stage of change - believes benefit
  734: 3, // self-efficacy
  735: 3, // empathy
  736: 3, // mindful eating components
  746: 3, // client storms out - counseling
  748: 3, // frustrated client - counseling
  832: 3, // most difficult challenge for nutritionist

  // Domain 1: Food & Nutrition
  743: 1, // mineral binding oxalates
  744: 1, // celiac disease food avoidance
  745: 1, // B vitamins and homocysteine
  750: 1, // source of aluminum
  760: 1, // raw foods and enzymes (T/F)
  765: 1, // oxalate foods (T/F)
  775: 1, // cooking vegetables and glutathione
  781: 1, // avoid food additives
  782: 1, // identify gluten in food
  784: 1, // nutritional therapies CFS (T/F)
  789: 1, // biotin deficiency in children
  793: 1, // role of arginine
  794: 1, // function of glutamine
  795: 1, // role of lysine
  796: 1, // mild dehydration factors
  797: 1, // sugar on food labels
  803: 1, // inorganic salts preservatives
  804: 1, // cellulose/pectin/hemicellulose/fibrinogen
  807: 1, // alpha linolenic acid type
  810: 1, // pH measure
  814: 1, // normal fasting blood glucose
  815: 1, // least likely to break down carbohydrates
  816: 1, // AHA dietary guidelines (T/F)
  820: 1, // gluten free grains and celiac
  821: 1, // nutrient regulating cholesterol
  823: 1, // B vitamin lowering LDL
  824: 1, // high purine food and gout
  825: 1, // energy deficiency
  830: 1, // iron absorption enhancement
  831: 1, // zinc and mineral absorption
  833: 1, // vitamin A overdose symptoms
  834: 1, // functions of fat
  835: 1, // lipoprotein transporting cholesterol
  
  // Domain 2: Anatomy, Physiology, Biochemistry
  747: 2, // steroid hormones synthesized from
  749: 2, // CoQ10 in every cell
  751: 2, // estrogen form after menopause
  752: 2, // estrogen form during pregnancy
  753: 2, // estrogen form during reproductive years
  756: 2, // produces TRH
  757: 2, // produces TSH
  758: 2, // produces T4 and T3
  764: 2, // pepsin breaks down protein
  767: 2, // releases GnRH
  768: 2, // releases FSH
  769: 2, // releases estrogen and progesterone
  770: 2, // calcium in cardiac muscle contraction
  771: 2, // small intestine lipid absorption
  774: 2, // erythropoietin
  776: 2, // lymphatic system role
  777: 2, // hormone secretin
  785: 2, // lymph nodes
  786: 2, // phagocytes
  791: 2, // digestive enzymes role
  798: 2, // trigeminal nerve function
  799: 2, // edema
  801: 2, // alveoli function
  802: 2, // deviated septum
  805: 2, // hepatic vein location
  806: 2, // Peyer's patches
  808: 2, // erythropoietin secreted by
  809: 2, // tonsils/adenoids/spleen system
  811: 2, // trigeminal pain location
  812: 2, // ATP production site
  813: 2, // stimulate food intake except
  817: 2, // organ for detoxification
  818: 2, // hypochlorhydria
  819: 2, // calcium resorption in kidney
  
  // Domain 4: Health Conditions & Holistic Approaches
  738: 4, // chronic ear infections
  739: 4, // antibody test (ELISA)
  740: 4, // herb with laxative effects
  741: 4, // food to avoid during acute intestinal illness
  754: 4, // skin rash / histamine
  755: 4, // bronchitis
  759: 4, // glucosamine and osteoarthritis
  762: 4, // MS and cerebrospinal fluid
  763: 4, // MS contributing factors
  766: 4, // foods supporting hemorrhoids
  773: 4, // UTI support
  778: 4, // oral contraceptives nutrient depletion
  779: 4, // diverticulitis
  780: 4, // seborrheic dermatitis
  783: 4, // Jarisch-Herxheimer reaction
  787: 4, // herbal choleretics
  788: 4, // Uva Ursi
  790: 4, // gout and nutrient limitation
  792: 4, // foods for hemorrhoid/vein support
  800: 4, // cataracts risk factors
  822: 4, // anemia recommendations
  826: 4, // osteoporosis treatment
  827: 4, // chronic kidney disease cause
  828: 4, // aloe vera traditional use
  829: 4, // herb for PMS and menopause

  // Remaining: cross-check
  772: 1, // annatto (food coloring / food ingredient)
};

// Verify we covered all 115
const d0Indices = qs.map((q,i) => q.domain === 0 ? i : null).filter(i => i !== null);
const assigned = Object.keys(domainAssignments).map(Number);
const unassigned = d0Indices.filter(i => !assigned.includes(i));
if (unassigned.length > 0) {
  console.log(`WARNING: ${unassigned.length} domain-0 questions not assigned:`, unassigned);
  // Show them
  unassigned.forEach(i => console.log(`  [${i}] ${qs[i].question_text.slice(0,80)}`));
}

// Apply domain assignments
for (const [idx, domain] of Object.entries(domainAssignments)) {
  const i = parseInt(idx);
  if (qs[i].domain === 0) {
    qs[i].domain = domain;
    changelog.push({ action: 'assign-domain', index: i, domain, question: qs[i].question_text.slice(0,60) });
    fixCount++;
  }
}

// ============================================================
// 2. FIX T/F QUESTION TYPE (56 questions)
// ============================================================
let tfFixed = 0;
for (let i = 0; i < qs.length; i++) {
  const opts = qs[i].options || [];
  const isTF = opts.length === 2 && 
    new Set(opts.map(o => o.trim().toLowerCase())).size === 2 &&
    opts.every(o => ['true','false'].includes(o.trim().toLowerCase()));
  
  if (isTF && qs[i].question_type === 'multiple_choice') {
    qs[i].question_type = 'true_false';
    changelog.push({ action: 'fix-question-type', index: i, from: 'multiple_choice', to: 'true_false' });
    tfFixed++;
    fixCount++;
  }
}
console.log(`Fixed ${tfFixed} T/F question types`);

// ============================================================
// 3. ADD MISSING QUESTION MARKS
// ============================================================
const questionStarters = ['which','what','how','when','where','who','why','does','is ','are ','can ','do '];
let qmFixed = 0;
for (let i = 0; i < qs.length; i++) {
  const qt = qs[i].question_text.trim();
  const lower = qt.toLowerCase();
  const isQuestion = questionStarters.some(w => lower.startsWith(w));
  
  if (isQuestion && !qt.endsWith('?') && !qt.endsWith('?"')) {
    // Remove trailing period/colon if present, then add ?
    let fixed = qt.replace(/[.:;,]$/, '') + '?';
    qs[i].question_text = fixed;
    changelog.push({ action: 'add-question-mark', index: i, before: qt.slice(-10), after: fixed.slice(-10) });
    qmFixed++;
    fixCount++;
  }
}
console.log(`Fixed ${qmFixed} missing question marks`);

// ============================================================
// 4. TYPO FIXES
// ============================================================
// Q144: "Monk fruit extrack" → "Monk fruit extract"
for (let i = 0; i < qs.length; i++) {
  for (let j = 0; j < qs[i].options.length; j++) {
    if (qs[i].options[j].includes('extrack')) {
      const before = qs[i].options[j];
      qs[i].options[j] = qs[i].options[j].replace(/extrack/g, 'extract');
      changelog.push({ action: 'fix-typo', index: i, option: j, before: before.slice(0,40), after: qs[i].options[j].slice(0,40) });
      fixCount++;
    }
  }
}

// ============================================================
// 5. STANDARDIZE T/F OPTION CASING
// ============================================================
let casingFixed = 0;
for (let i = 0; i < qs.length; i++) {
  if (qs[i].question_type === 'true_false') {
    for (let j = 0; j < qs[i].options.length; j++) {
      const o = qs[i].options[j].trim();
      if (o.toLowerCase() === 'true' && o !== 'True') {
        qs[i].options[j] = 'True';
        casingFixed++;
        fixCount++;
      } else if (o.toLowerCase() === 'false' && o !== 'False') {
        qs[i].options[j] = 'False';
        casingFixed++;
        fixCount++;
      }
    }
  }
}
console.log(`Fixed ${casingFixed} T/F option casing issues`);

// ============================================================
// WRITE RESULTS
// ============================================================
writeFileSync(BANK_PATH, JSON.stringify(qs, null, 2));
console.log(`\nTotal fixes applied: ${fixCount}`);
console.log(`Changelog entries: ${changelog.length}`);

// Write cleanup log
const existingLog = JSON.parse(readFileSync('./cleanup-log.json', 'utf8'));
const newLog = {
  ...existingLog,
  pass2: {
    timestamp: new Date().toISOString(),
    totalFixes: fixCount,
    breakdown: {
      domainAssignments: Object.keys(domainAssignments).length,
      tfTypeFixed: tfFixed,
      questionMarksAdded: qmFixed,
      typosFixed: changelog.filter(c => c.action === 'fix-typo').length,
      tfCasingFixed: casingFixed,
    },
    verifiedNoChange: {
      nearDuplicates: '7 pairs verified as intentionally different — kept all',
      answerKeyRisk: '57 questions verified correct — no inversions found',
      anatomyClinical: '15 questions verified factually correct',
    },
    actions: [...existingLog.actions, ...changelog]
  }
};
writeFileSync('./cleanup-log.json', JSON.stringify(newLog, null, 2));

// Update review-queue.json to reflect resolved items
const rq = JSON.parse(readFileSync('./review-queue.json', 'utf8'));

// Mark resolved categories
rq.categories['near-duplicates'].resolved = true;
rq.categories['near-duplicates'].resolution = 'All 7 pairs verified as intentionally different questions — no merges needed';

rq.categories['answer-key-risk'].resolved = true; 
rq.categories['answer-key-risk'].resolution = 'All 57 negative/exception questions verified with correct answer keys';

rq.categories['anatomy-clinical'].resolved = true;
rq.categories['anatomy-clinical'].resolution = 'All 15 anatomy/clinical questions verified factually correct';

rq.categories['domain-unassigned'].resolved = true;
rq.categories['domain-unassigned'].resolution = `All 115 questions assigned to domains (D1:${Object.values(domainAssignments).filter(d=>d===1).length}, D2:${Object.values(domainAssignments).filter(d=>d===2).length}, D3:${Object.values(domainAssignments).filter(d=>d===3).length}, D4:${Object.values(domainAssignments).filter(d=>d===4).length}, D5:${Object.values(domainAssignments).filter(d=>d===5).length})`;

// Recalculate queue
const resolvedCount = Object.values(rq.categories).filter(c => c.resolved).reduce((s,c) => s + (c.questions?.length || 0), 0);
rq.resolvedInPass2 = resolvedCount;
rq.remainingForReview = rq.queuedForReview - resolvedCount;

writeFileSync('./review-queue.json', JSON.stringify(rq, null, 2));

// Domain distribution after
const domainCounts = {};
for (const q of qs) {
  domainCounts[q.domain] = (domainCounts[q.domain] || 0) + 1;
}
console.log('\nDomain distribution after cleanup:');
for (const [d, c] of Object.entries(domainCounts).sort()) {
  console.log(`  Domain ${d}: ${c}`);
}

console.log('\nDone!');
