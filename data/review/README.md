# Human Review Queue

Per `prompts/dataAcquisition.md` §44: **"This is much better than silently
inserting guesses."**

Any relationship, standard, or QCO record whose evidence is ambiguous
should be written here as a JSON file — `relationship`, `source`,
`reason`, `candidate_interpretation`, `evidence` — rather than inserted
into the database with a guessed `verified` status.

Nothing is in this directory yet — no automated relationship-extraction
script exists this session (see `docs/PROJECT_STATUS.md`), so nothing has
produced an ambiguous candidate to queue. `data/manifests/
discovered-sources.json` holds the current `needs_review` candidates —
those are candidate *sources* (page URLs), not yet extracted facts, so they
live there rather than here; this directory is for candidate *facts*
(a specific standard/relationship/QCO claim) once an extraction stage
starts producing them.
