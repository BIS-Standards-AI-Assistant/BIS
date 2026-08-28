# UI Implementation Plan

## Phase 0 — Audit
Inspect src/app, components, styles, package.json, API response types, current page, and real vs fixture data.

## Phase 1 — Global shell
Implement government-style header, navigation, responsive menu, footer, typography, and design tokens.
Acceptance: no dashboard sidebar.

## Phase 2 — Homepage
Implement service proposition, primary search, examples, service actions, verified updates, official resources, footer.

## Phase 3 — Search
Implement query, supported filters, result list, evidence indicators, pagination where needed, loading/error/empty states.

## Phase 4 — Query workspace
Implement query, product context, clarification, candidate standards, relevance explanation, evidence. Do not create a chat clone.

## Phase 5 — Evidence
Implement claim-to-source mapping, source metadata, page/section/clause, and source action.

## Phase 6 — Standard detail
Implement identity, scope, supported information, evidence, related standards.

## Phase 7 — Compare
Implement selection, structured comparison, sourced differences, evidence.

## Phase 8 — Responsive/accessibility
Desktop, tablet, mobile, keyboard, focus, reduced motion, long text.

## Phase 9 — API integration
Connect to existing:
- /api/v1/query
- /api/v1/search
- /api/v1/standards
- /api/v1/health

Use actual response contracts.

## Phase 10 — Verification
Run lint, TypeScript, browser inspection, and primary user-flow tests.

First success criterion:
real user query → relevant standard → understandable reason → inspectable evidence → useful next step.
