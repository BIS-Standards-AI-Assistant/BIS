# High-Level Design — BIS Standards Navigator

Last updated: 2026-08-30. Diagrams reflect the architecture actually implemented and tested — cross-referenced against [`docs/ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/ML_ENGINE.md`](ML_ENGINE.md), and [`docs/PROJECT_STATUS.md`](PROJECT_STATUS.md). Where something below is designed but not yet live-verified, it's called out — see those documents for the exact verification status of each piece.

---

## 1. System context

Who/what talks to the system, and what it depends on.

```mermaid
flowchart TB
    User(("User<br/>MSME / manufacturer /<br/>student / consumer"))

    subgraph App["BIS Standards Navigator (Next.js — one deployable)"]
        UI["Web UI<br/>(App Router pages,<br/>mega-menu nav, search)"]
        API["API Routes<br/>/api/v1/query, /search,<br/>/standards, /health"]
        Engine["Intelligence Engine<br/>(deterministic pipeline)"]
        Adapter["LLM Provider Adapter<br/>(src/lib/providers/)"]
    end

    DB[("Neon Postgres<br/>+ pgvector")]
    Local["Local LLM<br/>(Ollama / OpenAI-compatible)"]
    ORFree["OpenRouter<br/>(free tier)"]
    Paid["Paid provider<br/>(optional)"]

    User -->|HTTPS| UI
    UI --> API
    API --> Engine
    Engine -->|retrieval + evidence| DB
    Engine -->|prose generation only| Adapter
    Adapter -.->|LLM_PROVIDER=auto:<br/>tried in this order| Local
    Adapter -.-> ORFree
    Adapter -.-> Paid
    Adapter -.->|all unavailable| Engine

    style App fill:#0d1b2a,stroke:#5baef2,color:#e8f1ff
    style Engine fill:#08304d,stroke:#5baef2,color:#e8f1ff
    style Adapter fill:#08304d,stroke:#f27c49,color:#e8f1ff
```

**Key property:** the dotted lines are all optional. `Engine` produces a complete, evidence-backed response using only `DB` — `Adapter` only adds natural-language prose on top, never new facts. See §4 below and [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) for the fallback contract.

---

## 2. Component architecture

Where each responsibility lives in the codebase.

```mermaid
flowchart TB
    subgraph Frontend["src/app/, src/components/"]
        Pages["Pages<br/>(/, /search, /standards,<br/>/certification, /testing, ...)"]
        Header["Header + MegaMenu<br/>+ SearchOverlay"]
        Placeholder["PlaceholderPage<br/>(honest 'coming soon'<br/>for unbuilt sections)"]
    end

    subgraph Routes["src/app/api/v1/"]
        QueryRoute["query/route.ts<br/>(pipeline orchestration)"]
        SearchRoute["search/route.ts"]
        StandardsRoute["standards/[id]/route.ts"]
    end

    subgraph Deterministic["Deterministic engine — no LLM, no network (src/lib/)"]
        Norm["query-normalization.ts"]
        StdId["standards-id.ts<br/>(identifier resolver)"]
        Retrieval["retrieval.ts<br/>(hybrid: pgvector + FTS + RRF)"]
        Rerank["ml/reranker.ts<br/>(document-diversity)"]
        Agg["evidence-aggregation.ts"]
        Coverage["coverage-analysis.ts"]
        Conflict["conflict-detection.ts"]
        Grounding["grounding.ts"]
        Confidence["confidence.ts"]
    end

    subgraph LLMLayer["LLM-touching (src/lib/)"]
        Intent["intent.ts<br/>(fast path + LLM + fallback)"]
        Answer["answer.ts<br/>(prose + evidence-only fallback)"]
        Providers["providers/<br/>(adapter + router)"]
    end

    DB[("documents, chunks,<br/>query_logs")]

    Pages --> Header
    Header --> Placeholder
    Pages --> QueryRoute
    Pages --> SearchRoute
    Pages --> StandardsRoute

    QueryRoute --> Norm --> Intent
    Intent -->|deterministic fast path,<br/>no LLM for exact-ID queries| QueryRoute
    Intent --> Providers
    QueryRoute --> Retrieval --> Rerank --> Agg --> Coverage --> Conflict --> Grounding --> Confidence
    QueryRoute --> Answer --> Providers
    StdId -.-> Retrieval
    StdId -.-> Coverage

    Retrieval --> DB
    SearchRoute --> Retrieval
    StandardsRoute --> DB

    style Deterministic fill:#08304d,stroke:#5baef2,color:#e8f1ff
    style LLMLayer fill:#3a2213,stroke:#f27c49,color:#ffe8db
```

---

## 3. The intelligence pipeline (per query)

```mermaid
flowchart LR
    Q(["User query"]) --> N["Normalization<br/>(deterministic)"]
    N --> ID{"Exact standard<br/>ID + little else?"}
    ID -->|yes| FI["Fast-path intent<br/>NO LLM CALL"]
    ID -->|no| LI["Intent extraction<br/>(LLM, or deterministic<br/>keyword fallback)"]
    FI --> R
    LI --> R["Hybrid retrieval<br/>pgvector + Postgres FTS<br/>+ RRF fusion"]
    R --> RR["ML reranking<br/>(document-diversity,<br/>competitiveness-gated)"]
    RR --> EA["Evidence aggregation<br/>(per-standard, chunk-<br/>volume-bias resistant)"]
    EA --> CA["Coverage analysis<br/>(product/material/use-case/<br/>testing/certification/identifier)"]
    CA --> CD["Conflict detection<br/>(version, superseded,<br/>mandatory-vs-voluntary)"]
    CD --> GR["Deterministic grounding<br/>verified /<br/>supported_inference /<br/>insufficient_evidence"]
    GR --> EC["Deterministic<br/>engine confidence"]
    EC --> LLM["LLM prose generation<br/>(or evidence-only<br/>fallback if unavailable)"]
    LLM --> VAL["Standard-number +<br/>citation validation"]
    VAL --> RESP(["Grounded response"])

    style FI fill:#123024,stroke:#4fae87,color:#dff5ea
    style GR fill:#08304d,stroke:#5baef2,color:#e8f1ff
    style EC fill:#08304d,stroke:#5baef2,color:#e8f1ff
    style LLM fill:#3a2213,stroke:#f27c49,color:#ffe8db
```

