# Workshop / Artifact Generation — audit and plan

Written before code, per §2 and §69.

## 1. What exists and must be reused (§2, §49)

| Capability | Status |
|---|---|
| Chat + conversation state | `src/lib/assistant-conversation.ts` — one shared thread, `AssistantMessage[]`, already the single source both surfaces read |
| Retrieval / RAG | `runQueryPipeline()` — normalization → intent → hybrid retrieval → rerank → evidence → coverage → grounding → confidence. **Reuse; do not build a second search** (§49) |
| Citations in AI responses | Yes — `evidence[]` carries `standardNumber`, `clause`, `page`, `sourceUrl` |
| Structured LLM output | `src/lib/providers/` adapter with schema round-trip (§47 satisfied by existing infrastructure) |
| Provenance UI | `src/components/trust/` — `SourceTag`, `ConfidenceIndicator`, `WhyPanel`, `InsufficientEvidence`, built in the previous increment. §23/§24/§65 build directly on these |
| Workshop surface | `WorkspacePanel` — currently three actions; Testings/Certifications are links, and are the natural hosts for artifact generation |
| Certification data | `certification_schemes` (4 rows), `qcos` (46 rows) |

## 2. What does **not** exist (§2)

| Spec requirement | Gap |
|---|---|
| Artifact abstraction (§33, §47) | **None.** No artifact type, model or store anywhere in the codebase |
| Artifact persistence (§32) | **No table.** Schema has documents/chunks/standards/sources/certificationSchemes/qcos/relationships/queryLogs — nothing for workspaces, product contexts or artifacts. Artifacts cannot survive a refresh without a migration |
| Export (§34) | **No library.** No jsPDF/docx/csv dependency |
| Access control (§41) | **No auth layer at all.** "Users should only access artifacts belonging to their workspace" has no user to scope to |
| Analytics (§61) | No analytics in the project |
| Version history (§22) | Nothing to build on; needs the artifact table first |

## 3. The blocking dependency (§3, §5, §64 Case 1)

The Workshop's premise is that it "already understands what you discussed".
That rests on Product DNA extraction — and **extraction currently returns
nothing**. Measured against the live API on the new database:

```json
"interpretation": { "product": null, "material": null, "useCase": null,
                    "targetUser": null, "sector": null }
```

for `"stainless steel water bottle for children"`. Cause (see
docs/ux/TRANSFORMATION_PLAN.md §2.1): `OPENROUTER_MODEL` is unset, so every
provider is skipped `no_structured_output_capability`, and
`deterministicIntentFallback()` populates none of the descriptive axes.

**Consequence for this feature:** the context preview (§6) would show every
Product DNA axis empty, and the missing-information engine (§7) would ask
the user for all eight — which is precisely the "fill everything again"
outcome §66 says the Workshop must not be.

**What still works today**, and what the first increment is therefore built
on: the *standards and evidence* are real. A query for the bottle returns
four verified standards with clause-level evidence. So a context extracted
from a conversation can carry real `standards[]`, real `sourceReferences[]`
and the user's own words, while marking the DNA axes honestly as unknown.

## 4. Honest scope of what can be generated (§25)

§25 forbids inventing test parameters, acceptance criteria, methods, fees,
timelines and schemes. Against the actual corpus:

| Artifact field | Groundable? |
|---|---|
| Product summary | From user's words (provenance: `user`) |
| Applicable standards, clause references | **Yes** — real retrieval, real clauses |
| Test names / parameters | **Partly** — some product manuals list test tables in `chunks`; must be quoted, never synthesised |
| Acceptance criteria, methods, equipment, sample size, frequency | **Rarely** — mostly absent from the indexed corpus. Must render as "could not be verified from the available source material" (§25) rather than be filled in |
| Certification scheme / pathway | **Partly** — 4 scheme rows, 46 QCOs |
| Fees, timelines | **No source.** Must not appear (§15, §25) |

A Testing Requirements artifact will therefore be honest but sparse until
more of the corpus is ingested. That is the correct failure mode (§65: "test
deliberately with incomplete retrieval; the system should fail safely").

## 5. Order of work (follows §67)

**P0**
1. `ProductComplianceContext` model — this increment.
2. Conversation → context extraction, deterministic — this increment.
3. Conflict detection (§55) and missing-information detection (§7) — this increment.
4. Context preview UI (§6).
5. Artifact schema + `workshop_artifacts` migration (§32, §33).
6. Testing Requirements generation over existing retrieval (§45, §49).
7. Provenance UI — already built.

**P1** Certification artifact, roadmap, checklist, chat↔workshop wiring, editing, regeneration.

**P2** Export (needs a dependency decision), version history, analytics, mobile, a11y.

## 6. Decisions needed from the maintainer

1. **`OPENROUTER_MODEL`** — unblocks Product DNA. Paid; three allowlisted models.
2. **A migration** adding `product_contexts` and `workshop_artifacts` — required by §32; artifacts cannot persist otherwise.
3. **Export dependency** — §34 needs a PDF/DOCX library added.
4. **Auth** — §41 cannot be honoured without one; until then artifacts are per-browser, not per-user, and must not be described as private.
