import {
  pgTable,
  text,
  integer,
  timestamp,
  vector,
  jsonb,
  uuid,
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
