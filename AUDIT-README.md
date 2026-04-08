# Question Bank Audit — HCQ Exam Prep

## Quick Start

```bash
# Run full audit (human-readable)
node audit-questions.mjs

# Output JSON report
node audit-questions.mjs --json

# Run single category
node audit-questions.mjs --category dupes
# Categories: structural, dupes, content, answer-key, format
```

## What This Audit Can and Cannot Do

### ✅ Automated (this script handles)
| Check | Description |
|-------|------------|
| **Exact duplicates** | Identical question text |
| **Near-duplicates** | Jaccard similarity >80% within same domain |
| **Out-of-bounds answers** | correct_answer index ≥ option count |
| **Empty/missing fields** | Missing question text, empty options |
| **Duplicate options** | Same option text appears twice in one question |
| **Domain assignment** | Domain 0 = unassigned |
| **Negative question flags** | "NOT", "FALSE", "EXCEPT" → high-risk for inverted answer keys |
| **Answer key distribution** | Skewed answer patterns, long same-answer runs |
| **Format issues** | HTML artifacts, double spaces, missing question marks, capitalization |
| **"All/None of the above"** | Flags for manual verification |

### ❌ Cannot Automate — Requires Human/Expert Review
| Check | Why |
|-------|-----|
| **Factual accuracy** | Is "Alcohol dehydrogenase I" really not an antioxidant? Requires domain expertise. |
| **Explanation correctness** | No explanations in current export — need to check DB |
| **Answer key correctness** | The script can flag risky patterns, but can't know if "C" is truly correct for a nutrition question |
| **Clinical accuracy** | Anatomy, biochemistry, herb-drug interactions — needs a qualified reviewer |
| **Pedagogical quality** | Is the question well-written? Does it test the right concept? |
| **Source validity** | Are textbook references correct and current? |

## First-Pass Findings (April 2026)

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Error | 42 | Exact duplicates (40), duplicate options within a question (2) |
| 🟡 Warning | 171 | 151 domain-0 unassigned, 12 near-duplicates, 6 short options, 2 answer-key skews |
| 🔍 Review | 78 | 51 negative/exception questions, 16 anatomy questions, 3 "all of the above", plus overlaps |
| ℹ️ Info | 249 | 57 T/F as MC, 156 missing question marks, 19 inconsistent caps, format noise |

## Cleanup Pass (April 8, 2026)

**Before:** 877 questions, 540 issues (42 errors)
**After:** 836 questions, 438 issues (0 errors)

| Action | Count | Detail |
|--------|-------|--------|
| Exact duplicates removed | 41 | Kept first occurrence in all cases |
| Duplicate options fixed | 2 | Q172 (Vitamin E×2), Q811 (bile inhibit×2) — removed redundant option |
| Double spaces fixed | 6 | Normalized to single spaces |
| Leading number artifacts removed | 2 | e.g., "48.\\t" prefix stripped |

### New Files
- `cleanup-questions.mjs` — Cleanup script (run with `--apply`)
- `review-queue.json` — 196 high-risk questions prioritized for SME review
- `review-status.json` — Per-question review tracking (pending/reviewed/approved/rejected)
- `cleanup-log.json` — Detailed log of every change made
- `circle-questions-export.backup.json` — Pre-cleanup backup

### Remaining Issues (not auto-fixable)
1. **115 questions in Domain 0** (unassigned) — need domain classification
2. **57 negative/exception questions** — need manual answer key verification
3. **15 anatomy/clinical questions** — need factual accuracy review
4. **7 near-duplicate pairs** — need human judgment on merge vs. keep

### Critical Issues (historical)
1. ~~**40 exact duplicate questions**~~ ✅ FIXED — deduplicated
2. **151→115 questions in Domain 0** (unassigned) — need domain classification
3. ~~**2 questions with duplicate options** (Q172, Q811)~~ ✅ FIXED — removed duplicate options
4. **78→57 high-risk "negative" questions** — the hepatic portal bug was exactly this type. Each needs manual review.

## Recommended Workflow for Full Accuracy Audit

### Phase 1: Fix Automated Findings (Dwight, ~2 hours) — ✅ COMPLETE
- [x] Remove 41 exact duplicates from export
- [x] Fix 2 questions with duplicate options (Q172, Q811)
- [x] Clean format issues (double spaces, whitespace, number artifacts)
- [ ] Assign domain to 115 domain-0 questions (needs SME input)
- [ ] Sync cleaned export back to Supabase DB

### Phase 2: Manual Review of High-Risk Questions (Subject Matter Expert, ~4-6 hours)
- [ ] Review all 78 flagged negative/exception questions — verify answer keys are correct
- [ ] Review all 16 anatomy-related questions for factual accuracy
- [ ] Spot-check 10% of remaining questions per domain

### Phase 3: Full Content Review (Subject Matter Expert, ~20-40 hours)
- [ ] Domain expert reviews every question + answer for factual accuracy
- [ ] Add explanations where missing
- [ ] Add textbook references
- [ ] Verify difficulty ratings

### Phase 4: Ongoing QA
- Run `node audit-questions.mjs` before every import/export
- Add to CI if question bank changes are committed to repo
- Flag-count in Supabase tracks student-reported issues — review periodically

## Files
- `audit-questions.mjs` — The audit script
- `audit-report.json` — Latest JSON report (machine-readable)
- `AUDIT-README.md` — This file
