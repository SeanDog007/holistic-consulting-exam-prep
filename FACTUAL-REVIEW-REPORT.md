# HCQ Exam Prep — Factual Review Report
**Reviewer:** Ryan (Research Agent) | **Date:** 2026-04-08 | **Scope:** High-risk subset (78 flagged questions)
**Fixes Applied:** Dwight | **Date Applied:** 2026-04-08 | **Both source bank + live Supabase updated**

---

## Executive Summary

| Category | Count |
|---|---|
| Total questions reviewed | 78 (of 877 in bank) |
| 🔴 Likely wrong (answer key or content error) | 5 unique issues (6 questions) |
| 🟡 Ambiguous / needs SME signoff | 5 |
| ✅ Appears factually sound | 67 |
| 📝 Typos/formatting (not factual) | 5 |

---

## 🔴 LIKELY WRONG — Urgent Corrections Needed

### 1. Q332 & Q841 — Peptide YY listed as appetite stimulant (IT'S NOT)
**Both questions are near-duplicates with the same error.**

- **Q332:** "All of the following stimulate appetite cravings and food intake, except:" → Options: ghrelin, galanin, **peptide YY**, leptin ✓
- **Q841:** "All the following stimulate food intake, except:" → Options: Ghrelin, Galanin, **Peptide YY**, Leptin ✓

**The problem:** Peptide YY (PYY) is a **satiety hormone** — it **suppresses** appetite, just like leptin. The question implies PYY stimulates appetite (since only the marked answer is the exception). Both PYY and leptin are appetite suppressants, so the question has **two correct answers**.

**Fix options:**
- Replace "Peptide YY" with an actual appetite stimulant: **neuropeptide Y (NPY)**, **orexin**, or **endocannabinoids**
- OR change the correct answer to C (Peptide YY) and remove leptin, but this changes the pedagogical intent

**Confidence: HIGH** — PYY's role as a satiety signal is textbook physiology (Guyton, Gropper, etc.)

---

