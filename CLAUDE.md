@AGENTS.md

# BIS Standards Navigator — Claude Code Instructions

## Mission
Build SIH26107, an evidence-first government digital service for discovering Indian Standards and BIS service information.

The product must feel like a **credible official public service**, not a SaaS dashboard and not an AI chatbot.

## Non-negotiables
- No permanent left sidebar.
- Use a full-width government-style top navigation.
- BIS identity is primary.
- No AI-slop aesthetics: no glowing AI cards, neon gradients, robots, holograms, decorative AI blobs, or excessive glassmorphism.
- No invented BIS standards, titles, clauses, certification routes, testing requirements, announcements, statistics, or confidence scores.
- AI is an assistance layer, not the visual identity.
- Evidence must be easy to inspect.
- Preserve existing Next.js/TypeScript, Neon/pgvector, retrieval, citation, and API architecture.

## Core journey
User describes product/process
→ system understands context
→ candidate standards
→ relevance explanation
→ source evidence
→ testing/certification information
→ next steps.

## Global structure
Use a full-width header with BIS identity and appropriate navigation such as:
Home | Standards | Certification | Testing | Resources | e-Services | About BIS
plus language and search controls where appropriate.

Do not use a dashboard sidebar.

## Homepage
Prioritize:
1. Clear service proposition.
2. Large natural-language standards search.
3. Example searches.
4. Main service actions.
5. Real/verified updates only.
6. Recent searches only when real or clearly marked demo data.
7. Official resources.
8. Institutional footer.

## Evidence-first UX
Every substantive AI claim should have a path:
Claim → Why relevant → Evidence → Source document → page/section/clause when available.

## Truthfulness
If evidence is insufficient, say so. Never manufacture certainty.

## Implementation
Before changing code:
1. Inspect current app structure.
2. Inspect components and styles.
3. Inspect API contracts.
4. Identify real vs fixture data.
5. Reuse good existing components.
6. Implement incrementally.

After meaningful changes:
```bash
npm run lint
npx tsc --noEmit
```

Also inspect desktop, tablet, mobile, keyboard navigation, loading, empty, error, long-text, and missing-evidence states.

## Acceptance test
A new user should understand within one minute:
- What can I search?
- Can this find the applicable Indian Standard?
- Why trust the result?
- Can I inspect the source?
- What should I do next?

## Related docs
See `docs/ui/` for the full UI specification: design system, UX principles,
information architecture, component spec, data/truth rules, accessibility
requirements, implementation plan, and review checklist.
