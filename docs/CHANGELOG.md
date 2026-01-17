# IntentScout Changelog

## 2026-01-17

### Signal Quality Improvements (Backend)

**Tier 2 Pre-LLM Filter**
- Added keyword-based pre-filter before LLM call to skip irrelevant companies
- PRODUCT_KEYWORDS: salesforce, sap, xr_vr specific terms synced with prompts
- INTENT_INDICATORS: generic role/project keywords (architect, implementation, transformation)
- Conservative approach - only skips if NO keywords found

**Stage 2 Removal**
- Removed redundant GPT-5.1 validation stage (was duplicating Product Penalties + Stage 3)
- Cost savings: GPT-5.1 was $1.25/$10 per 1M tokens

**Model Upgrade**
- Upgraded main LLM from Gemini 2.0 Flash Lite to Gemini 2.5 Flash
- Better quality with roughly same cost

### Bug Fixes

**Jobs not showing in "Evidence from Job Postings"**
- Problem: Job IDs stored URL-encoded in MongoDB (e.g. `%E2%80%93`), but browser auto-decoded when sending API request
- Fix: Added `encodeURIComponent` for job IDs in `apiClient.ts`
- File: `src/lib/apiClient.ts`

**DM Finder LinkedIn links not working**
- Problem: LLM sometimes returned URLs without `https://` protocol, browser treated as relative path
- Fix:
  - Backend: Added URL normalization in `_fix_linkedin_urls()` to add `https://` if missing
  - Frontend: Added safeguard in href for old data
- Files:
  - Backend: `api_v4/decision_makers/experimental_core.py`
  - Frontend: `src/components/decision-makers/DecisionMakerPopup.tsx`

---

## Format Guide

```
## YYYY-MM-DD

### Category (Backend/Frontend/Infrastructure)

**Feature/Fix Name**
- Brief description
- Technical details if needed
- Files changed
```
