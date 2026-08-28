# Claude Code — UI Implementation Prompt

Read first:
- CLAUDE.md
- UI_DESIGN_SYSTEM.md
- UI_UX_PRINCIPLES.md
- UI_INFORMATION_ARCHITECTURE.md
- UI_COMPONENTS.md
- UI_DATA_AND_TRUTH_RULES.md
- UI_ACCESSIBILITY.md
- UI_IMPLEMENTATION_PLAN.md
- UI_REVIEW_CHECKLIST.md

You are the lead frontend engineer and product designer for SIH26107 — BIS Standards Navigator.

## Mission
Transform the existing frontend into a credible modern government digital service for BIS standards discovery.

The design target is:

> Official government service + modern information architecture + evidence-first standards discovery.

## Hard constraints
1. No permanent left sidebar.
2. Full-width top navigation.
3. BIS identity is primary.
4. No decorative AI imagery.
5. No purple/pink AI gradients, glowing cards, robots, holograms, or futuristic AI visuals.
6. No inaccurate BIS process diagrams.
7. No invented standards, certification, testing, announcements, dates, statistics, or confidence numbers.
8. Do not repeatedly advertise AI.
9. Preserve existing backend and API contracts.

## Build
### Homepage
- BIS header and navigation
- clear service statement
- large natural-language search
- example searches
- service actions
- verified updates only
- official resources
- institutional footer

### Search
- standards search
- supported filters
- result cards
- relevance explanation
- evidence
- empty/loading/error states

### Query workspace
- query
- product context
- clarification
- candidate standards
- relevance
- evidence
- testing/certification information when supported
- next steps

### Standard detail
- identity
- scope
- supported information
- evidence
- related standards
- source

### Compare
- selection
- structured comparison
- sourced differences
- evidence

## Critical principle
The user should experience:
search → interpretation → standards → evidence → next steps.

Do not turn this into a chat transcript.

## Before coding
Inspect the existing repository and API contracts. Reuse existing components where good. Do not rewrite the application blindly.

## Validation
After meaningful changes:
```bash
npm run lint
npx tsc --noEmit
```

Then inspect browser rendering on desktop, tablet, and mobile. Check keyboard accessibility, focus states, loading, empty, error, long content, and missing evidence.

## Final bar
A reviewer should think:

> “This looks like a serious digital public service that happens to have sophisticated AI underneath.”

Not:

> “This is another AI chatbot with a government logo.”

Start with the repository audit and then implement Phase 1 of UI_IMPLEMENTATION_PLAN.md.
