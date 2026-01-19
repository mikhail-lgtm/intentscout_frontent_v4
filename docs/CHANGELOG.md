# IntentScout Changelog

## 2026-01-19

### UX Improvements (Frontend)

**HubSpot Settings Page**
- Changed misleading config form to informational panel
- Sender email is automatic (user's email) - no config needed
- File: `src/components/settings/SettingsPage.tsx`

**Verticals Filter**
- Fixed dropdown to show actual verticals from loaded signals
- Removed hardcoded static list
- Files: `src/components/signals/FilterPanel.tsx`, `SignalsPage.tsx`

**DM Search Notification**
- Added notification banner when DM search completes in background
- Shows success/error/info with auto-dismiss
- File: `src/components/contacts/ContactsComponent.tsx`

**Filters Persistence**
- Created `useFilters` hook with localStorage persistence
- Filters now persist between Signals and Outreach pages
- File: `src/hooks/useFilters.ts`

**Responsive Outreach Page**
- Added responsive design for mobile/tablet
- Mobile: 1 column layout, stacked cards
- Desktop (xl): 2x2 grid layout
- File: `src/components/outreach/OutreachPage.tsx`

---

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
