# Batch 4: Domain 4 — Fixes for Dwight

**Date:** 2026-04-08
**Reviewer:** Ryan (Research Agent)
**Domain:** 4 — Nutrition in Practice
**Questions reviewed:** 175

## 🔴 FACTUAL ERRORS (2) — URGENT

### D4-Q132 — WRONG ANSWER KEY
**Q:** "What is the most common cause of deficiencies in iron?"
**Options:** 0: Execessive exercise | 1: Excessive blood loss | 2: Deficiencies in B12 and/or folic acid
**Current answer:** 2 (Deficiencies in B12 and/or folic acid)
**Issue:** The most common cause of iron deficiency worldwide is **blood loss** (menstruation, GI bleeding, etc.). B12/folate deficiency causes megaloblastic anemia — a different condition entirely. Option 1 is the correct answer.
**Fix:** Change `correct_answer` from `2` to `1`. Also fix typo: "Execessive" → "Excessive"
**Priority:** 🔴 HIGH — wrong answer key teaches incorrect information.

### D4-Q173 — WRONG TERMINOLOGY (FACTUAL)
**Q:** "The most common cause of chronic kidney disease (CKD) is:"
**Options:** 0: Glomerulonephritis | 1: Hypertension | 2: Diabetic neuropathy | 3: Kidney stones
**Current answer:** 2 (Diabetic neuropathy)
**Issue:** "Diabetic **neuropathy**" = nerve damage. The correct term is "diabetic **nephropathy**" = kidney damage. Diabetic nephropathy IS the #1 cause of CKD. The answer concept is right but the word is wrong — students studying for a board exam will notice.
**Fix:** Change option 2 text from "Diabetic neuropathy" to "Diabetic nephropathy"
**Priority:** 🔴 HIGH — critical medical terminology error.

---

## 🟡 AMBIGUOUS (2)

### D4-Q17 — Misleading wording ("support infections")
**Q:** "Which of the following statements is true about crushed raw garlic?"
**Answer:** "Crushed raw garlic can support infections, especially if left exposed to the air for 15 minutes after being crushed."
**Issue:** "Support infections" literally means helping/promoting infections. Should say "fight infections" or "support the body against infections." The 15-minute allicin activation is correct science.
**Fix suggestion:** Change "can support infections" → "can help fight infections"
**Priority:** MEDIUM — confusing wording that says the opposite of what's meant.

### D4-Q175 — Evening Primrose + Latin name typos
**Q:** "The following herb has been shown to relieve symptoms of premenstrual syndrome and menopause"
**Answer:** Evening Primrose (Oenthera biennis)
**Issue:** (1) Chaste Tree (Vitex) is arguably more established for PMS specifically, though Evening Primrose is used for both conditions — defensible. (2) Latin name typos: "Oenthera biennis" → "Oenothera biennis" and "Leonurus cardiac" → "Leonurus cardiaca"
**Fix:** Correct the Latin binomials. Flag for SME if answer choice is debatable.
**Priority:** LOW-MEDIUM

---

## 📝 TYPOS & GRAMMAR (17 issues across 15 questions)

| # | D4-Q# | Issue | Fix |
|---|-------|-------|-----|
| 1 | Q7 | "progress loss of memory" | → "progressive loss of memory" |
| 2 | Q9 | "Option Anaphylaxis" (option 1, leftover prefix) | → "Anaphylaxis" |
| 3 | Q12 | "Nigh shade vegetables" (option 1) | → "Nightshade vegetables" |
| 4 | Q16 | "well support for reducing" | → "well supported for reducing" |
| 5 | Q19 | "while is appears" | → "while it appears" |
| 6 | Q38 | "What is the primary symptoms" | → "What is the primary symptom" or "What are the primary symptoms" |
| 7 | Q71 | "Mmilk" (option 1) | → "Milk" |
| 8 | Q79 | "the follow will not" | → "the following will not" |
| 9 | Q91 | "more that 2 times" | → "more than 2 times" |
| 10 | Q91 | "the follow recommendations" | → "the following recommendations" |
| 11 | Q92 | "A diet free or stimulants" | → "A diet free of stimulants" |
| 12 | Q117 | "negatively impact on" | → "negative impact on" |
| 13 | Q117 | "and and functions" | → "and functions" |
| 14 | Q121 | "the follow will likely" | → "the following will likely" |
| 15 | Q125 | "conversation of T4 to T3" | → "conversion of T4 to T3" |
| 16 | Q125 | "will ____ are needed" | → "while ____ are needed" |
| 17 | Q127 | "too little" (sentence start, lowercase) | → "Too little" |
| 18 | Q132 | "Execessive" (option 0) | → "Excessive" |
| 19 | Q148 | "Thryoid" (option 2) | → "Thyroid" |
| 20 | Q175 | "Oenthera biennis" | → "Oenothera biennis" |
| 21 | Q175 | "Leonurus cardiac" | → "Leonurus cardiaca" |

---

## ✅ ANSWER KEYS VERIFIED CORRECT (173 of 175)

2 questions have answer key issues (D4-Q132 wrong key, D4-Q173 wrong terminology). The remaining 173 answer keys are factually correct.

### Notable Verifications
- **D4-Q3**: AIDS protein 2 g/kg — supported in clinical nutrition literature ✓
- **D4-Q17**: Garlic 15-min allicin activation — correct science ✓
- **D4-Q19**: Soy contraindicated in estrogen-sensitive breast cancer — correct ✓
- **D4-Q25**: Oats/millet/buckwheat removal with celiac — correct (cross-contamination risk) ✓
- **D4-Q28**: Triglycerides 200-499 = "high risk" — aligns with NCEP ATP III ✓
- **D4-Q30**: 80/20 endogenous/dietary cholesterol — correct ✓
- **D4-Q50**: LDL <100 mg/dL for CHD patients — correct per AHA/ACC ✓
- **D4-Q52**: Stress → renin release via sympathetic activation — correct ✓
- **D4-Q54**: Magnesium does NOT reduce sodium retention — correct (that's not its mechanism) ✓
- **D4-Q83**: Arsenic in water → poor glucose control — well-supported research ✓
- **D4-Q85**: Nurses/firefighters/police at risk for metabolic disease (shift work) — correct ✓
- **D4-Q121**: Baking potato > boiling for glycemic index — correct ✓
- **D4-Q125**: Iodine + tyrosine for T4; copper + zinc + selenium for T4→T3 — correct ✓
- **D4-Q132**: Iron deficiency cause — WRONG (see factual errors above)
- **D4-Q135**: Ferritin for iron deficiency diagnosis — correct ✓
- **D4-Q148**: Soy contraindicated in breast cancer — correct ✓
- **D4-Q158**: MS oligoclonal bands in CSF — correct ✓
- **D4-Q163**: Diverticulitis + seeds not harmful — reflects current evidence ✓
- **D4-Q165**: Jarisch-Herxheimer reaction — correct description ✓
- **D4-Q172**: Calcium 1200 mg/day for osteoporosis — aligns with NIH guidelines ✓
