/**
 * Extract all quiz questions from Circle NANP Exam Prep course
 * Uses Puppeteer to navigate the Circle editor and extract questions.
 *
 * Usage: CIRCLE_COOKIE="<your-session-cookie>" node extract-circle-questions.mjs
 *
 * To get CIRCLE_COOKIE:
 * 1. Open Chrome DevTools on circle.so while logged in
 * 2. Go to Application → Cookies → circle.so
 * 3. Copy the value of the "_circle_session" cookie
 */
import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const BASE = 'https://holistic-consulting-59a7b5.circle.so/c/nanp-exam-prep';

// All exam lesson URLs (collected from manual browsing)
const EXAM_LESSONS = [
  // Overview
  { url: `${BASE}/edit-lesson/sections/353189/lessons/1609240`, name: 'Full Length Comprehensive Exam', domain: 0 },
  // Domain 1: Food and Nutrition (35%)
  { url: `${BASE}/edit-lesson/sections/351134/lessons/1400430`, name: 'Domain 1 Exam 1', domain: 1 },
  { url: `${BASE}/edit-lesson/sections/351134/lessons/1413017`, name: 'Domain 1 Exam 2', domain: 1 },
  { url: `${BASE}/edit-lesson/sections/351134/lessons/1424801`, name: 'Domain 1 Exam 3', domain: 1 },
  { url: `${BASE}/edit-lesson/sections/351134/lessons/1446198`, name: 'Domain 1 Exam 4', domain: 1 },
  { url: `${BASE}/edit-lesson/sections/351134/lessons/1468619`, name: 'Domain 1 Exam 5', domain: 1 },
  { url: `${BASE}/edit-lesson/sections/351134/lessons/1483138`, name: 'Domain 1 Exam 6', domain: 1 },
  // Domain 2: Anatomy, Physiology, Biochemistry (15%)
  { url: `${BASE}/edit-lesson/sections/350980/lessons/1345812`, name: 'Domain 2 Exam 1', domain: 2 },
  { url: `${BASE}/edit-lesson/sections/350980/lessons/1352457`, name: 'Domain 2 Exam 2', domain: 2 },
  { url: `${BASE}/edit-lesson/sections/350980/lessons/1361155`, name: 'Domain 2 Exam 3', domain: 2 },
  { url: `${BASE}/edit-lesson/sections/350980/lessons/1368265`, name: 'Domain 2 Exam 4', domain: 2 },
  { url: `${BASE}/edit-lesson/sections/350980/lessons/1377964`, name: 'Domain 2 Exam 5', domain: 2 },
  // Domain 3: Counseling/Ethics/Scope (10%)
  { url: `${BASE}/edit-lesson/sections/350105/lessons/1325285`, name: 'Domain 3 Exam 1', domain: 3 },
  { url: `${BASE}/edit-lesson/sections/350105/lessons/1335048`, name: 'Domain 3 Exam 2', domain: 3 },
  { url: `${BASE}/edit-lesson/sections/350105/lessons/1340378`, name: 'Domain 3 Exam 3', domain: 3 },
  // Domain 4: Nutrition in Practice (30%)
  { url: `${BASE}/edit-lesson/sections/350104/lessons/1490892`, name: 'Domain 4 Exam 1', domain: 4 },
  { url: `${BASE}/edit-lesson/sections/350104/lessons/1515228`, name: 'Domain 4 Exam 2', domain: 4 },
  { url: `${BASE}/edit-lesson/sections/350104/lessons/1545116`, name: 'Domain 4 Exam 3', domain: 4 },
  // Domain 5: Research (10%)
  { url: `${BASE}/edit-lesson/sections/350095/lessons/1312748`, name: 'Domain 5 Exam 1', domain: 5 },
  { url: `${BASE}/edit-lesson/sections/350095/lessons/1316145`, name: 'Domain 5 Exam 2', domain: 5 },
  { url: `${BASE}/edit-lesson/sections/350095/lessons/1321751`, name: 'Domain 5 Exam 3', domain: 5 },
];

const DOMAIN_TOPICS = {
  0: 'Comprehensive',
  1: 'Food and Nutrition',
  2: 'Anatomy, Physiology, and Biochemistry',
  3: 'Counseling, Ethics, and Scope of Practice',
  4: 'Nutrition in Practice',
  5: 'Research',
};

// Extract questions from a loaded page
async function extractQuestions(page) {
  return page.evaluate(() => {
    const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(cb => !cb.id);
    const seen = new Set();
    const questions = [];
    for (const cb of cbs) {
      let opt = cb;
      for (let i = 0; i < 5; i++) opt = opt.parentElement;
      const container = opt.parentElement;
      if (!container || seen.has(container)) continue;
      seen.add(container);
      const kids = Array.from(container.children);
      if (kids.length < 3) continue;
      const qText = kids[0].textContent.trim();
      if (qText.length < 5) continue;
      const options = [];
      let correctIdx = -1;
      for (let i = 1; i < kids.length; i++) {
        const optText = kids[i].textContent.trim();
        const optCb = kids[i].querySelector('input[type="checkbox"]:not([id])');
        if (optCb && optCb.checked) correctIdx = options.length;
        options.push(optText);
      }
      questions.push({ question: qText, options, correctAnswer: correctIdx });
    }
    return questions;
  });
}

async function main() {
  // Connect to Chrome's remote debugging port
  // Start Chrome with: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
  // Or use puppeteer.launch with a fresh profile and manually log in first

  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    console.log('Connected to running Chrome instance');
  } catch {
    console.log('Could not connect to Chrome. Launching new instance...');
    console.log('You will need to log into Circle manually in the browser that opens.');
    browser = await puppeteer.launch({ headless: false });
    const loginPage = await browser.newPage();
    await loginPage.goto('https://holistic-consulting-59a7b5.circle.so/sign_in');
    console.log('Please log in to Circle in the browser window, then press Enter here...');
    await new Promise(r => process.stdin.once('data', r));
    await loginPage.close();
  }
  const page = await browser.newPage();

  const allQuestions = [];
  const examResults = [];

  for (const lesson of EXAM_LESSONS) {
    console.log(`Extracting: ${lesson.name}...`);
    await page.goto(lesson.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for quiz content to render

    const questions = await extractQuestions(page);
    console.log(`  → ${questions.length} questions`);

    examResults.push({
      name: lesson.name,
      domain: lesson.domain,
      questionCount: questions.length,
    });

    for (const q of questions) {
      allQuestions.push({
        domain: lesson.domain,
        topic: DOMAIN_TOPICS[lesson.domain],
        exam_source: lesson.name,
        question_text: q.question,
        question_type: 'multiple_choice',
        options: q.options,
        correct_answer: q.correctAnswer,
        difficulty: 'medium',
        source: 'circle_import',
      });
    }
  }

  await browser.close();

  // Write results
  const outputPath = new URL('./circle-questions-export.json', import.meta.url).pathname;
  writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2));

  console.log('\n=== EXTRACTION COMPLETE ===');
  console.log(`Total questions: ${allQuestions.length}`);
  console.log(`Output: ${outputPath}\n`);
  console.log('Per domain:');
  for (const [d, topic] of Object.entries(DOMAIN_TOPICS)) {
    const count = allQuestions.filter(q => q.domain === Number(d)).length;
    if (count > 0) console.log(`  Domain ${d} (${topic}): ${count}`);
  }
  console.log('\nPer exam:');
  for (const r of examResults) {
    console.log(`  ${r.name}: ${r.questionCount}`);
  }
}

main().catch(console.error);