### 2. Q333 — Two options are NOT components of pancreatic juice
**Q:** "All of the following are components of pancreatic juice, EXCEPT:"
- A: trypsin ✅ (is in pancreatic juice)
- B: trypsin inhibitor ✅ (is in pancreatic juice)
- C: intrinsic factor ✓ (marked correct — NOT pancreatic, it's from gastric parietal cells)
- D: pepsinogen ❌ (ALSO not pancreatic — it's from gastric chief cells)

**The problem:** Both C and D are valid answers. A student who picks D is also correct but would be marked wrong.

**Fix:** Replace pepsinogen (D) with a real pancreatic juice component: **chymotrypsin**, **pancreatic lipase**, **bicarbonate**, or **elastase**.

**Confidence: HIGH** — pepsinogen production by gastric chief cells is basic GI physiology.

---

### 3. Q349 — Soluble fibers SLOW gastric emptying (answer says they increase it)
**Q:** "Which of the following increases gastric emptying?"
- A: Pectin
- B: Gums
- C: Mucilage
- D: All of the answers are correct ✓

**The problem:** Pectin, gums, and mucilage are all **soluble/viscous fibers** that form gels in the stomach and **delay** gastric emptying. This is a well-established mechanism — it's one reason fiber promotes satiety. The correct answer should be "none of the above" or the question/options need rewriting.

**Fix options:**
- Rewrite question to: "Which of the following **delays** gastric emptying?" → then D is correct
- OR replace options with items that actually increase emptying (e.g., erythromycin, motilin agonists, metoclopramide)

**Confidence: HIGH** — soluble fiber delaying gastric emptying is foundational nutrition science (Gropper, Whitney & Rolfes).

---

### 4. Q811 — Choleretic vs. Cholagogue confusion
**Q:** "Which of the following best describes herbal choleretics?"
- A: "Herbal choleretics are herbs that promote the release of bile from the gallbladder." ✓
- B: "...stimulate the production of digestive enzymes in the pancreas."
- C: "...inhibit bile production and reduce bile flow from the gallbladder."
- D: "...inhibit bile production and reduce bile flow from the gallbladder." (DUPLICATE of C)

**The problem:** The marked answer (A) describes a **cholagogue**, not a choleretic.
- **Choleretic** = stimulates bile **production** by the liver
- **Cholagogue** = stimulates bile **release/flow** from the gallbladder

**Fix:** Change option A to: "Herbal choleretics are herbs that stimulate the **production of bile by the liver**."
Also fix the duplicate option (C and D are identical).

**Confidence: HIGH** — choleretic vs. cholagogue distinction is standard herbal pharmacology (Mills & Bone, *Principles and Practice of Phytotherapy*).

---

### 5. Q109 — Arugula is NOT a low-oxalate vegetable
**Q:** "Which of the following foods is not considered a low oxalate vegetable?"
- A: Onions
- B: Arugula
- C: Acorn squash
- D: Potatoes ✓

**The problem:** Arugula contains **moderate-to-high oxalate** levels (~40 mg per 100g in some references). It is NOT typically classified as a "low oxalate vegetable." The intended answer (potatoes) is also moderate oxalate, but arugula (B) is arguably a better answer.

**Fix options:**
- Replace arugula with a clearly low-oxalate vegetable: **lettuce**, **cabbage**, **cauliflower**, or **celery**
- OR accept that the question is ambiguous and rewrite entirely

**Confidence: MODERATE-HIGH** — oxalate values vary by source/preparation, but arugula is consistently reported as moderate+ oxalate. Potatoes are also moderate. The question is testing the wrong thing.

---

## 🟡 AMBIGUOUS — Needs SME Review

### 1. Q108 — Green peppers and oxalates
**Q:** "Which of the following foods is not considered a high oxalate food?" → D: Onions ✓
- Green peppers (option A) are **not** typically classified as high-oxalate. They're low-to-moderate.
- Beets (B) are genuinely high oxalate. Eggplant (C) is moderate.
- **Risk:** A student may correctly identify green peppers as also not high-oxalate.
- **SME question:** What oxalate reference table is the curriculum using? Green peppers are usually <10 mg/serving.

### 2. Q569 — Magnesium and sodium retention
**Q:** "Not true regarding magnesium's effect on BP?" → D: "Reduces sodium retention by the kidneys" ✓
- Magnesium does influence renal sodium handling, though this is less well-established than its NO/vasodilation effects.
- Some evidence suggests Mg supplementation increases natriuresis.
- **SME question:** Is this false enough to be the answer? The evidence is mixed, not definitively wrong.

### 3. Q610 — Low fiber diet for IBS
**Q:** "Not appropriate for IBS?" → B: Low fiber diet ✓ (options include both "Low fiber diet" and "High fiber diet")
- For IBS-D, low fiber or low FODMAP diets are commonly recommended. For IBS-C, high fiber is recommended.
- Having both "Low fiber diet" and "High fiber diet" as options with only one being "wrong" oversimplifies IBS management.
- **SME question:** Should this question specify IBS subtype? As written, it's misleading.

### 4. Q655 — Coffee/tea and asthma
**Q:** "Not a well supported recommendation for asthma?" → A: Organic coffee and tea ✓
- Caffeine is actually a **mild bronchodilator** (methylxanthine, similar to theophylline). Multiple Cochrane reviews show caffeine modestly improves lung function.
- Marking coffee/tea as "not well supported" for asthma is **arguably wrong**.
- **SME question:** Is the curriculum's position that caffeine is not a nutritional recommendation for asthma? The pharmacological evidence supports it.

### 5. Q64 — Vitamin B12 and collagen
**Q:** "Not true about micronutrients for bone health?" → D: "Vitamin B12 stimulates production of collagen" ✓
- B12 does play a role in osteoblast activity and bone metabolism. Some research links B12 deficiency to osteoporosis.
- However, **Vitamin C** is the primary vitamin that stimulates collagen synthesis, not B12.
- The answer is defensible but could confuse students who know about B12-bone health connections.
- **SME question:** Is the claim specific enough? "Stimulates production of collagen" is more accurately attributed to Vitamin C.

---

## ✅ APPEARS FACTUALLY SOUND (67 questions)

The following questions were reviewed and their answer keys appear correct:

Q0, Q10, Q12, Q13, Q15, Q28, Q41, Q69, Q92, Q147, Q158, Q161, Q168, Q169, Q170, Q172 (key correct, structural dup noted), Q239, Q250, Q268, Q281, Q339, Q351, Q353, Q365, Q370, Q374, Q413, Q421, Q439, Q466, Q469, Q533, Q559, Q564, Q578, Q587, Q601, Q604, Q606, Q611, Q614, Q615, Q620, Q624, Q634, Q648, Q657, Q667, Q669, Q672, Q674, Q703, Q715, Q727, Q733, Q735, Q740, Q754, Q756, Q761, Q765, Q788, Q794, Q829, Q853, Q871, Q874, Q875

---

## 📝 Typos & Formatting Issues Found During Review

| Q# | Issue | Fix |
|---|---|---|
| Q853 | "Hyprochlorhydria" | → "Hypochlorhydria" |
| Q788 | "Amlyase" | → "Amylase" |
| Q740 | Options A & B have embedded prefixes ("a." and "b.") | Remove "a." and "b." |
| Q172 | Vitamin E appears as both option B and D | Replace one with different vitamin |
| Q811 | Options C and D are identical text | Replace D with a distinct distractor |

---

## Correction Status (Updated 2026-04-08)

### ✅ FIXED — Applied to source bank + live Supabase

| Q# | Fix Applied |
|---|---|
| Q332 | Replaced "peptide YY" → "Neuropeptide Y" (actual appetite stimulant) |
| Q841 | Same fix as Q332 (near-duplicate question) |
| Q333 | Replaced "pepsinogen" → "chymotrypsin" (actual pancreatic component) |
| Q349 | Changed "increases gastric emptying" → "delays gastric emptying" |
| Q811 | Fixed choleretic definition + replaced duplicate option D with distinct distractor |
| Q109 | Replaced "Arugula" → "Cabbage" (clearly low oxalate) |
| Q853 | Fixed typo "Hyprochlorhydria" → "Hypochlorhydria" |
| Q788 | Fixed typo "Amlyase" → "Amylase" (2 questions) |
| Q740 | Removed embedded "a.\t" / "b.\t" prefixes from options |
| Q172 | Replaced duplicate "Vitamin E" option with "Vitamin K" |

### ⏳ AWAITING SME REVIEW — Do NOT change without Betsy/SME signoff

| Q# | Issue |
|---|---|
| Q108 | Green peppers may also not be high-oxalate — depends on reference table |
| Q569 | Magnesium and sodium retention — mixed evidence |
| Q610 | Low fiber for IBS — depends on subtype (IBS-D vs IBS-C) |
| Q655 | Coffee/tea and asthma — caffeine is a mild bronchodilator |
| Q64 | B12 and collagen — Vitamin C is the primary collagen vitamin |

---

## Files

- This report: `FACTUAL-REVIEW-REPORT.md`
- Tracking spreadsheet: `factual-review-tracker.csv`
- Dwight's audit tooling: `audit-questions.mjs`, `audit-report.json`, `AUDIT-README.md`
