# BIS Standards Navigator

## Smart India Hackathon 2026 — SIH26107

**Problem Statement:** AI-Powered Intelligent Assistant for Indian Standards & BIS Services  
**Ministry:** Ministry of Consumer Affairs, Food & Public Distribution  
**Domain:** Software / Artificial Intelligence / Information Retrieval  
**Project:** BIS Standards Navigator

---

# 1. Executive Summary

Bureau of Indian Standards (BIS) publishes a large and continuously evolving body of Indian Standards covering products, materials, processes, testing, safety, quality and related compliance information.

For MSMEs, startups, students, manufacturers, professionals and consumers, the practical problem is often not the absence of information.

The problem is finding the **right information**, understanding whether it actually applies, verifying the evidence, and navigating from a product or real-world question to the appropriate Indian Standard and related BIS service.

BIS Standards Navigator is designed as an **evidence-first standards intelligence system**.

It accepts natural-language questions and converts them into a structured retrieval and evidence problem:

```text
User Question
      ↓
Query Normalization
      ↓
Standards Identifier Resolution
      ↓
Intent / Constraint Extraction
      ↓
Hybrid Retrieval
      ↓
ML Reranking
      ↓
Evidence Aggregation
      ↓
Coverage Analysis
      ↓
Conflict / Version Analysis
      ↓
Deterministic Grounding
      ↓
Engine Confidence
      ↓
LLM Answer Synthesis
      ↓
Citation Validation
      ↓
Grounded BIS Answer

# 23. Resource-Constrained Architecture

BIS Standards Navigator is being developed under a strict resource constraint.

The system must remain functional even when paid LLM APIs are unavailable.

Therefore:

## Core Requirement

The core standards discovery pipeline MUST NOT depend on paid LLM inference.

The following capabilities should operate without an external LLM:

- standards identifier resolution
- query normalization
- keyword retrieval
- semantic retrieval
- hybrid ranking
- ML reranking
- evidence aggregation
- coverage analysis
- conflict detection
- grounding
- confidence calculation
- citation validation
- abstention

An LLM may improve natural-language interpretation and answer presentation,
but must not be the sole mechanism through which the system becomes useful.

---

## Cost Tiers

### Tier 0 — Zero Cost

The application must remain useful with:

- PostgreSQL / pgvector
- PostgreSQL FTS
- deterministic algorithms
- open-source embedding models
- open-source rerankers
- local inference
- browser/client-side computation where appropriate

### Tier 1 — Free / Community Infrastructure

Optional use of:

- free API tiers
- free model inference
- open-source model endpoints
- community-hosted inference

These must never be hard dependencies.

### Tier 2 — Paid Infrastructure

Paid APIs may be used when available.

Examples:

- hosted LLM inference
- premium embeddings
- premium reranking
- managed AI gateways

The application must degrade gracefully when these services are unavailable.

---

## Provider Independence

The architecture must support:

```text
Local model
    ↓
Free hosted model
    ↓
Paid provider
```

---

# 24. Implementation Status (as of 2026-08-29)

Tracked in detail in `docs/ML_ENGINE.md` and `docs/EVALUATION.md`. Summary
against the pipeline in section 22, using only outcomes actually observed:

| Stage | Status | Notes |
|---|---|---|
| Query Normalization | DONE | Deterministic, unit-tested (8 tests) |
| Standards Identifier Resolution | DONE | Pre-existing, unaffected |
| Intent / Constraint Extraction | DONE | Still one LLM call; verified live |
| Hybrid Retrieval | DONE | Pre-existing, regression-tested (12/12 recall) |
| ML Reranking | DONE | Competitiveness-gated document diversity |
| Evidence Aggregation | DONE | Unit-tested against real Q17 numbers |
| Coverage Analysis | DONE | Unit-tested |
| Conflict / Version Detection | DONE | Unit-tested |
| Deterministic Grounding | DONE | Bug found and fixed via live smoke test — see docs/ML_ENGINE.md |
| Engine Confidence | DONE | Now guaranteed consistent with groundingState |
| LLM Answer Synthesis | PARTIAL | Schema round-trip verified via mocked-response tests; **a live end-to-end generation call has not yet succeeded** due to OpenRouter credit exhaustion |
| Citation Validation | DONE | Standard-number validation unit-tested against fabricated/unknown inputs |
| Abstention | PARTIAL | Deterministic grounding correctly abstains (insufficient_evidence) on a fabricated-identifier query against live retrieval data; full negative-case behavior (LLM prose + abstention wording) unverified live |

**LLM integration remains unverified in live production execution** (the
`generateAnswer()` call itself). This is a resource constraint, not a
regression — see docs/ML_ENGINE.md for the exact provider error and what
was verified instead.

## Provider architecture (added 2026-08-29)

`intent.ts` and `answer.ts` no longer call a specific LLM SDK directly —
both go through the provider adapter in `src/lib/providers/`, matching
section 23's "Provider Independence" requirement above. Full detail in
`docs/ARCHITECTURE.md`.

| Item | Status | Notes |
|---|---|---|
| Provider adapter (local / OpenRouter free / paid) | DONE | 23 unit tests, all passing with mocks, no real API key needed |
| Automatic fallback (local → free → paid) | DONE | Order is configurable via `LLM_PROVIDER`, not hardcoded |
| Evidence-only fallback | DONE | `answer.ts`'s `buildEvidenceOnlyAnswer` — used whenever every provider fails |
| Deterministic intent fast path / fallback | DONE | Skips the LLM entirely for exact-ID queries; falls back to keyword heuristics if no provider is available |
| Structured-output capability detection | DONE | Small verified allowlist for OpenRouter models; local defaults to unsupported |
| Real local (Ollama) inference tested live | PLANNED | Never tested against a real local server this session |
| Real paid-tier OpenRouter call tested live | PLANNED | Only the free tier has ever been exercised live |