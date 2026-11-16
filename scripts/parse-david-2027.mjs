#!/usr/bin/env node
/**
 * Parse Dr. David Feuz's three 2027 question docs into the canonical JSON shape.
 *
 *   node scripts/parse-david-2027.mjs
 *
 * Reads sources/david-2027/*.md and writes:
 *   question-bank-canonical-2027-11-16.json
 *   question-bank-canonical-2027-11-16.notes.json
 *
 * Domain II and the Krause file have answer keys skewed toward B. Those two
 * files have their options shuffled with a deterministic seed. Domain III is
 * left as written.
 *
 * Krause chapter → domain tags are a PROPOSAL. David has not confirmed them.
 * Nothing in this output has been reviewed.
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHUFFLE_SEED = "david_2027_drive-v1";
const SOURCE = "david_2027_drive";

const DOMAIN_TOPICS = {
  1: "Food and Nutrition",
  2: "Fundamentals of Anatomy, Physiology, and Biochemistry",
  3: "Counseling, Ethics, and Scope of Practice",
  4: "Nutrition in Practice",
  5: "Research",
};

/**
 * PROPOSED Krause chapter → NANP domain.
 * David labeled this file by chapter, not by domain. He has not confirmed this map.
 * One domain is proposed for the whole chapter. Mixed chapters say so in `note`.
 * `title` is copied from David's reference line when he wrote one. Null means the
 * source file does not name the chapter. `content_note` describes the questions;
 * it is not a textbook title.
 */
