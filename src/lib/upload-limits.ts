/**
 * Multipart framing (boundaries, part headers, small text fields like
 * `language`) on top of the file itself. Generous on purpose: this guard is
 * only meant to stop bodies that are far over the limit before they are
 * read, and the exact per-file size check still runs after parsing.
 */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/**
 * Whether the request *declares* a body too large for a `maxFileBytes`
 * upload. `req.formData()` buffers the whole body in memory before any
 * `file.size` check can run, so without this a client could send gigabytes
 * to a 10 MB endpoint and the server would read all of it first.
 *
 * A missing or unparseable Content-Length (e.g. chunked encoding) returns
 * false: the post-parse size check still applies to those requests.
 */
export function declaredBodyTooLarge(headers: Headers, maxFileBytes: number): boolean {
  const declared = Number(headers.get("content-length"));
  return Number.isFinite(declared) && declared > maxFileBytes + MULTIPART_OVERHEAD_BYTES;
}
