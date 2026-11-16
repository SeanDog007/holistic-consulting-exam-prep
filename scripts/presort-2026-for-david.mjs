#!/usr/bin/env node
/**
 * Suggest a 2027 action for each question in the April 2026 canonical bank.
 *
 *   node scripts/presort-2026-for-david.mjs
 *
 * Writes review/2026-questions-presort-for-david.csv and a summary JSON.
 * David has not reviewed these suggestions. suggested_action is not a decision.
 *
 * The canonical file has no per-question explanation or textbook_reference.
 * current_textbook_reference is the domain default that generate-explanations.mjs
 * stamps, so David can see which dropped or changed book that script attaches.
 *
 * Actions:
 *   KEEP_LIKELY   A core point maps to a 2027 key concept and is not a removed concept.
 *   REVIEW        Tied to a changed concept, or no 2027 key concept matched.
 *   RETIRE_LIKELY The question is about a concept the 2027 guide dropped.
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const DOMAIN_DEFAULT_TEXTBOOK = {
  1: "The Encyclopedia of Healing Foods, Murray & Pizzorno",
  2: "Hole's Essentials of Human Anatomy & Physiology, 14th Ed.",
  3: "NANP Code of Ethics & Scope of Practice",
  4: "Encyclopedia of Natural Medicine, Murray & Pizzorno",
  5: "The Craft of Research, 4th Ed., Booth et al.",
};

const BOOK_NOTE = {
  1: "Domain I in the 2026 bank was tied to texts NANP dropped (Encyclopedia of Healing Foods and Advanced Human Nutrition, 5th ed.).",
  2: "Hole's Essentials, 14th ed., was replaced by Hole's Human Anatomy & Physiology, 2024 release.",
  3: "Nutrition Counseling & Education Skill Development, 4th ed., was dropped. NANP's ethics, scope, and legal pages remain.",
  4: "Domain IV in the 2026 bank was tied to Encyclopedia of Natural Medicine, which NANP dropped.",
  5: "The Craft of Research, 4th ed., was replaced by the 5th ed. The 2027 research key concepts are largely the same ideas.",
};

function caseInsensitive(pattern) {
  const flags = pattern.flags.includes("i") ? pattern.flags : `${pattern.flags}i`;
  return new RegExp(pattern.source, flags);
}

function concept(domain, name, patterns) {
  return { domain, name, patterns: patterns.map(caseInsensitive) };
}

const CONCEPTS = [
  concept(1, "Anti-inflammatory components", [/anti-?inflammatory/, /omega-?3/, /curcumin/, /turmeric/, /polyphenol/]),
  concept(1, "Anti-nutrients", [/anti-?nutrient/, /phytic|phytate/, /oxalate/, /\blectin/, /tannin/, /goitrogen/]),
  concept(1, "Detoxification and elimination support", [/detox/, /biotransform/, /phase [12i]/, /glutathione/]),
  concept(1, "Dietary patterns", [/mediterranean/, /\bvegan\b/, /vegetarian/, /paleo/, /ketogenic|\bketo\b/, /macrobiotic/, /whole[- ]food/, /dietary pattern/]),
  concept(1, "Digestive support", [/digest/, /\benzyme/, /probiotic/, /prebiotic/, /\bgut\b/, /dysbiosis/, /\bfiber\b/, /microbiome/, /ferment/]),
  concept(1, "Fermented foods", [/ferment/, /kefir/, /sauerkraut/, /kimchi/, /yogurt/, /miso/]),
  concept(1, "Food additives", [/food additive/, /preservative/, /high fructose/, /\bmsg\b/, /\bbht\b/, /\bbha\b/, /artificial colou?r/, /sulfite/]),
  concept(1, "Food composition", [/nutrient composition/, /food composition/, /phytonutrient/, /antioxidant/]),
  concept(1, "Food sensitivity/allergy", [/food allerg/, /food sensitiv/, /histamine/, /elimination diet/, /nightshade/, /gluten/, /lactose/, /celiac/]),
  concept(1, "Foodborne contaminants", [/foodborne/, /food safety/, /cross-?contamin/, /salmonella/, /listeria/, /e\.? ?coli/]),
  concept(1, "Glucose/insulin metabolism", [/insulin/, /glycemic/, /\bglucose\b/, /blood sugar/, /hypoglyc/]),
  concept(1, "Herbs", [/\bherbs?\b/, /herbal/, /botanical/, /herbal tea/]),
  concept(1, "Human microbiome", [/microbiome/, /microbiota/, /dysbiosis/, /gut flora/]),
  concept(1, "Life-stage nutrition", [/pregnan/, /lactation|\bbreast milk\b/, /\binfant/, /adolescent/, /older adult/, /life stage/, /\bmenopause\b/]),
  concept(1, "Macronutrients", [/\bprotein\b/, /carbohydrate/, /\bfatty acid/, /\bamino acid/, /macronutrient/, /\blipid/, /cholesterol/]),
  concept(1, "Micronutrients", [/vitamin/, /\bmineral\b/, /\biron\b/, /\bzinc\b/, /calcium/, /magnesium/, /folate|folic/, /\bb12\b|cobalamin/, /\bnutrient\b/]),
  concept(1, "Supplements", [/supplement/, /coenzyme q|coq10|co enzyme q/, /probiotic supplement/]),
  concept(1, "Toxins", [/\btoxin/, /heavy metal/, /pesticide/, /environmental contamin/, /\bmercury\b/, /\blead\b/]),
  concept(1, "Water and fluid balance", [/hydrat/, /electrolyte/, /fluid balance/, /water intake/, /\bdehydrat/]),

  concept(2, "Acid-base balance", [/acid-?base/, /acidosis/, /alkalosis/, /bicarbonate/, /\bpH\b/]),
  concept(2, "Cardiovascular/circulatory systems", [/\bheart\b/, /\barter/, /\bvein\b/, /capillar/, /cardiac/, /circulatory/, /blood pressure/]),
  concept(2, "Cellular structure and metabolism", [/mitochondri/, /\batp\b/, /cell membrane/, /glycoly/, /citric acid|krebs/, /\benzyme\b/, /organelle/, /\bdna\b/, /\brna\b/, /metaboli/]),
  concept(2, "Detoxification pathways", [/cytochrome/, /biotransform/, /phase [12]/, /detoxification pathway/]),
  concept(2, "Digestive system", [/stomach/, /intestin/, /\bliver\b/, /pancrea/, /\bbile\b/, /\bvill/, /\bcolon\b/, /\bchyme\b/, /esophag/, /gallbladder/]),
  concept(2, "Endocrine system", [/hormone/, /thyroid/, /adrenal/, /\binsulin\b/, /cortisol/, /pituitary/, /endocrine/, /estrogen/, /testosterone/]),
  concept(2, "Immune system", [/immune/, /antibod/, /inflammat/, /leukocyte|white blood/, /\blymph/]),
  concept(2, "Integumentary system", [/\bskin\b/, /dermis/, /epidermis/, /integument/]),
  concept(2, "Lymphatic system", [/lymph/, /spleen/, /thymus/]),
  concept(2, "Mesenteric system", [/mesenter/]),
  concept(2, "Musculoskeletal system", [/\bbone\b/, /\bmuscle\b/, /\bjoint\b/, /osteo/, /tendon/, /ligament/, /skeletal/]),
  concept(2, "Nervous system", [/neuron/, /\bbrain\b/, /\bnerve\b/, /neurotransmitter/, /synapse/, /spinal/, /nervous system/]),
  concept(2, "Reproductive system", [/menstruat/, /estrogen/, /progesterone/, /uterus/, /ovar/, /sperm/, /reproduct/]),
  concept(2, "Respiratory system", [/\blung\b/, /alveol/, /trachea/, /respirat/, /bronch/]),
  concept(2, "Urinary system", [/kidney/, /nephron/, /\burine\b/, /\brenal\b/, /bladder/, /urinary/]),

  concept(3, "24-hour recall", [/24[- ]hour recall/, /dietary recall/]),
  concept(3, "Client assessment questionnaires", [/questionnaire/, /food diary/, /intake record/]),
  concept(3, "Client/consultant relationships", [/client relationship/, /rapport/, /counselor-client/, /practitioner-client/]),
  concept(3, "Client's readiness to change", [/readiness to change/, /stages of change/, /transtheoretical/, /precontemplation/, /contemplation/]),
  concept(3, "Journaling", [/journaling/, /food journal/, /food record/]),
  concept(3, "Barriers to change", [/barrier to change/, /ambivalence/]),
  concept(3, "Behavior modification", [/behavior modification/, /behaviour modification/, /behavior change/, /habit/]),
  concept(3, "Characteristics of effective counselors", [/effective counsel/, /counselor characteristic/]),
  concept(3, "Client resistance", [/resistance/, /reluctant client/]),
  concept(3, "Group counseling", [/group counsel/, /group session/]),
  concept(3, "Intercultural counseling", [/cultur/, /intercultural/]),
  concept(3, "Listening skills", [/active listening/, /listening skill/, /reflect(?:ive|ion)/]),
  concept(3, "Nonverbal counseling skills", [/nonverbal/, /body language/]),
  concept(3, "Recognizing professional boundaries and limitations", [/boundar/, /limitation of practice/, /referr/]),
  concept(3, "Building self-confidence", [/self-?confidence/, /self-?efficacy/]),
  concept(3, "Cognitive restructuring", [/cognitive restructuring/, /self-talk/]),
  concept(3, "Lapse/relapse prevention", [/relapse/, /\blapse\b/]),
  concept(3, "Professionalism", [/professionalism/, /confidential/, /informed consent/, /\bhipaa\b/]),
  concept(3, "Role of empathy", [/empathy/, /empathic/]),
  concept(3, "Setting goals", [/goal setting/, /\bgoals?\b/, /smart goal/]),
  concept(3, "Use of rewards", [/\breward\b/, /reinforcement/]),
  concept(3, "NANP's Code of Ethics", [/code of ethics/, /\bethic/, /confidential/, /\bai tool\b|artificial intelligence/]),
  concept(3, "NANP's Scope of Practice", [/scope of practice/, /scope of service/, /\bdiagnose\b/, /\bprescri(?:be|ption)\b/, /licens/]),
  concept(3, "State Nutrition Practice Regulations", [/state law/, /licensure/, /title protection/, /exclusive scope/, /practice act/]),
  concept(3, "Motivational Counseling", [/motivational interview/, /motivational counsel/]),

  concept(4, "Anemia", [/anemia/, /anaemia/]),
  concept(4, "Angina", [/angina/]),
  concept(4, "Dyslipidemia", [/dyslipidemia/, /hyperlipidemia/, /triglyceride/, /\bldl\b/, /\bhdl\b/]),
  concept(4, "Hypo/hypertension", [/hypertension/, /hypotension/, /blood pressure/]),
  concept(4, "Varicose veins", [/varicose/]),
  concept(4, "Adrenal dysfunction", [/adrenal/]),
  concept(4, "Diabetes", [/diabetes/, /insulin resistance/, /hba1c|a1c/, /type 2 diabetes|type ii diabetes/]),
  concept(4, "Hypo/hyperglycemia", [/hyperglyc/, /hypoglyc/]),
  concept(4, "Hypo/hyperthyroidism", [/thyroid/, /hypothyroid/, /hyperthyroid/]),
  concept(4, "Candidiasis", [/candida/]),
  concept(4, "Celiac disease", [/celiac/, /coeliac/]),
  concept(4, "Crohn's disease", [/crohn/]),
  concept(4, "Constipation", [/constipation/]),
  concept(4, "Diarrhea", [/diarrh/]),
  concept(4, "Diverticulitis/diverticulosis", [/diverticul/]),
  concept(4, "Dysbiosis", [/dysbiosis/, /sibo/, /small intestinal bacterial/]),
  concept(4, "Gallstones", [/gallstone/, /cholelith/]),
  concept(4, "Hypo/hyperchlorhydria", [/hypochlorhydria/, /low stomach acid/, /hydrochloric|\bhcl\b/]),
  concept(4, "Irritable bowel syndrome", [/irritable bowel|\bibs\b/]),
  concept(4, "Leaky gut syndrome", [/leaky gut/, /intestinal permeability/]),
  concept(4, "Ulcer", [/\bulcer\b/, /h\. ?pylori|helicobacter/]),
  concept(4, "Allergies (food, environmental)", [/allerg/, /ige\b/, /histamine/]),
  concept(4, "Auto-immune", [/autoimmune/, /auto-immune/]),
  concept(4, "Ear infections", [/otitis/, /ear infection/]),
  concept(4, "Infections (bacterial, fungal, viral)", [/infection/, /\bbacterial\b/, /\bfungal\b/, /\bviral\b/]),
  concept(4, "Acne", [/\bacne\b/]),
  concept(4, "Dermatitis", [/dermatitis/, /eczema/]),
  concept(4, "Hives", [/hives/, /urticaria/]),
  concept(4, "Psoriasis", [/psoriasis/]),
  concept(4, "Rosacea", [/rosacea/]),
  concept(4, "Gout", [/\bgout\b/, /uric acid/]),
  concept(4, "Osteoarthritis", [/osteoarthritis/]),
  concept(4, "Osteopenia/osteoporosis", [/osteopenia/, /osteoporosis/, /bone density/]),
  concept(4, "Rheumatoid arthritis", [/rheumatoid/]),
  concept(4, "ADD/ADHD", [/\badhd\b/, /\badd\b/]),
  concept(4, "Alzheimer's/dementia", [/alzheimer/, /dementia/]),
  concept(4, "Carpal tunnel syndrome", [/carpal tunnel/]),
  concept(4, "Migraines", [/migraine/]),
  concept(4, "Mood disorders", [/depression/, /\banxiety\b/, /seasonal affective/]),
  concept(4, "Multiple sclerosis", [/multiple sclerosis|\bms\b/]),
  concept(4, "Restless legs syndrome", [/restless leg/]),
  concept(4, "Benign prostate hyperplasia", [/prostate/, /\bbph\b/]),
  concept(4, "Fibrocystic breast disease", [/fibrocystic/]),
  concept(4, "Infertility", [/infertil/]),
  concept(4, "Menopause", [/menopause/, /hot flash/]),
  concept(4, "Premenstrual syndrome", [/\bpms\b/, /premenstrual/]),
  concept(4, "Asthma", [/asthma/]),
  concept(4, "Bronchitis", [/bronchitis/]),
  concept(4, "Sinusitis", [/sinusitis/, /sinus infection/]),
  concept(4, "Cystitis", [/cystitis/]),
  concept(4, "Kidney stones", [/kidney stone/, /nephrolith/]),
  concept(4, "Urinary tract infection", [/urinary tract|uti\b/]),
  concept(4, "Cataracts", [/cataract/]),
  concept(4, "Glaucoma", [/glaucoma/]),
  concept(4, "Macular degeneration", [/macular/]),
  concept(4, "Cancer", [/\bcancer\b/, /tumor/, /oncolog/]),
  concept(4, "Chronic fatigue syndrome", [/chronic fatigue/]),
  concept(4, "Fibromyalgia", [/fibromyalgia/]),
  concept(4, "Metabolic syndrome", [/metabolic syndrome/]),
  concept(4, "Sleep disorder", [/sleep/, /insomnia/]),
  concept(4, "Body mass index", [/\bbmi\b/, /body mass index/]),
  concept(4, "Lab assessments", [/\blab\b/, /blood test/, /laboratory/]),
  concept(4, "Biochemical individuality", [/biochemical individuality/]),
  concept(4, "Drug/herb/nutrient interactions", [/drug[- ]nutrient/, /nutrient interaction/, /medication interaction/, /herb[- ]drug/]),
  concept(4, "Homeostasis", [/homeostasis/]),
  concept(4, "Toxic burden", [/toxic burden/, /toxin load/]),
  concept(4, "Nutrient supplementation", [/supplement/]),
  concept(4, "Stress management", [/\bstress\b/, /cortisol/]),
  concept(4, "Weight management", [/weight loss/, /weight management/, /\bobes/]),

  concept(5, "Abstract", [/\babstract\b/]),
  concept(5, "Bibliography", [/bibliograph/, /reference list/]),
  concept(5, "Citation guidelines", [/citation/, /\bcite\b/, /apa format/, /mla format/]),
  concept(5, "Context", [/research context/, /literature review/]),
  concept(5, "Critical reading", [/critical reading/, /peer review/, /critically appraise/]),
  concept(5, "Keywords", [/keyword/]),
  concept(5, "Plagiarism", [/plagiar/]),
  concept(5, "Sources", [/primary source/, /secondary source/, /scholarly source/, /pubmed/, /peer-reviewed/]),
  concept(5, "Reliability", [/reliability/, /validit/, /evidence-based/]),
  concept(5, "Types", [/randomized|\brct\b/, /meta-analysis/, /cohort/, /case control/, /study design/, /qualitative/, /quantitative/]),
  concept(5, "Trailhead", [/trailhead/]),
  concept(5, "Warrant", [/\bwarrant\b/]),
  concept(5, "Writing up your research", [/writing up/, /research report/]),
  concept(5, "Choosing topics", [/research question/, /choosing a topic/]),
  concept(5, "Documenting research", [/documenting research/, /research notes/]),
  concept(5, "Introductions and conclusions", [/introduction and conclusion/, /thesis statement/]),
  concept(5, "Making good arguments", [/\bargument\b/, /claim and evidence/]),
  concept(5, "Note taking", [/note taking/, /note-taking/]),
  concept(5, "Organization", [/outline the/, /organizing (?:a|the) (?:paper|argument)/]),
  concept(5, "Presenting data", [/presenting data/, /\bstatistic/, /p-value|p value/, /confidence interval/]),
  concept(5, "Quoting and paraphrasing", [/paraphras/, /quotation/, /quoting/]),
  concept(5, "Sentence revision", [/revise the sentence/, /sentence revision/]),
  concept(5, "Use of statistics", [/statistic/, /sample size/, /statistical significance/]),
  concept(5, "Writing for your reader(s)", [/audience/, /writing for/]),
];

const REMOVED = [
  {
    label: "acid/alkaline-forming foods",
    pattern: caseInsensitive(/alkaline[-\s]?(?:forming|diet|foods?)|acid[-\s]?forming|acid\/alkaline|\balkaline\b/),
  },
  {
    label: "hemorrhoids",
    pattern: caseInsensitive(/hemorrhoid/),
  },
  {
    label: "basal body temperature as an assessment tool",
    pattern: caseInsensitive(/basal body temperature|\bBBT\b/),
  },
];

const CHANGED = [
  {
    label: "high/low cholesterol",
    replacement: "Dyslipidemia",
    pattern: caseInsensitive(/cholesterol/),
    also: caseInsensitive(/cholesterol levels?|elevated (?:ldl|cholesterol)|ldl cholesterol|\bhdl\b|statin|hypercholesterol|atheroscleros|plaque|cholesterol regulation/),
    reason: "The 2027 Domain IV list replaced high/low cholesterol with dyslipidemia. This question treats cholesterol as a clinical target.",
  },
  {
    label: "adrenal fatigue",
    replacement: "Adrenal dysfunction",
    pattern: caseInsensitive(/adrenal fatigue/),
    reason: "The 2027 Domain IV list says adrenal dysfunction, not adrenal fatigue.",
  },
];

function bestConcept(stem, options, questionDomain) {
  const hits = [];
  for (const item of CONCEPTS) {
    let score = 0;
    let specificity = 0;
    for (const pattern of item.patterns) {
      const stemHit = pattern.test(stem);
      const optionHit = !stemHit && pattern.test(options);
      if (stemHit) score += 2;
      else if (optionHit) score += 1;
      if (stemHit || optionHit) specificity = Math.max(specificity, pattern.source.length);
    }
    if (score > 0) {
      hits.push({ ...item, score, specificity, sameDomain: item.domain === questionDomain });
    }
  }
  hits.sort((a, b) =>
    b.score - a.score
    || b.specificity - a.specificity
    || Number(b.sameDomain) - Number(a.sameDomain)
  );
  return hits[0] || null;
}

export function classifyQuestion(question) {
  const stem = question.question_text || "";
  const options = (question.options || []).join(" \n ");
  const domain = question.domain;
  const book = BOOK_NOTE[domain] || "";
  const match = bestConcept(stem, options, domain);
  const removed = REMOVED.find((item) => item.pattern.test(stem));
  const changed = CHANGED.find((item) => item.pattern.test(stem) && (!item.also || item.also.test(stem)));

  if (removed) {
    return {
      suggested_action: "RETIRE_LIKELY",
      reason: `Suggestion only. The question is about ${removed.label}, which is not on the 2027 key concept lists. ${book}`.replace(/\s+/g, " ").trim(),
      matched_2027_concept: "",
    };
  }

  if (changed) {
    return {
      suggested_action: "REVIEW",
      reason: `Suggestion only. ${changed.reason} ${book}`.replace(/\s+/g, " ").trim(),
      matched_2027_concept: changed.replacement,
    };
  }

  if (match) {
    const domainNote = match.domain === domain
      ? `Maps to the 2027 key concept "${match.name}".`
      : `Maps to the 2027 Domain ${match.domain} key concept "${match.name}", which is not the domain this question is filed under.`;
    return {
      suggested_action: "KEEP_LIKELY",
      reason: `Suggestion only. ${domainNote} ${book}`.replace(/\s+/g, " ").trim(),
      matched_2027_concept: match.name,
    };
  }

  return {
    suggested_action: "REVIEW",
    reason: `Suggestion only. No 2027 key concept matched this wording. ${book}`.replace(/\s+/g, " ").trim(),
    matched_2027_concept: "",
  };
}

function letterFor(question) {
  const raw = question.correct_answer;
  if (typeof raw === "number") return "ABCDEF"[raw] || "";
  return String(raw || "").toUpperCase();
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function textbookCell(domain) {
  const book = DOMAIN_DEFAULT_TEXTBOOK[domain] || "";
  return `Not stored on the canonical JSON row. generate-explanations.mjs stamps this domain default: ${book}`;
}

export function buildPresort(questions) {
  return questions.map((question, index) => {
    const classified = classifyQuestion(question);
    const options = question.options || [];
    return {
      id: `q2026-${String(index + 1).padStart(4, "0")}`,
      domain: question.domain,
      question: question.question_text,
      option_a: options[0] || "",
      option_b: options[1] || "",
      option_c: options[2] || "",
      option_d: options[3] || "",
      correct: letterFor(question),
      explanation: "",
      current_textbook_reference: textbookCell(question.domain),
      suggested_action: classified.suggested_action,
      reason: classified.reason,
      matched_2027_concept: classified.matched_2027_concept,
      David_decision: "",
      David_notes: "",
      exam_source: question.exam_source || "",
    };
  });
}

const COLUMNS = [
  "id",
  "domain",
  "question",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct",
  "explanation",
  "current_textbook_reference",
  "suggested_action",
  "reason",
  "matched_2027_concept",
  "David_decision",
  "David_notes",
];

function toCsv(rows) {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(COLUMNS.map((column) => csvEscape(row[column])).join(","));
  }
  return lines.join("\n") + "\n";
}

function summarize(rows) {
  const summary = {};
  for (const row of rows) {
    const domain = String(row.domain);
    if (!summary[domain]) summary[domain] = { KEEP_LIKELY: 0, REVIEW: 0, RETIRE_LIKELY: 0, total: 0 };
    summary[domain][row.suggested_action] += 1;
    summary[domain].total += 1;
  }
  const totals = { KEEP_LIKELY: 0, REVIEW: 0, RETIRE_LIKELY: 0, total: rows.length };
  for (const domain of Object.values(summary)) {
    totals.KEEP_LIKELY += domain.KEEP_LIKELY;
    totals.REVIEW += domain.REVIEW;
    totals.RETIRE_LIKELY += domain.RETIRE_LIKELY;
  }
  return { by_domain: summary, totals };
}

function main() {
  const questions = JSON.parse(readFileSync(join(root, "question-bank-canonical-2026-04-08.json"), "utf8"));
  const rows = buildPresort(questions);
  const csvPath = join(root, "review/2026-questions-presort-for-david.csv");
  const summaryPath = join(root, "review/2026-presort-summary.json");
  const mapPath = join(root, "review/2026-question-id-map.json");
  writeFileSync(csvPath, toCsv(rows));
  const summary = {
    status: "Automated suggestion for David. He has not reviewed these rows. suggested_action is not a decision.",
    source_bank: "question-bank-canonical-2026-04-08.json",
    how_classified: "Each question is matched to the 2027 key concepts in nanp/sg2027.txt. A match in the question stem outweighs a match that appears only in an answer option. RETIRE_LIKELY is used when the question itself is about a concept the 2027 guide dropped (alkaline-forming foods, hemorrhoids, basal body temperature). REVIEW is used when the question treats cholesterol as a clinical target (the 2027 list says dyslipidemia), when it says adrenal fatigue (the 2027 list says adrenal dysfunction), or when no 2027 key concept matched. KEEP_LIKELY is a core point that matched a 2027 key concept. The canonical file has no per-question textbook, so the book named in current_textbook_reference is the domain default from generate-explanations.mjs.",
    blank_explanation: "The canonical JSON has no explanation field. Live Supabase may hold template explanations. This script did not read the database.",
    ...summarize(rows),
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  writeFileSync(mapPath, JSON.stringify(rows.map((row) => ({
    id: row.id,
    domain: row.domain,
    question_text: row.question,
    exam_source: row.exam_source,
    correct: row.correct,
    options: [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean),
  })), null, 2) + "\n");
  console.log(JSON.stringify(summary.totals));
  console.log(JSON.stringify(summary.by_domain, null, 2));
  console.log(`Wrote ${rows.length} rows to ${csvPath}`);
}

const invokedPath = process.argv[1] || "";
if (invokedPath.endsWith("presort-2026-for-david.mjs")) main();
