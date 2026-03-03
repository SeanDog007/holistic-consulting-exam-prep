/**
 * One-time migration: Circle course content → Supabase
 * Run: node migrate-circle-content.mjs
 *
 * Circle HTML format:
 * - Study guides: sections delimited by <p><strong>Header</strong></p>
 * - Practice exams: <ul><li><p>Question<br>a. opt<br>b. opt...</p></li></ul>
 * - Answer keys: <p><strong>Answer Key N</strong></p> followed by <ul><li><p>letter. answer</p></li></ul>
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uvzfhksyjqadkxypcocq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var before running.');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const CONTENT_DIR = '/tmp/circle_content';

// ── Study Guide Content ──

const STUDY_FILES = [
  { domain: 1, files: ['domain1_study_guide.html', 'domain1_key_concepts.html'], labels: ['Study Guide', 'Key Concepts'] },
  { domain: 2, files: ['domain2_study_guide.html', 'domain2_key_concepts.html'], labels: ['Study Guide', 'Key Concepts'] },
  { domain: 3, files: ['domain3_study_guide_and_key_concepts.html'], labels: ['Study Guide & Key Concepts'] },
  { domain: 4, files: ['domain4_study_guide.html', 'domain4_key_concepts.html'], labels: ['Study Guide', 'Key Concepts'] },
  { domain: 5, files: ['domain5_study_guide.html', 'domain5_key_concepts.html'], labels: ['Study Guide', 'Key Concepts'] },
];

/**
 * Split study guide HTML into sections by <strong> headers in <p> tags.
 * Circle HTML uses <p><strong>Section Title</strong></p> as section delimiters,
 * NOT <h2> or <h3> tags.
 */
function splitIntoSections(html) {
  const sections = [];

  // Remove HTML comment headers (<!-- Lesson: ... -->)
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Strategy: split on <p><strong>Header Text</strong></p> or <p><strong>Header Text:</strong></p>
  // These bold paragraphs serve as section headers in Circle's HTML
  // We look for <p> tags that contain ONLY a <strong> element (the header pattern)
  // vs <p> tags that have mixed content (regular paragraphs with some bold text)

  // Match standalone bold headers: <p><strong>Title</strong></p> or <p><strong>Title:</strong></p>
  // These are NOT inline bold within sentences — they're the entire paragraph content
  const headerPattern = /<p>\s*<strong>\s*([^<]+?)\s*<\/strong>\s*<\/p>/g;

  // Find all header positions
  const headers = [];
  let m;
  while ((m = headerPattern.exec(html)) !== null) {
    const title = m[1].trim().replace(/:$/, '').trim();
    // Skip very short or empty titles, and skip non-content markers
    if (title.length < 3) continue;
    // Skip if it's just whitespace or nbsp
    if (/^[\s\u00a0]+$/.test(title)) continue;
    headers.push({ title, index: m.index, fullMatch: m[0], endIndex: m.index + m[0].length });
  }

  if (headers.length === 0) {
    // No bold headers found — treat entire file as one section
    const cleaned = html.replace(/<div>|<\/div>/g, '').trim();
    if (cleaned.length > 100) {
      sections.push({ title: 'Overview', content: cleaned });
    }
    return sections;
  }

  // Content before first header = intro
  const introContent = html.slice(0, headers[0].index).replace(/<div>|<\/div>/g, '').trim();
  if (introContent.length > 100) {
    sections.push({ title: 'Introduction', content: introContent });
  }

  // Each header starts a section that runs until the next header
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].endIndex;
    const end = i + 1 < headers.length ? headers[i + 1].index : html.length;
    let content = html.slice(start, end).replace(/<div>|<\/div>/g, '').trim();

    // Remove trailing empty paragraphs
    content = content.replace(/(<p>\s*<br\s*\/?>\s*<\/p>\s*)+$/, '').trim();

    if (content.length > 50) {
      sections.push({ title: headers[i].title, content });
    }
  }

  return sections;
}

// Topics that appear frequently on the exam
const EXAM_ALERT_KEYWORDS = [
  'detox', 'digestion', 'endocrine', 'thyroid', 'adrenal', 'blood sugar',
  'inflammation', 'immune', 'vitamin', 'mineral', 'macro', 'amino acid',
  'fatty acid', 'omega', 'antioxidant', 'scope of practice', 'ethics',
  'assessment', 'counseling techniques', 'research design', 'evidence-based',
  'supplement', 'herb-drug', 'contraindic',
];

function isExamAlert(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  return EXAM_ALERT_KEYWORDS.some(kw => text.includes(kw));
}

async function importStudyGuides() {
  console.log('=== Importing Study Guide Sections ===\n');
  let totalSections = 0;

  for (const { domain, files, labels } of STUDY_FILES) {
    let sectionOrder = 1;

    for (let f = 0; f < files.length; f++) {
      const filename = files[f];
      const label = labels[f];

      let html;
      try {
        html = readFileSync(`${CONTENT_DIR}/${filename}`, 'utf8');
      } catch {
        console.log(`  Skipping ${filename} (not found)`);
        continue;
      }

      const sections = splitIntoSections(html);
      console.log(`  Domain ${domain} ${label}: ${sections.length} sections`);

      for (const section of sections) {
        const title = `${label}: ${section.title}`;
        const examAlert = isExamAlert(section.title, section.content);

        const { error } = await sb.from('study_guide_sections').insert({
          domain,
          section_order: sectionOrder,
          title,
          content_html: section.content,
          exam_alert: examAlert,
        });

        if (error) {
          console.log(`    ERROR: ${error.message} — "${title.slice(0, 60)}"`);
        } else {
          if (examAlert) {
            console.log(`    [EXAM ALERT] ${title.slice(0, 60)}`);
          }
          sectionOrder++;
          totalSections++;
        }
      }
    }
  }

  console.log(`\nTotal study guide sections imported: ${totalSections}\n`);
}

