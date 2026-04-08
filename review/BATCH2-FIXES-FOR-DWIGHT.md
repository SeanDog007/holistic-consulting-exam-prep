# Batch 2 — Domain 2 Fixes for Dwight
**Date:** 2026-04-08
**Reviewer:** Ryan
**Status:** Ready for implementation

All references use Domain 2 local indices (D2-Q#). In circle-questions-export.json, Domain 2 starts at global index 291 (i.e., D2-Q0 = data[291]).

---

## 🔴 URGENT FACTUAL FIXES (4)

### 1. D2-Q72 (global index 363) — WRONG ANSWER KEY
**Current Q:** "An enzyme in the stomach that can hydrolyze protein is:"
**Current options:** trypsin / bicarbonate / enterokinase
**Current answer:** 0 (trypsin)
**Problem:** Trypsin is pancreatic, not stomach.
**FIX:** Change option A from "trypsin" to "pepsin". Keep answer index 0.

### 2. D2-Q104 (global index 395) — CONTRADICTS D1-Q24
**Current Q:** "How many amino acids are considered essential?"
**Current options:** 6 / 7 / 8 (answer: 2 → "8")
**Problem:** D1-Q24 correctly says 9. Modern standard = 9 (including histidine).
**FIX:** Change option C from "8" to "9". Keep answer index 2.

### 3. D2-Q135 (global index 426) — WRONG ANSWER KEY
**Current Q:** "Which of the following is considered a carotenoid?"
**Current options:** Retinol / Retinal / Retinoic acid / All answers are correct (answer: 3)
**Problem:** These are RETINOIDS, not carotenoids.
**FIX:** Replace options:
- A: "Beta-carotene"
- B: "Lycopene"
- C: "Lutein"
- D: "All answers are correct"
Keep answer index 3.

### 4. D2-Q139 (global index 430) — WRONG TERM IN STEM
**Current Q:** "Which nutrient is an **anticoagulant** and supports the synthesis of..."
**Answer:** Vitamin K (correct)
**Problem:** Vitamin K is PRO-coagulant, not anti.
**FIX:** Change "anticoagulant" to "essential for blood clotting (coagulation)"

---

## 📝 TYPO FIXES (11)

| Global Index | D2-Q# | Find | Replace With |
|---|---|---|---|
| 292 | Q1 | "boating" | "bloating" |
| 312 | Q21 | "not an examples" | "not an example" |
| 321 | Q30 | "neurotransmitters originates" | "neurotransmitter originates" |
| 323 | Q32 | "neurotransmitters helps" | "neurotransmitter helps" |
| 326 | Q35 | "join instability" | "joint instability" |
| 359 | Q68 | "Sphincter of Ohdi" | "Sphincter of Oddi" |
| 373 | Q82 | "Option 1Trans fatty acids" | "Trans fatty acids" |
| 410 | Q119 | "thromboxane's" | "thromboxanes" |
| 420 | Q129 | "contrations" | "contractions" |
| 427 | Q136 | "heatlh" | "health" |
| 450 | Q159 | "Resveraterol" | "Resveratrol" |

---

## 📝 STRUCTURAL FIXES — Remove "Option 3" placeholders (3)

| Global Index | D2-Q# | Action |
|---|---|---|
| 308 | Q17 | Remove option C ("Option 3") — T/F question |
| 328 | Q37 | Remove option C ("Option 3") — T/F question |
| 329 | Q38 | Remove option C ("Option 3") — T/F question |

---

## 🟡 AMBIGUOUS — Needs SME Decision (defer, don't auto-fix)

| D2-Q# | Issue | Recommendation |
|---|---|---|
| Q57 | Mast cells called "type of basophil" | Leave or reword to "derived from similar progenitors" |
| Q68 | Hepatic portal vein question logic is backward | Rewrite question stem (see tracker) |
| Q73 | Bilirubin as dominant bile component | Needs SME review |
| Q116 | "Both are common" vs palmitic as most prevalent | Consider changing answer to A (palmitic) |
| Q127 | "Where is connective tissue composed" — Golgi | Reword question for clarity |
| Q178 | Trigeminal nerve "inhibiting seizures" | Needs SME review |

---

## Implementation Order
1. **First:** Apply the 4 🔴 factual fixes (answer keys and stem)
2. **Second:** Apply 11 typo fixes (string replacements)
3. **Third:** Remove 3 "Option 3" placeholders
4. **Last:** Flag ambiguous items for SME review (don't change without approval)

## Files Updated by This Review
- `full-review-batch2-domain2.csv` — question-by-question status
- `FULL-BANK-REVIEW-TRACKER.md` — master progress tracker
- `review/BATCH2-FIXES-FOR-DWIGHT.md` — this file
