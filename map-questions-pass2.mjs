import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uvzfhksyjqadkxypcocq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY required"); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Keywords that strongly indicate specific lessons (domain-aware)
const LESSON_KEYWORDS = {
  // Domain 1 lesson keywords
  "protein": "Proteins & Amino Acids",
  "amino acid": "Proteins & Amino Acids",
  "leucine": "Proteins & Amino Acids",
  "tryptophan": "Proteins & Amino Acids",
  "pepsin": "Proteins & Amino Acids",
  "carbohydrate": "Carbohydrates & Glycemic Index",
  "glycemic": "Carbohydrates & Glycemic Index",
  "glucose": "Carbohydrates & Glycemic Index",
  "insulin": "Carbohydrates & Glycemic Index",
  "blood sugar": "Carbohydrates & Glycemic Index",
  "omega-3": "Fats & Essential Fatty Acids",
  "omega-6": "Fats & Essential Fatty Acids",
  "fatty acid": "Fats & Essential Fatty Acids",
  "saturated fat": "Fats & Essential Fatty Acids",
  "trans fat": "Fats & Essential Fatty Acids",
  "epa": "Fats & Essential Fatty Acids",
  "dha": "Fats & Essential Fatty Acids",
  "linoleic": "Fats & Essential Fatty Acids",
  "cholesterol": "Fats & Essential Fatty Acids",
  "fiber": "Fiber & Digestive Support",
  "prebiotic": "Fiber & Digestive Support",
  "butyrate": "Fiber & Digestive Support",
  "inulin": "Fiber & Digestive Support",
  "vitamin a": "Fat-Soluble Vitamins",
  "vitamin d": "Fat-Soluble Vitamins",
  "vitamin e": "Fat-Soluble Vitamins",
  "vitamin k": "Fat-Soluble Vitamins",
  "retinol": "Fat-Soluble Vitamins",
  "tocopherol": "Fat-Soluble Vitamins",
  "vitamin c": "Water-Soluble Vitamins",
  "vitamin b": "Water-Soluble Vitamins",
  "thiamin": "Water-Soluble Vitamins",
  "riboflavin": "Water-Soluble Vitamins",
  "niacin": "Water-Soluble Vitamins",
  "folate": "Water-Soluble Vitamins",
  "folic acid": "Water-Soluble Vitamins",
  "cobalamin": "Water-Soluble Vitamins",
  "b12": "Water-Soluble Vitamins",
  "b6": "Water-Soluble Vitamins",
  "biotin": "Water-Soluble Vitamins",
  "pantothenic": "Water-Soluble Vitamins",
  "calcium": "Minerals & Electrolytes",
  "magnesium": "Minerals & Electrolytes",
  "zinc": "Minerals & Electrolytes",
  "iron": "Minerals & Electrolytes",
  "selenium": "Minerals & Electrolytes",
  "potassium": "Minerals & Electrolytes",
  "sodium": "Minerals & Electrolytes",
  "electrolyte": "Minerals & Electrolytes",
  "copper": "Minerals & Electrolytes",
  "iodine": "Minerals & Electrolytes",
  "chromium": "Minerals & Electrolytes",
  "mineral": "Minerals & Electrolytes",
  "antioxidant": "Antioxidants & Phytonutrients",
  "phytonutrient": "Antioxidants & Phytonutrients",
  "flavonoid": "Antioxidants & Phytonutrients",
  "carotenoid": "Antioxidants & Phytonutrients",
  "lycopene": "Antioxidants & Phytonutrients",
  "resveratrol": "Antioxidants & Phytonutrients",
  "polyphenol": "Antioxidants & Phytonutrients",
  "probiotic": "Probiotics & Fermented Foods",
  "fermented": "Probiotics & Fermented Foods",
  "lactobacillus": "Probiotics & Fermented Foods",
  "bifidobacterium": "Probiotics & Fermented Foods",
  "microbiome": "Probiotics & Fermented Foods",
  "herb": "Medicinal Herbs & Adaptogens",
  "adaptogen": "Medicinal Herbs & Adaptogens",
  "ashwagandha": "Medicinal Herbs & Adaptogens",
  "turmeric": "Medicinal Herbs & Adaptogens",
  "echinacea": "Medicinal Herbs & Adaptogens",
  "ginseng": "Medicinal Herbs & Adaptogens",
  "organic": "Whole Foods vs Processed Foods",
  "processed food": "Whole Foods vs Processed Foods",
  "whole food": "Whole Foods vs Processed Foods",
  "food additive": "Whole Foods vs Processed Foods",
  "preservative": "Whole Foods vs Processed Foods",
  "pesticide": "Food Toxins & Contaminants",
  "heavy metal": "Food Toxins & Contaminants",
  "mercury": "Food Toxins & Contaminants",
  "bpa": "Food Toxins & Contaminants",
  "mycotoxin": "Food Toxins & Contaminants",
  "food allergy": "Food Sensitivities & Elimination Diets",
  "food sensitivity": "Food Sensitivities & Elimination Diets",
  "elimination diet": "Food Sensitivities & Elimination Diets",
  "ige": "Food Sensitivities & Elimination Diets",
  "igg": "Food Sensitivities & Elimination Diets",
  "histamine": "Food Sensitivities & Elimination Diets",
  "celiac": "Food Sensitivities & Elimination Diets",
  "gluten": "Food Sensitivities & Elimination Diets",
  "vegetarian": "Dietary Philosophies",
  "vegan": "Dietary Philosophies",
  "paleo": "Dietary Philosophies",
  "mediterranean": "Dietary Philosophies",
  "ketogenic": "Dietary Philosophies",
  "macrobiotic": "Dietary Philosophies",
  "dash diet": "Dietary Philosophies",
  "pregnancy": "Nutrition Across the Lifespan",
  "prenatal": "Nutrition Across the Lifespan",
  "infant": "Nutrition Across the Lifespan",
  "pediatric": "Nutrition Across the Lifespan",
  "geriatric": "Nutrition Across the Lifespan",
  "elderly": "Nutrition Across the Lifespan",
  "breastfeed": "Nutrition Across the Lifespan",
  "lactation": "Nutrition Across the Lifespan",
  "adolescent": "Nutrition Across the Lifespan",
  "aging": "Nutrition Across the Lifespan",
  "athlete": "Nutrition Across the Lifespan",
  "water": "Hydration & Water Quality",
  "hydration": "Hydration & Water Quality",
  "dehydration": "Hydration & Water Quality",
  // Domain 4 lesson keywords
  "intake": "Client Intake & Health History",
  "health history": "Client Intake & Health History",
  "assessment": "Client Intake & Health History",
  "candida": "Gastrointestinal Conditions",
  "candidiasis": "Gastrointestinal Conditions",
  "ibs": "Gastrointestinal Conditions",
  "irritable bowel": "Gastrointestinal Conditions",
  "leaky gut": "Gastrointestinal Conditions",
  "intestinal permeability": "Gastrointestinal Conditions",
  "gerd": "Gastrointestinal Conditions",
  "reflux": "Gastrointestinal Conditions",
  "constipation": "Gastrointestinal Conditions",
  "diarrhea": "Gastrointestinal Conditions",
  "crohn": "Gastrointestinal Conditions",
  "colitis": "Gastrointestinal Conditions",
  "sibo": "Gastrointestinal Conditions",
  "h. pylori": "Gastrointestinal Conditions",
  "gallbladder": "Gastrointestinal Conditions",
  "gastric": "Gastrointestinal Conditions",
  "digestive": "Gastrointestinal Conditions",
  "diabetes": "Metabolic & Endocrine Conditions",
  "thyroid": "Metabolic & Endocrine Conditions",
  "hypothyroid": "Metabolic & Endocrine Conditions",
  "hyperthyroid": "Metabolic & Endocrine Conditions",
  "adrenal": "Metabolic & Endocrine Conditions",
  "cortisol": "Metabolic & Endocrine Conditions",
  "metabolic syndrome": "Metabolic & Endocrine Conditions",
  "weight management": "Metabolic & Endocrine Conditions",
  "obesity": "Metabolic & Endocrine Conditions",
  "insulin resistance": "Metabolic & Endocrine Conditions",
  "depression": "Neurological & Mental Health",
  "anxiety": "Neurological & Mental Health",
  "adhd": "Neurological & Mental Health",
  "insomnia": "Neurological & Mental Health",
  "sleep": "Neurological & Mental Health",
  "cognitive": "Neurological & Mental Health",
  "serotonin": "Neurological & Mental Health",
  "neurotransmitter": "Neurological & Mental Health",
  "arthritis": "Musculoskeletal, Skin & Other Systems",
  "osteoporosis": "Musculoskeletal, Skin & Other Systems",
  "skin": "Musculoskeletal, Skin & Other Systems",
  "acne": "Musculoskeletal, Skin & Other Systems",
  "eczema": "Musculoskeletal, Skin & Other Systems",
  "psoriasis": "Musculoskeletal, Skin & Other Systems",
  "asthma": "Musculoskeletal, Skin & Other Systems",
  "uti": "Musculoskeletal, Skin & Other Systems",
  "cardiovascular": "Musculoskeletal, Skin & Other Systems",
  "heart disease": "Musculoskeletal, Skin & Other Systems",
  "hypertension": "Musculoskeletal, Skin & Other Systems",
  "blood pressure": "Musculoskeletal, Skin & Other Systems",
  "supplement": "Clinical Tools & Interactions",
  "drug-nutrient": "Clinical Tools & Interactions",
  "interaction": "Clinical Tools & Interactions",
  "detox": "Clinical Tools & Interactions",
  "detoxification": "Clinical Tools & Interactions",
  "cleanse": "Clinical Tools & Interactions",
  "protocol": "Clinical Tools & Interactions",
  "dosage": "Clinical Tools & Interactions",
};