export const KRAUSE_CHAPTER_DOMAIN_PROPOSAL = {
  1: { domain: 1, title: "Intake: Gastrointestinal Digestion, Absorption, and Excretion of Nutrients", note: "Proposed Domain I (digestive support and the human microbiome). Overlaps Domain II digestive system." },
  2: { domain: 1, title: "Energy", note: "Proposed Domain I (energy as part of macronutrients)." },
  3: { domain: 1, title: "Water, Electrolytes, and Acid-Base Balance", note: "Proposed Domain I (water and fluid balance). Acid-base balance is also a Domain II key concept." },
  4: { domain: 1, title: "Nutrition Assessment: Dietary Intake Methods", note: "Proposed Domain I (food intake). Assessment tools are also listed under Domain IV." },
  5: { domain: 4, title: "Clinical Assessment: Laboratory and Physical Data", note: "Proposed Domain IV (lab assessments)." },
  6: { domain: 1, title: "Nutritional Genomics", note: "Proposed Domain I (biochemical individuality). David may prefer another domain." },
  7: { domain: 4, title: "Inflammation and the Pathophysiology of Chronic Disease", note: "Proposed Domain IV. The chapter also contains nutrient items that could sit in Domain I." },
  8: { domain: 1, title: null, content_note: "Social determinants of health and community food environment.", note: "Proposed Domain I (environmental influences). The source file does not name this chapter." },
  9: { domain: 4, title: null, content_note: "Nutrition Care Process interventions, including which cause an intervention should target.", note: "Proposed Domain IV. The source file does not name this chapter." },
  10: { domain: 1, title: null, content_note: "Food deserts and community access to nutrient-dense food.", note: "Proposed Domain I. The source file does not name this chapter." },
  11: { domain: 1, title: null, content_note: "Dietary supplements, including why people take them and DSHEA.", note: "Proposed Domain I (supplements). The source file does not name this chapter." },
  12: { domain: 4, title: null, content_note: "Enteral and parenteral nutrition support.", note: "Proposed Domain IV. The source file does not name this chapter." },
  13: { domain: 3, title: null, content_note: "Health Belief Model, Social Cognitive Theory, and the Theory of Planned Behavior.", note: "Proposed Domain III (counseling and behavior change). This is the only Krause chapter proposed for the counseling-skills gap. David has not confirmed it. The source file does not name this chapter." },
  14: { domain: 1, title: null, content_note: "Pregnancy nutrition, including iron and folate.", note: "Proposed Domain I (life-stage nutrition). The source file does not name this chapter." },
  15: { domain: 1, title: null, content_note: "Lactation and the composition of human milk.", note: "Proposed Domain I (life-stage nutrition). The source file does not name this chapter." },
  16: { domain: 1, title: null, content_note: "Childhood nutrient needs, including the calcium RDA.", note: "Proposed Domain I (life-stage nutrition). The source file does not name this chapter." },
  17: { domain: 1, title: null, content_note: "Adolescent micronutrient deficiency and eating patterns.", note: "Proposed Domain I (life-stage nutrition). The source file does not name this chapter." },
  18: { domain: 1, title: null, content_note: "Which reference values to use for a transgender client.", note: "Proposed Domain I (life-stage nutrition and biochemical individuality). The source file does not name this chapter." },
  19: { domain: 1, title: null, content_note: "Phytochemicals and food composition.", note: "Proposed Domain I (food composition). The source file does not name this chapter." },
  20: { domain: 4, title: null, content_note: "Opens with cataracts in older adults; later items include age-related absorption.", note: "Proposed Domain IV (vision). Mixed with life-stage material. The source file does not name this chapter." },
  21: { domain: 2, title: null, content_note: "Opens with ghrelin and glucagon. Later items cover malabsorption after bariatric surgery.", note: "Proposed Domain II (endocrine). Later items look like Domain IV. Kept as one chapter pending David. The source file does not name this chapter." },
  22: { domain: 4, title: null, content_note: "Bulimia nervosa and the dietitian's role on the care team.", note: "Proposed Domain IV. Eating disorders are not a named line in the 2027 Domain IV key concepts. The source file does not name this chapter." },
  23: { domain: 1, title: null, content_note: "ADH, the renin-angiotensin response, thirst, and dehydration.", note: "Proposed Domain I (water and fluid balance). Overlaps Domain II. The source file does not name this chapter." },
  24: { domain: 4, title: "Bone Health and Nutrition", note: "Proposed Domain IV (osteopenia/osteoporosis). Some items are anatomy and could be Domain II." },
  25: { domain: 4, title: "Oral Health and Nutrition", note: "Proposed Domain IV. Oral health is not a named 2027 Domain IV key concept." },
  26: { domain: 4, title: "Food Allergies and Intolerances", note: "Proposed Domain IV (allergies). Food sensitivity/allergy is also a Domain I key concept." },
  27: { domain: 4, title: "Upper Gastrointestinal Tract Disorders", note: "Proposed Domain IV (gastrointestinal system)." },
  28: { domain: 4, title: "Lower Gastrointestinal Tract Disorders", note: "Proposed Domain IV (gastrointestinal system)." },
  29: { domain: 4, title: "Hepatobiliary and Pancreatic Disorders", note: "Proposed Domain IV (gastrointestinal system, including NAFLD)." },
  30: { domain: 4, title: null, content_note: "Diabetes management, including physical activity and insulin sensitivity.", note: "Proposed Domain IV (diabetes). The source file does not name this chapter." },
  31: { domain: 4, title: null, content_note: "Thyroid hormone conversion and selenium.", note: "Proposed Domain IV (hypo/hyperthyroidism). The source file does not name this chapter." },
  32: { domain: 4, title: null, content_note: "Megaloblastic anemia from vitamin B12 or folate deficiency.", note: "Proposed Domain IV (anemia). The source file does not name this chapter." },
  33: { domain: 4, title: null, content_note: "Cardiovascular nutrition, including omega-3 fatty acids and nitric oxide.", note: "Proposed Domain IV (circulatory/cardiovascular system). The source file does not name this chapter." },
  34: { domain: 4, title: null, content_note: "Asthma and a Mediterranean-style eating pattern.", note: "Proposed Domain IV (respiratory system). The source file does not name this chapter." },
  35: { domain: 4, title: null, content_note: "End-stage renal disease: sodium, potassium, and fluid.", note: "Proposed Domain IV (urinary system). The source file does not name this chapter." },
  36: { domain: 4, title: null, content_note: "Foods discussed for cancer prevention, including beta-carotene.", note: "Proposed Domain IV (cancer). The source file groups chapters 36–40 under one heading and does not name this chapter." },
  37: { domain: 4, title: null, content_note: "Vitamin A and infection risk.", note: "Proposed Domain IV (infections). The source file does not name this chapter." },
  38: { domain: 4, title: null, content_note: "Protein needs in HIV-related wasting.", note: "Proposed Domain IV (infections). HIV is not a named 2027 key concept. The source file does not name this chapter." },
  39: { domain: 4, title: null, content_note: "Gluconeogenesis and protein needs in burn injury.", note: "Proposed Domain IV. Burns are not a named 2027 key concept. The source file does not name this chapter." },
  40: { domain: 4, title: null, content_note: "Rheumatoid cachexia and muscle loss.", note: "Proposed Domain IV (rheumatoid arthritis). The source file does not name this chapter." },
  41: { domain: 4, title: null, content_note: "Dehydration risk when swallowing is difficult.", note: "Proposed Domain IV. Dysphagia is not a named 2027 key concept. The source file does not name this chapter." },
  42: { domain: 2, title: null, content_note: "Amino acids as precursors of dopamine and serotonin.", note: "Proposed Domain II (nervous system). Could also be read as Domain IV mood disorders. The source file does not name this chapter." },
};

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleOptions(options, correctLetter, seedKey) {
  const letters = ["A", "B", "C", "D", "E", "F"].slice(0, options.length);
  const items = options.map((text, index) => ({ text, letter: letters[index] }));
  const rng = mulberry32(hashString(`${SHUFFLE_SEED}\n${seedKey}`));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const correctIndex = items.findIndex((item) => item.letter === correctLetter);
  return {
    options: items.map((item) => item.text),
    correct_answer: correctIndex,
    correct_letter: letters[correctIndex],
    letter_before: correctLetter,
  };
}

