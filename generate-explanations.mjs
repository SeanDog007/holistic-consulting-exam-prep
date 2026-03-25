import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uvzfhksyjqadkxypcocq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Map domain number to textbook reference
const TEXTBOOK_REFERENCES = {
  1: "The Encyclopedia of Healing Foods, Murray & Pizzorno",
  2: "Hole's Essentials of Human Anatomy & Physiology, 14th Ed.",
  3: "NANP Code of Ethics & Scope of Practice",
  4: "Encyclopedia of Natural Medicine, Murray & Pizzorno",
  5: "The Craft of Research, 4th Ed., Booth et al.",
};

// Convert letter ("a","b","c","d") to 0-based index
function letterToIndex(letter) {
  return letter.charCodeAt(0) - "a".charCodeAt(0);
}

// Convert index back to uppercase letter for display
function indexToLetter(index) {
  return String.fromCharCode(65 + index); // A, B, C, D
}

/**
 * Build an explanation for a question using its text, correct answer, and wrong options.
 */
function generateExplanation(question) {
  const { question_text, options, correct_answer } = question;
  const correctIndex = letterToIndex(correct_answer);
  const correctLetter = indexToLetter(correctIndex);
  const correctText = options[correctIndex];

  if (!correctText) {
    return `The correct answer is ${correctLetter}.`;
  }

  // Gather wrong options
  const wrongOptions = options
    .map((opt, i) => ({ text: opt, index: i }))
    .filter((o) => o.index !== correctIndex);

  // Build the core explanation
  let explanation = `The correct answer is ${correctLetter}. ${correctText}.`;

  // Extract key concept from the question for context
  const qLower = question_text.toLowerCase();
  const correctLower = correctText.toLowerCase();

  // Add reasoning based on question patterns
  const reasoning = buildReasoning(qLower, correctLower, correctText, wrongOptions, question_text);
  if (reasoning) {
    explanation += ` ${reasoning}`;
  }

  return explanation;
}

/**
 * Build contextual reasoning based on question and answer patterns.
 */
function buildReasoning(qLower, correctLower, correctText, wrongOptions, questionText) {
  const parts = [];

  // --- "Which of the following" / identification questions ---
  if (qLower.includes("which of the following") || qLower.includes("which one")) {
    parts.push(buildWhichOfReasoning(qLower, correctText, wrongOptions));
  }

  // --- "What is the primary/main function/role" ---
  else if (qLower.includes("primary") || qLower.includes("main function") || qLower.includes("main role")) {
    parts.push(`This is the primary function in this context.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`While ${wrongEx.toLowerCase()} may be related, it is not the primary function described here.`);
    }
  }

  // --- "NOT" / "EXCEPT" questions ---
  else if (qLower.includes(" not ") || qLower.includes("except") || qLower.includes("least likely")) {
    parts.push(`${correctText} does not apply in this context.`);
    if (wrongOptions.length > 0) {
      const examples = wrongOptions.slice(0, 2).map((w) => w.text.toLowerCase()).join(" and ");
      parts.push(`The other options such as ${examples} are all valid in this scenario.`);
    }
  }

  // --- "Best" / "Most" questions ---
  else if (qLower.includes("best") || qLower.includes("most appropriate") || qLower.includes("most likely") || qLower.includes("most important")) {
    parts.push(`This is the most appropriate choice given the clinical context.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} is less applicable or accurate in this specific scenario.`);
    }
  }

  // --- "Deficiency" questions ---
  else if (qLower.includes("deficiency") || qLower.includes("deficient")) {
    parts.push(`This deficiency is directly associated with the symptoms or condition described.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`A deficiency in ${wrongEx.toLowerCase()} would present differently.`);
    }
  }

  // --- "Function" / "Role" questions ---
  else if (qLower.includes("function") || qLower.includes("role of") || qLower.includes("responsible for")) {
    parts.push(`${correctText} is the recognized function in this physiological or nutritional context.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} describes a different process or function.`);
    }
  }

  // --- "Source" / "Found in" / "Rich in" questions ---
  else if (qLower.includes("source") || qLower.includes("found in") || qLower.includes("rich in") || qLower.includes("contains")) {
    parts.push(`This is a well-established dietary source in holistic nutrition.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} is not as significant a source for the nutrient or compound in question.`);
    }
  }

  // --- "Symptom" / "Sign" / "Characterized by" ---
  else if (qLower.includes("symptom") || qLower.includes("sign") || qLower.includes("characterized")) {
    parts.push(`This is a hallmark clinical presentation associated with the condition described.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} is associated with a different condition or pathway.`);
    }
  }

  // --- "True" / "False" / factual statement questions ---
  else if (qLower.includes("true") || qLower.includes("false") || qLower.includes("correct statement")) {
    parts.push(`This statement accurately reflects the established understanding of this topic.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} contains an inaccuracy or misconception.`);
    }
  }

  // --- Ethics / Scope questions ---
  else if (qLower.includes("scope of practice") || qLower.includes("ethical") || qLower.includes("referral") || qLower.includes("client")) {
    parts.push(`This aligns with the professional standards and ethical guidelines for holistic nutrition practitioners.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} would fall outside the appropriate scope or ethical framework.`);
    }
  }

  // --- Research / study design questions ---
  else if (qLower.includes("research") || qLower.includes("study") || qLower.includes("evidence") || qLower.includes("variable") || qLower.includes("hypothesis")) {
    parts.push(`This is the correct application of research methodology principles.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} reflects a different research concept or method.`);
    }
  }

  // --- Enzyme / biochemistry questions ---
  else if (qLower.includes("enzyme") || qLower.includes("pathway") || qLower.includes("metabolism") || qLower.includes("cycle") || qLower.includes("atp")) {
    parts.push(`This is the correct biochemical component or pathway involved.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} participates in a different metabolic process.`);
    }
  }

  // --- Anatomy / body system questions ---
  else if (qLower.includes("organ") || qLower.includes("gland") || qLower.includes("hormone") || qLower.includes("tissue") || qLower.includes("system")) {
    parts.push(`This is the correct anatomical or physiological association.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} is associated with a different body system or function.`);
    }
  }

  // --- Supplement / herb / nutrient questions ---
  else if (qLower.includes("supplement") || qLower.includes("herb") || qLower.includes("vitamin") || qLower.includes("mineral") || qLower.includes("nutrient")) {
    parts.push(`This is the recognized therapeutic or nutritional application.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} has a different primary use or mechanism of action.`);
    }
  }

  // --- Fallback: generic but still useful ---
  else {
    parts.push(`This answer is correct based on the principles of holistic nutrition and the BCHN exam content domains.`);
    if (wrongOptions.length > 0) {
      const wrongEx = wrongOptions[0].text;
      parts.push(`${wrongEx} does not accurately address what is being asked.`);
    }
  }

  return parts.filter(Boolean).join(" ");
}