// ── Practice Questions ──
// practice_exam_questions.html: 5 tests × 10 MCQs
//
// HTML structure:
//   <p><strong>Test N</strong></p>
//   <ul>
//     <li><p>Question text<br>a. option A<br>b. option B<br>c. option C<br>d. option D</p></li>
//     ...10 questions...
//   </ul>
//   <p><strong>Answer Key N</strong></p>
//   <ul>
//     <li><p>letter. full correct answer text</p></li>
//     ...10 answers...
//   </ul>

function parseQuestions(html) {
  // Remove comment headers
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  const allQuestions = [];

  // Split by Test/Answer Key headers
  // Find all <p><strong>Test N</strong></p> and <p><strong>Answer Key N</strong></p>
  const sectionPattern = /<p><strong>((?:Test|Answer Key)\s*(\d+))<\/strong><\/p>/g;
  const sectionMarkers = [];
  let sm;
  while ((sm = sectionPattern.exec(html)) !== null) {
    sectionMarkers.push({
      type: sm[1].toLowerCase().startsWith('answer') ? 'answers' : 'test',
      num: parseInt(sm[2]),
      index: sm.index,
      endIndex: sm.index + sm[0].length,
    });
  }

  // Group into test sections and their answer keys
  const tests = [];
  for (let i = 0; i < sectionMarkers.length; i++) {
    const marker = sectionMarkers[i];
    const nextIndex = i + 1 < sectionMarkers.length ? sectionMarkers[i + 1].index : html.length;
    const sectionHtml = html.slice(marker.endIndex, nextIndex);

    if (marker.type === 'test') {
      tests.push({ num: marker.num, questionsHtml: sectionHtml, answersHtml: '' });
    } else if (marker.type === 'answers') {
      // Find matching test
      const test = tests.find(t => t.num === marker.num);
      if (test) test.answersHtml = sectionHtml;
    }
  }

  console.log(`  Found ${tests.length} test sections`);

  for (const test of tests) {
    // Parse answer key first
    // Each answer is in <li><p>letter. answer text</p></li>
    const answerPattern = /<li><p>([a-d])\.\s*(.*?)<\/p><\/li>/gi;
    const answers = [];
    let am;
    while ((am = answerPattern.exec(test.answersHtml)) !== null) {
      answers.push(am[1].toLowerCase());
    }

    // Parse questions
    // Each question is in <li><p>Question text<br>a. opt<br>b. opt<br>c. opt<br>d. opt</p></li>
    const questionPattern = /<li><p>([\s\S]*?)<\/p><\/li>/gi;
    let qm;
    let qIdx = 0;

    while ((qm = questionPattern.exec(test.questionsHtml)) !== null) {
      const rawContent = qm[1];

      // Split on <br> or <br/> or <br />
      const parts = rawContent.split(/<br\s*\/?>/i).map(p => p.trim()).filter(Boolean);

      if (parts.length < 3) continue; // Need at least question + 2 options

      // First part is the question text (may contain <strong> tags)
      let questionText = parts[0].replace(/<[^>]+>/g, '').trim();

      // Remaining parts are options: "a. text", "b. text", etc.
      const options = [];
      for (let i = 1; i < parts.length; i++) {
        const optText = parts[i].replace(/<[^>]+>/g, '').trim();
        const optMatch = optText.match(/^[a-d]\.\s*(.*)/i);
        if (optMatch) {
          options.push(optMatch[1].trim());
        }
      }

      if (questionText.length > 10 && options.length >= 2) {
        const correctLetter = answers[qIdx] || null;

        allQuestions.push({
          test_num: test.num,
          question_num: qIdx + 1,
          question_text: questionText,
          options,
          correct_answer: correctLetter,
        });
      }

      qIdx++;
    }

    console.log(`  Test ${test.num}: ${qIdx} questions, ${answers.length} answers`);
  }

  return allQuestions;
}

async function importQuestions() {
  console.log('=== Importing Practice Questions ===\n');

  let html;
  try {
    html = readFileSync(`${CONTENT_DIR}/practice_exam_questions.html`, 'utf8');
  } catch {
    console.log('practice_exam_questions.html not found');
    return;
  }

  const questions = parseQuestions(html);
  console.log(`\n  Total parsed: ${questions.length} questions`);

  let imported = 0;
  for (const q of questions) {
    if (!q.correct_answer) {
      console.log(`  Skipping Test ${q.test_num} Q${q.question_num}: no answer key`);
      continue;
    }

    const { error } = await sb.from('questions').insert({
      domain: 1, // All practice exam questions are Domain 1 (Food & Nutrition)
      topic: 'General Practice',
      subtopic: `Practice Test ${q.test_num}`,
      difficulty: 2,
      cognitive_level: 'application',
      question_type: 'mc',
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: null,
      textbook_reference: null,
    });

    if (error) {
      console.log(`  ERROR Test ${q.test_num} Q${q.question_num}: ${error.message}`);
    } else {
      imported++;
    }
  }

  console.log(`\nTotal questions imported: ${imported}\n`);
}

// ── Run ──
async function main() {
  console.log('Circle Content Migration\n');
  console.log('========================\n');

  await importStudyGuides();
  await importQuestions();

  // Summary
  const { count: sectionCount } = await sb.from('study_guide_sections').select('*', { count: 'exact', head: true });
  const { count: questionCount } = await sb.from('questions').select('*', { count: 'exact', head: true });

  console.log('=== Migration Complete ===');
  console.log(`Study guide sections in DB: ${sectionCount}`);
  console.log(`Questions in DB: ${questionCount}`);
}

main().catch(console.error);