function tokenize(str) {
  return (str || "").toLowerCase();
}

async function main() {
  // Load unmapped questions (lesson_id IS NULL)
  console.log("Loading unmapped questions...");
  const { data: questions, error } = await sb
    .from("questions")
    .select("id, domain, topic, subtopic, question_text")
    .is("lesson_id", null);
  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${questions.length} unmapped questions`);

  // Load all lessons with domain
  const { data: lessons } = await sb
    .from("study_lessons")
    .select("id, title, subtitle, study_modules(domain)");

  // Build lesson lookup: title -> { id, domain }
  const lessonLookup = {};
  for (const l of lessons) {
    lessonLookup[l.title] = { id: l.id, domain: l.study_modules?.domain };
  }

  let mapped = 0;
  let stillUnmapped = 0;

  for (const q of questions) {
    const text = tokenize(q.question_text);
    let bestMatch = null;
    let bestLength = 0;

    // Try each keyword (longest match wins)
    for (const [keyword, lessonTitle] of Object.entries(LESSON_KEYWORDS)) {
      if (text.includes(keyword) && keyword.length > bestLength) {
        const lesson = lessonLookup[lessonTitle];
        if (lesson && lesson.domain === q.domain) {
          bestMatch = lesson;
          bestLength = keyword.length;
        }
      }
    }

    if (bestMatch) {
      const { error: updErr } = await sb
        .from("questions")
        .update({ lesson_id: bestMatch.id })
        .eq("id", q.id);
      if (!updErr) mapped++;
      else console.error(`Failed: ${q.id}`, updErr.message);
    } else {
      stillUnmapped++;
    }
  }

  console.log(`\nPass 2 results: ${mapped} newly mapped, ${stillUnmapped} still unmapped`);

  // Final count
  const { count: totalMapped } = await sb
    .from("questions")
    .select("id", { count: "exact", head: true })
    .not("lesson_id", "is", null);
  const { count: totalUnmapped } = await sb
    .from("questions")
    .select("id", { count: "exact", head: true })
    .is("lesson_id", null);

  console.log(`\nFinal totals: ${totalMapped} mapped, ${totalUnmapped} unmapped out of ${totalMapped + totalUnmapped}`);
  console.log("Done!");
}

main().catch(err => { console.error(err); process.exit(1); });
