const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether `value` can be a database document id. `documents.id` is a uuid
 * column, so querying it with anything else makes Postgres raise
 * `invalid input syntax for type uuid` instead of returning no rows —
 * callers check this first and treat a non-uuid as "not a document".
 */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