**The critical invariant** (proven by test, not just designed — see [`docs/ML_ENGINE.md`](ML_ENGINE.md)): everything left of `LLM prose generation` is computed first and passed in as already-decided facts. The LLM's response schema has no field for `groundingState`, `confidence`, or citation identity — it physically cannot override them.

---

## 4. LLM provider fallback

```mermaid
flowchart TD
    Start(["generateStructured /<br/>generateText called"]) --> Mode{"LLM_PROVIDER"}
    Mode -->|"none"| Evidence["Evidence-only response<br/>(deterministic prose from<br/>engine evidence)"]
    Mode -->|"local / openrouter-free / paid"| Pin["Try exactly that<br/>one provider"]
    Mode -->|"auto (default)"| L{"Local configured,<br/>not in cooldown,<br/>capable?"}

    L -->|yes, try| LCall["Call local provider"]
    L -->|no| OR{"OpenRouter free<br/>configured, not in<br/>cooldown, capable?"}
    LCall -->|success| Done(["Normalized response"])
    LCall -->|fail: mark 60s cooldown| OR

    OR -->|yes, try| ORCall["Call OpenRouter free"]
    OR -->|no| P{"Paid provider<br/>configured, not in<br/>cooldown, capable?"}
    ORCall -->|success| Done
    ORCall -->|fail: mark 60s cooldown| P

    P -->|yes, try| PCall["Call paid provider"]
    P -->|no| Evidence
    PCall -->|success| Done
    PCall -->|fail: mark 60s cooldown| Evidence

    Pin -->|success| Done
    Pin -->|fail or unconfigured| Evidence

    style Evidence fill:#123024,stroke:#4fae87,color:#dff5ea
    style Done fill:#08304d,stroke:#5baef2,color:#e8f1ff
```

**"Capable" =** `capabilities.structuredOutput` for structured calls only — text-only calls skip that check. No model is assumed capable by default; see [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)'s verified allowlist. **Retry limit is 0 per provider** — a failure moves to the next provider, never retries the one that just failed.

---

## 5. Data model

```mermaid
erDiagram
    DOCUMENTS ||--o{ CHUNKS : "has many"
    DOCUMENTS {
        uuid id PK
        text standard_number "nullable — not every doc is a numbered standard"
        text title
        text document_type
        text source_url
        text source_org "provenance tier"
        text version
        text publication_date
        timestamp retrieved_at
        text checksum "sha256, for change detection"
    }
    CHUNKS {
        uuid id PK
        uuid document_id FK
        text section
        text clause
        integer page
        text text
        vector embedding "1536-dim, HNSW index"
        jsonb metadata
    }
    QUERY_LOGS {
        uuid id PK
        text query
        text intent
        jsonb retrieved_chunk_ids
        text confidence
        integer latency_ms
    }
```

`query_logs` is written on every `/api/v1/query` call but not yet read back for calibration — see [`docs/EVALUATION.md`](EVALUATION.md)'s calibration section ("insufficient data" is reported honestly rather than fabricated).

---

## 6. Deployment

```mermaid
flowchart TB
    subgraph OR_Profile["docker compose --profile openrouter"]
        AppOR["app-openrouter<br/>(this image)"]
    end
    subgraph Local_Profile["docker compose --profile local"]
        AppLocal["app-local<br/>(this image)"]
        Ollama["ollama/ollama<br/>container"]
        AppLocal -->|"http://ollama:11434/v1"| Ollama
    end

    ORKey["OPENROUTER_API_KEY<br/>(.env.local)"] -.-> AppOR
    Neon[("Neon Postgres<br/>(external, both paths)")]
    AppOR --> Neon
    AppLocal --> Neon

    style OR_Profile fill:#08304d,stroke:#5baef2,color:#e8f1ff
    style Local_Profile fill:#123024,stroke:#4fae87,color:#dff5ea
```

Both profiles build from the same multi-stage `Dockerfile` (`next.config.ts`'s `output: "standalone"` keeps the final image to just the server bundle, not the full `node_modules` tree). Neither profile provisions a database — see the README's Quick Start.

**Verification status**: the OpenRouter path was built, run, and curl-verified live this session (real 200 on the homepage). The Ollama container itself was not started this session — see [`docs/PROJECT_STATUS.md`](PROJECT_STATUS.md)'s Docker section.

---

## 7. Design principles this HLD encodes

1. **Deterministic-first.** Every box in §3 left of "LLM prose generation" runs with no API key and no network call beyond Postgres. 45+23 tests prove this offline.
2. **The LLM is downstream of truth, never upstream of it.** It explains evidence; it does not select, verify, or score it.
3. **No hard dependency on any one provider — including "an LLM" at all.** §4's evidence-only terminus is not a degraded mode bolted on afterward; it's a first-class, tested response path.
4. **Every claim in this document is falsifiable.** Cross-reference [`docs/EVALUATION.md`](EVALUATION.md) for what was actually run and observed versus what is designed but unverified — this HLD does not upgrade a PLANNED item to DONE just because a diagram shows it.
