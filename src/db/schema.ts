import {
  pgTable,
  text,
  integer,
  timestamp,
  vector,
  jsonb,
  uuid,
  boolean,
  real,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * A source document (a BIS/Indian Standard product manual, specification, or
 * related official material). One row per ingested file/version.
 */
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  standardNumber: text("standard_number"), // e.g. "IS 15410:2003" — nullable: not every document is a numbered standard
  standardId: uuid("standard_id"), // FK to standards.id, added below via relations() to avoid a circular table-definition order; nullable — most existing rows predate this column
  title: text("title").notNull(),
  documentType: text("document_type").notNull(), // "product_manual" | "specification" | "other"
  sourceUrl: text("source_url").notNull(),
  sourceOrg: text("source_org").notNull().default("BIS"), // provenance tier, see AGENTS.md §40
  version: text("version"), // e.g. "PM/15410/1" edition marker
  publicationDate: text("publication_date"), // free text; BIS manuals rarely give ISO dates
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
  checksum: text("checksum").notNull(), // sha256 of raw extracted text, for change detection
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A structure-aware chunk of a document, carrying its own section/clause
 * metadata so citations can point at something more specific than "the PDF".
 */
export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    section: text("section"), // e.g. "Annexure C: Scheme of Inspection and Testing"
    clause: text("clause"), // e.g. "4.6.3"
    page: integer("page"),
    text: text("text").notNull(),
    // 1536 dims: openai/text-embedding-3-small via the Vercel AI Gateway
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
}));

/**
 * Logged query events for observability and future evaluation (§16, §30).
 * No free-text user PII is stored beyond the query itself, which is the
 * minimum needed to debug retrieval quality.
 */