function cleanInline(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function splitQuestionBlocks(text, pattern) {
  const parts = text.split(pattern);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function unwrapLine(line) {
  return line
    .replace(/^[\s>*-]+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function normalizeBlock(block) {
  return block
    .replace(/[ \t]+(Correct Answer:)/gi, "\n$1")
    .replace(/[ \t]+(Rationale:)/gi, "\n$1")
    .replace(/[ \t]+((?:Textbook )?Reference:)/gi, "\n$1");
}

function parseBlock(block) {
  const lines = normalizeBlock(block).split(/\n/);
  let correct = null;
  const rationale = [];
  const reference = [];
  const body = [];
  let phase = "body";
  let chapterHeader = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const plain = unwrapLine(line);
    if (!plain) continue;
    if (/^#{1,6}\s+/.test(line) && !/question/i.test(plain)) {
      const header = plain.match(/Chapter\s+(\d+)/i);
      if (header) chapterHeader = Number(header[1]);
      continue;
    }
    const chapterOnly = plain.match(/^Chapter\s+(\d+)(?:\s*[-–]\s*\d+)?$/i);
    if (chapterOnly && plain.length < 40) {
      chapterHeader = Number(chapterOnly[1]);
      continue;
    }

    const correctMatch = plain.match(/^Correct Answer:?\s*([A-F])\)/i);
    if (correctMatch) {
      correct = correctMatch[1].toUpperCase();
      phase = "after-correct";
      continue;
    }
    const rationaleMatch = plain.match(/^Rationale:?\s*(.*)$/i);
    if (rationaleMatch) {
      phase = "rationale";
      if (rationaleMatch[1]) rationale.push(rationaleMatch[1]);
      continue;
    }
    const referenceMatch = plain.match(/^(?:Textbook Reference|Reference):?\s*(.*)$/i);
    if (referenceMatch) {
      phase = "reference";
      if (referenceMatch[1]) reference.push(referenceMatch[1]);
      continue;
    }
    if (phase === "rationale") {
      rationale.push(plain);
      continue;
    }
    if (phase === "reference") {
      reference.push(plain);
      continue;
    }
    if (phase === "body") body.push(line);
  }

  const parsed = splitStemAndOptions(body.join("\n"));
  const referenceText = cleanInline(reference.join(" "));
  const chapterFromRef = referenceText.match(/Chapter\s+(\d+)/i);
  return {
    correct,
    rationale: cleanInline(rationale.join(" ")),
    reference: referenceText,
    chapter: chapterFromRef ? Number(chapterFromRef[1]) : chapterHeader,
    stem: parsed?.stem || "",
    options: parsed?.options || [],
    chapterHeader,
  };
}

function splitStemAndOptions(text) {
  const marks = [];
  const re = /(?:^|\s)([A-F])\)\s*/g;
  let match;
  while ((match = re.exec(text))) {
    marks.push({
      letter: match[1].toUpperCase(),
      index: match.index,
      contentStart: match.index + match[0].length,
    });
  }
  const ordered = [];
  for (const letter of ["A", "B", "C", "D", "E", "F"]) {
    const hit = marks.find((item) => item.letter === letter);
    if (hit) ordered.push(hit);
  }
  if (ordered.length < 2 || ordered[0].letter !== "A") return null;
  let stem = text.slice(0, ordered[0].index);
  stem = stem.replace(/^(?:#{1,6}\s*)?(?:\*\*)?Question\s*\d*\**\s*:?\s*/i, "");
  stem = stem.replace(/^\d+\.\s*/, "");
  stem = cleanInline(stem);
  const options = ordered.map((hit, index) => {
    const end = index + 1 < ordered.length ? ordered[index + 1].index : text.length;
    return cleanInline(text.slice(hit.contentStart, end));
  });
  return { stem, options };
}

function domainIIISubtopic(number) {
  if (number >= 1 && number <= 20) return "NANP Code of Ethics";
  if (number >= 21 && number <= 36) return "NANP Legislative Affairs";
  if (number >= 37 && number <= 47) return "What Is Holistic Nutrition?";
  return "NANP ethics, scope, and legal practice";
}

function finishQuestion(draft, { shuffle }) {
  const failures = [];
  if (!draft.stem || draft.stem.length < 10) failures.push("stem too short");
  if (!draft.options || draft.options.length < 2) failures.push("fewer than 2 options");
  if (draft.options.some((option) => !option)) failures.push("empty option");
  if (!draft.correct) failures.push("missing correct answer");
  const letterIndex = draft.correct ? "ABCDEF".indexOf(draft.correct) : -1;
  if (draft.correct && (letterIndex < 0 || letterIndex >= draft.options.length)) {
    failures.push(`correct answer ${draft.correct} is outside the options`);
  }
  if (!draft.rationale) failures.push("missing rationale");
  if (!draft.reference) failures.push("missing reference");
  if (failures.length) return { ok: false, failures, draft };

  let options = draft.options;
  let correctAnswer = letterIndex;
  let correctLetter = draft.correct;
  let shuffleInfo = null;
  if (shuffle) {
    const shuffled = shuffleOptions(options, draft.correct, `${draft.source_file}\n${draft.stem}`);
    options = shuffled.options;
    correctAnswer = shuffled.correct_answer;
    correctLetter = shuffled.correct_letter;
    shuffleInfo = {
      seed: SHUFFLE_SEED,
      letter_before: shuffled.letter_before,
      letter_after: shuffled.correct_letter,
    };
  }

  let reference = draft.reference.replace(/Hole me's/g, "Hole's");
  const notes = [];
  if (draft.reference.includes("Hole me's")) {
    notes.push("Normalized the source typo \"Hole me's\" to \"Hole's\" in textbook_reference.");
  }

  return {
    ok: true,
    question: {
      domain: draft.domain,
      topic: DOMAIN_TOPICS[draft.domain],
      subtopic: draft.subtopic,
      exam_source: draft.subtopic,
      question_text: draft.stem,
      question_type: "multiple_choice",
      options,
      correct_answer: correctAnswer,
      correct_letter: correctLetter,
      difficulty: "medium",
      explanation: draft.rationale,
      textbook_reference: reference,
      exam_track: "2027",
      source: SOURCE,
      source_file: draft.source_file,
      source_locator: draft.source_locator,
      domain_mapping_status: draft.domain_mapping_status,
      domain_mapping_note: draft.domain_mapping_note,
      shuffle: shuffleInfo,
      parse_notes: notes,
    },
  };
}

function parseDomainII(text) {
  const blocks = splitQuestionBlocks(text, /(?=^Question\b)/m);
  const questions = [];
  const failures = [];
  blocks.forEach((block, index) => {
    if (!/Correct Answer/i.test(block)) return;
    const parsed = parseBlock(block);
    const chapter = parsed.chapter;
    const result = finishQuestion({
      ...parsed,
      stem: parsed.stem,
      domain: 2,
      subtopic: chapter ? `Hole's Chapter ${chapter}` : "Hole's Human Anatomy & Physiology",
      source_file: "domain-ii-holes.md",
      source_locator: `block ${index + 1}`,
      domain_mapping_status: "labeled_in_source_file",
      domain_mapping_note: "David's file is titled Domain II. The domain tag is his, not a proposal. He has not reviewed this parse.",
    }, { shuffle: true });
    if (!result.ok) failures.push({ file: "domain-ii-holes.md", locator: `block ${index + 1}`, failures: result.failures, preview: block.slice(0, 180) });
    else questions.push(result.question);
  });
  return { questions, failures };
}

function parseDomainIII(text) {
  const blocks = splitQuestionBlocks(text, /(?=^\d+\.\s)/m);
  const questions = [];
  const failures = [];
  blocks.forEach((block) => {
    const numberMatch = block.match(/^(\d+)\.\s/);
    if (!numberMatch || !/Correct Answer/i.test(block)) return;
    const number = Number(numberMatch[1]);
    const parsed = parseBlock(block);
    const result = finishQuestion({
      ...parsed,
      domain: 3,
      subtopic: domainIIISubtopic(number),
      source_file: "domain-iii-ethics.md",
      source_locator: `question ${number}`,
      domain_mapping_status: "labeled_in_source_file",
      domain_mapping_note: "David's file is titled Domain III and covers ethics, legislative affairs, and scope. It does not cover counseling skills. He has not reviewed this parse.",
    }, { shuffle: false });
    if (!result.ok) failures.push({ file: "domain-iii-ethics.md", locator: `question ${number}`, failures: result.failures, preview: block.slice(0, 180) });
    else questions.push(result.question);
  });
  return { questions, failures };
}

function parseKrause(text) {
  const blocks = splitQuestionBlocks(text, /(?=^(?:#{1,6}\s*)?(?:\*\*)?Question\b)/m);
  const questions = [];
  const failures = [];
  let carriedChapter = null;
  blocks.forEach((block, index) => {
    const header = block.match(/Chapter\s+(\d+)/i);
    if (header && !/Correct Answer/i.test(block)) {
      carriedChapter = Number(header[1]);
      return;
    }
    if (!/Correct Answer/i.test(block)) return;
    const parsed = parseBlock(block);
    const chapter = parsed.chapter || carriedChapter;
    if (chapter) carriedChapter = chapter;
    const proposal = chapter ? KRAUSE_CHAPTER_DOMAIN_PROPOSAL[chapter] : null;
    if (!proposal) {
      failures.push({
        file: "krause-ncp.md",
        locator: `block ${index + 1}`,
        failures: [`no proposed domain for chapter ${chapter || "unknown"}`],
        preview: block.slice(0, 180),
      });
      return;
    }
    const chapterLabel = proposal.title
      ? `Krause Chapter ${chapter}: ${proposal.title}`
      : `Krause Chapter ${chapter}`;
    const result = finishQuestion({
      ...parsed,
      domain: proposal.domain,
      subtopic: chapterLabel,
      source_file: "krause-ncp.md",
      source_locator: `chapter ${chapter}, block ${index + 1}`,
      domain_mapping_status: "proposed",
      domain_mapping_note: `PROPOSED, not confirmed by David. ${proposal.note}`,
    }, { shuffle: true });
    if (!result.ok) failures.push({ file: "krause-ncp.md", locator: `chapter ${chapter}, block ${index + 1}`, failures: result.failures, preview: block.slice(0, 180) });
    else questions.push({ ...result.question, krause_chapter: chapter });
  });
  return { questions, failures };
}

function letterCounts(questions, field) {
  const counts = {};
  for (const question of questions) {
    const letter = field === "before"
      ? (question.shuffle?.letter_before || question.correct_letter)
      : question.correct_letter;
    counts[letter] = (counts[letter] || 0) + 1;
  }
  return counts;
}

function countBy(questions, keyFn) {
  const counts = {};
  for (const question of questions) {
    const key = keyFn(question);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function parseDavidDocs(paths) {
  const domainII = parseDomainII(readFileSync(paths.domainII, "utf8"));
  const domainIII = parseDomainIII(readFileSync(paths.domainIII, "utf8"));
  const krause = parseKrause(readFileSync(paths.krause, "utf8"));
  const questions = [...domainII.questions, ...domainIII.questions, ...krause.questions].map((question, index) => ({
    id: `q2027-${String(index + 1).padStart(4, "0")}`,
    ...question,
  }));
  const failures = [...domainII.failures, ...domainIII.failures, ...krause.failures];
  return { questions, failures, byFile: {
    "domain-ii-holes.md": domainII.questions.length,
    "domain-iii-ethics.md": domainIII.questions.length,
    "krause-ncp.md": krause.questions.length,
  } };
}

function buildNotes(questions, failures) {
  const byDomain = countBy(questions, (question) => String(question.domain));
  const byFile = countBy(questions, (question) => question.source_file);
  const holes = questions.filter((question) => question.source_file === "domain-ii-holes.md");
  const ethics = questions.filter((question) => question.source_file === "domain-iii-ethics.md");
  const krause = questions.filter((question) => question.source_file === "krause-ncp.md");
  return {
    status: "Parsed from David's three source files. David has not reviewed this parse. Krause domain tags are a proposal.",
    source: SOURCE,
    shuffle_seed: SHUFFLE_SEED,
    shuffle_applied_to: ["domain-ii-holes.md", "krause-ncp.md"],
    shuffle_not_applied_to: ["domain-iii-ethics.md"],
    correct_answer_stored_as: "0-based index, matching question-bank-canonical-2026-04-08.json. The import script writes the letter to Supabase, which is what import-circle-questions.mjs did for the 2026 bank. practice.js accepts either.",
    counts: {
      total: questions.length,
      parsed_by_file: byFile,
      by_domain: byDomain,
      parse_failures: failures.length,
    },
    answer_letters_after_shuffle: {
      holes: letterCounts(holes, "after"),
      krause: letterCounts(krause, "after"),
      domain_iii_unshuffled: letterCounts(ethics, "after"),
    },
    answer_letters_before_shuffle: {
      holes: letterCounts(holes, "before"),
      krause: letterCounts(krause, "before"),
    },
    krause_by_chapter: countBy(krause, (question) => String(question.krause_chapter)),
    krause_chapter_domain_proposal: KRAUSE_CHAPTER_DOMAIN_PROPOSAL,
    gaps: [
      "No questions for Integrative Medicine, 5th ed. (Rakel). That is the likely main source for Domain IV.",
      "No questions for The Craft of Research, 5th ed. (Domain V).",
      "No questions for The Pantry Principle.",
      "Domain III counseling skills are not in David's Domain III file. Krause chapter 13 is proposed as Domain III and is the only counseling-theory set in this import. David has not confirmed that tag.",
    ],
    failures,
  };
}

function main() {
  const parsed = parseDavidDocs({
    domainII: join(root, "sources/david-2027/domain-ii-holes.md"),
    domainIII: join(root, "sources/david-2027/domain-iii-ethics.md"),
    krause: join(root, "sources/david-2027/krause-ncp.md"),
  });
  const bankPath = join(root, "question-bank-canonical-2027-11-16.json");
  const notesPath = join(root, "question-bank-canonical-2027-11-16.notes.json");
  writeFileSync(bankPath, JSON.stringify(parsed.questions, null, 2) + "\n");
  const notes = buildNotes(parsed.questions, parsed.failures);
  writeFileSync(notesPath, JSON.stringify(notes, null, 2) + "\n");
  console.log(`Wrote ${parsed.questions.length} questions to ${bankPath}`);
  console.log(`Parse failures: ${parsed.failures.length}`);
  console.log("By domain:", notes.counts.by_domain);
  console.log("By file:", notes.counts.parsed_by_file);
  console.log("Letters before shuffle (Hole's):", notes.answer_letters_before_shuffle.holes);
  console.log("Letters after shuffle (Hole's):", notes.answer_letters_after_shuffle.holes);
  console.log("Letters before shuffle (Krause):", notes.answer_letters_before_shuffle.krause);
  console.log("Letters after shuffle (Krause):", notes.answer_letters_after_shuffle.krause);
  console.log("Domain III letters (not shuffled):", notes.answer_letters_after_shuffle.domain_iii_unshuffled);
  if (parsed.failures.length) {
    for (const failure of parsed.failures.slice(0, 12)) {
      console.log("FAIL", failure.file, failure.locator, failure.failures.join("; "));
    }
  }
}

const invokedPath = process.argv[1] || "";
if (invokedPath.endsWith("parse-david-2027.mjs")) main();