/**
 * Build reasoning for "which of the following" style questions.
 */
function buildWhichOfReasoning(qLower, correctText, wrongOptions) {
  if (wrongOptions.length > 0) {
    const wrongEx = wrongOptions[0].text;
    return `${correctText} is the correct choice because it directly addresses the concept described in the question. ${wrongEx} does not accurately fit this context.`;
  }
  return `${correctText} is the correct choice because it directly addresses the concept described in the question.`;
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Fetching questions without explanations...\n");

  // Supabase returns max 1000 rows per request by default; paginate to get all
  let allQuestions = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, domain, topic, question_text, options, correct_answer")
      .is("explanation", null)
      .order("domain", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching questions:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allQuestions = allQuestions.concat(data);
    console.log(`  Fetched ${allQuestions.length} questions so far...`);

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`\nTotal questions needing explanations: ${allQuestions.length}\n`);

  if (allQuestions.length === 0) {
    console.log("All questions already have explanations. Nothing to do.");
    return;
  }

  // Process in batches of 10
  const BATCH_SIZE = 10;
  let updated = 0;
  let errors = 0;
  const totalBatches = Math.ceil(allQuestions.length / BATCH_SIZE);

  for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
    const batch = allQuestions.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} questions)...`);

    // Build updates for this batch
    const updates = batch.map((q) => {
      const explanation = generateExplanation(q);
      const textbook_reference = TEXTBOOK_REFERENCES[q.domain] || null;
      return { id: q.id, explanation, textbook_reference };
    });

    // Execute updates in parallel within the batch
    const results = await Promise.allSettled(
      updates.map(({ id, explanation, textbook_reference }) =>
        supabase
          .from("questions")
          .update({ explanation, textbook_reference })
          .eq("id", id)
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled" && !result.value.error) {
        updated++;
      } else {
        errors++;
        const errMsg = result.status === "rejected"
          ? result.reason
          : result.value.error?.message;
        console.error(`  Error updating question: ${errMsg}`);
      }
    }

    console.log(`  Batch ${batchNum} done. Progress: ${updated}/${allQuestions.length} updated, ${errors} errors.`);

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < allQuestions.length) {
      await delay(200);
    }
  }

  console.log(`\nComplete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors:  ${errors}`);
  console.log(`  Total:   ${allQuestions.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