export const queryLogs = pgTable("query_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  query: text("query").notNull(),
  intent: text("intent"),
  retrievedChunkIds: jsonb("retrieved_chunk_ids").$type<string[]>(),
  confidence: text("confidence"), // "high" | "medium" | "low" | "none"
  latencyMs: integer("latency_ms"),
  // PRD FR13: log whether the system answered or refused, and why. Nullable
  // and added additively — existing rows predate these columns.
  outcome: text("outcome"), // "answered" | "refused_out_of_scope" | "refused_insufficient_evidence" | "refused_not_in_database"
  // PRD FR2/§7: the language the query was treated as, and whether it was
  // translated to English before retrieval.
  language: text("language"), // "en" | "hi" | ... (UI language codes)
  translated: boolean("translated"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Knowledge-graph foundation (prompts/dataAcquisition.md).
//
// Deliberately relational, not a graph database (per that spec's own §23:
// "Postgres is enough" until real query workloads justify otherwise).
// `documents`/`chunks` above are unchanged and remain the retrieval
// engine's source of truth — these tables are an additive layer for
// structured facts and their provenance, not a replacement.
//
// Every table here carries `verificationStatus` and a source pointer
// because the spec's central rule is "never fabricate a relationship" —
// a record with no traceable source is not a fact this schema can even
// represent, by construction.
// ============================================================================

export type VerificationStatus = "verified" | "corrected" | "needs_review" | "unverified";

/**
 * The canonical, deduplicated record for one Indian Standard — the "ONE
 * STANDARD, MANY DOCUMENTS" entity the spec's §27 requires. A standard can
 * exist here with zero ingested documents (known-but-not-yet-collected);
 * `documents.standardId` links actual ingested files back to this record.
 */
export const standards = pgTable("standards", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalNumber: text("canonical_number").notNull().unique(), // e.g. "IS 5522:2014" — the resolveStandardIds() normalized form
  normalizedNumber: text("normalized_number").notNull(), // number only, no part/section/year, e.g. "5522" — for cross-edition lookups
  title: text("title"),
  editionYear: text("edition_year"),
  status: text("status"), // "active" | "superseded" | "withdrawn" | null (unknown) — never defaulted to "active"
  technicalDepartment: text("technical_department"),
  classification: text("classification"),
  domain: text("domain"), // controlled vocabulary term, see §21 — free text here, validated by scripts/data-normalize.ts
  sourceUrl: text("source_url"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  verificationStatus: text("verification_status").notNull().default("unverified").$type<VerificationStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The audit/provenance layer (§25) — every fact in the tables below points
 * back to one of these, and every source row points back to a real,
 * fetchable URL. This is what makes "when was this last verified, and
 * from where" answerable for any claim in the system.
 */
export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  domain: text("domain").notNull(), // e.g. "bis.gov.in" — used to enforce "official BIS domains take precedence" at query time
  documentType: text("document_type"), // "standard" | "amendment" | "product_manual" | "qco_notification" | "catalogue" | "other"
  title: text("title"),
  publicationDate: text("publication_date"),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  sha256: text("sha256"), // set once the underlying file is actually downloaded and hashed — null for a discovered-but-not-yet-fetched source
  verificationStatus: text("verification_status").notNull().default("unverified").$type<VerificationStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * BIS certification schemes (Scheme-I, Scheme-II, CRS, Hallmarking, ...).
 * Deliberately NOT assumed to apply to every product — §11: "Do not
 * assume every product uses every scheme."
 */
export const certificationSchemes = pgTable("certification_schemes", {
  id: uuid("id").primaryKey().defaultRandom(),
  schemeCode: text("scheme_code").notNull(), // e.g. "Scheme-I", "CRS"
  name: text("name").notNull(),
  description: text("description"),
  sourceId: uuid("source_id").references(() => sources.id),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  verificationStatus: text("verification_status").notNull().default("unverified").$type<VerificationStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Quality Control Orders — the specific mechanism that makes a standard
 * MANDATORY rather than voluntary (§10). `mandatory` is a plain boolean
 * fact about the QCO itself, but a standard is never inferred as mandatory
 * merely for having a certificationScheme row — only a real QCO edge
 * (via `relationships`, type PRODUCT_SUBJECT_TO_QCO) establishes that.
 */
export const qcos = pgTable("qcos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  issuingAuthority: text("issuing_authority"),
  notificationNumber: text("notification_number"),
  notificationDate: text("notification_date"),
  effectiveDate: text("effective_date"),
  standardId: uuid("standard_id").references(() => standards.id),
  applicability: text("applicability"),
  mandatory: boolean("mandatory").notNull().default(true), // a row only exists here because a real QCO was found, so default true is safe — the absence of a row is what represents "voluntary"
  sourceId: uuid("source_id").references(() => sources.id),
  verificationStatus: text("verification_status").notNull().default("unverified").$type<VerificationStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Generic typed relationship edge (§24) — deliberately one flexible table
 * rather than a bespoke join table per relationship type, matching the
 * spec's own "make the system extensible" requirement. `relationshipType`
 * is application-validated against RELATIONSHIP_TYPES (src/lib/
 * knowledge-graph.ts) rather than a DB enum, so adding a new type doesn't
 * require a migration.
 *
 * A row must never be inserted without `sourceId` or `evidenceText` — see
 * scripts/data-relationships.ts's guard. An edge with no evidence is
 * exactly the "inferred merely because two documents mention the same
 * word" failure mode §9/§17 explicitly prohibit.
 */
export const relationships = pgTable("relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceEntityType: text("source_entity_type").notNull(), // "standard" | "product" | "document" | "qco" | ...
  sourceEntityId: uuid("source_entity_id").notNull(),
  relationshipType: text("relationship_type").notNull(),
  targetEntityType: text("target_entity_type").notNull(),
  targetEntityId: uuid("target_entity_id").notNull(),
  documentId: uuid("document_id").references(() => documents.id),
  sourceId: uuid("source_id").references(() => sources.id),
  evidenceText: text("evidence_text"),
  confidence: real("confidence"), // 0-1, set by the deterministic extraction script that created the edge — never an LLM-assigned number
  verificationStatus: text("verification_status").notNull().default("needs_review").$type<VerificationStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const standardsRelations = relations(standards, ({ many }) => ({
  documents: many(documents),
  qcos: many(qcos),
}));

export const qcosRelations = relations(qcos, ({ one }) => ({
  standard: one(standards, { fields: [qcos.standardId], references: [standards.id] }),
  source: one(sources, { fields: [qcos.sourceId], references: [sources.id] }),
}));

export const certificationSchemesRelations = relations(certificationSchemes, ({ one }) => ({
  source: one(sources, { fields: [certificationSchemes.sourceId], references: [sources.id] }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  document: one(documents, { fields: [relationships.documentId], references: [documents.id] }),
  source: one(sources, { fields: [relationships.sourceId], references: [sources.id] }),
}));

/**
 * BIS Recognised Laboratories for Product Testing.
 */
export const laboratories = pgTable("laboratories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  state: text("state"),
  city: text("city"), // Derived or parsed from name/address
  status: text("status"), // e.g. "Private", "Govt."
  oslCode: text("osl_code"),
  recognitionValidUpTo: text("recognition_valid_up_to"),
  remarks: text("remarks"),
  lat: real("lat"),
  lng: real("lng"),
  verificationStatus: text("verification_status").notNull().default("unverified").$type<VerificationStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Specific testing requirements that apply to a Standard.
 */
export const testingRequirements = pgTable("testing_requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  testName: text("test_name").notNull(), // e.g. "Electrical Safety", "Leakage Current"
  standardId: uuid("standard_id").notNull().references(() => standards.id),
  clause: text("clause"),
  category: text("category"), // e.g. "Safety", "Performance"
  sourceId: uuid("source_id").references(() => sources.id),
  verificationStatus: text("verification_status").notNull().default("unverified").$type<VerificationStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Mapping between Laboratories and the Testing Requirements they can perform.
 */
export const laboratoryCapabilities = pgTable("laboratory_capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  laboratoryId: uuid("laboratory_id").notNull().references(() => laboratories.id),
  testingRequirementId: uuid("testing_requirement_id").notNull().references(() => testingRequirements.id),
  verificationStatus: text("verification_status").notNull().default("unverified").$type<VerificationStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const laboratoriesRelations = relations(laboratories, ({ many }) => ({
  capabilities: many(laboratoryCapabilities),
}));

export const testingRequirementsRelations = relations(testingRequirements, ({ one, many }) => ({
  standard: one(standards, { fields: [testingRequirements.standardId], references: [standards.id] }),
  source: one(sources, { fields: [testingRequirements.sourceId], references: [sources.id] }),
  laboratories: many(laboratoryCapabilities),
}));

export const laboratoryCapabilitiesRelations = relations(laboratoryCapabilities, ({ one }) => ({
  laboratory: one(laboratories, { fields: [laboratoryCapabilities.laboratoryId], references: [laboratories.id] }),
  testingRequirement: one(testingRequirements, { fields: [laboratoryCapabilities.testingRequirementId], references: [testingRequirements.id] }),
}));
