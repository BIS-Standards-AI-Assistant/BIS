# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately through GitHub: open the repository's **Security** tab and choose
**Report a vulnerability**. If that option is not available, contact one of the
maintainers privately through their GitHub profile and ask for a private channel.

Include what you found, how to reproduce it, and what an attacker could do with it. You
will get an acknowledgement, and a fix will be developed in a private fork or branch
before details are published.

## Scope

In scope: this application's code — the Next.js app, its `/api/v1/*` routes, the
intelligence pipeline in `src/lib/`, and the data and ingestion scripts.

Particularly relevant here:

- **Information disclosure** — API responses must never include raw database, provider or
  network errors, hosts, user names or keys.
- **Cost abuse** — `/api/v1/query`, `/chat`, `/analyze-product`, `/speak` and `/transcribe`
  spend money on upstream LLM, TTS or STT calls; a way around their validation or rate
  limits is a security issue.
- **Uploads** — `/api/v1/analyze-document` and `/api/v1/transcribe` accept files from
  anyone.
- **Prompt injection** that makes the assistant present invented BIS content as fact.

Out of scope: vulnerabilities in third-party services (Neon, Groq, Google, OpenRouter) —
report those to the vendor — and findings that need a compromised server or developer
machine.

## Secrets

Never commit API keys or connection strings. `.env.local` is git-ignored, and CI fails a
pull request whose tracked files contain a key-shaped string. If a key is ever exposed,
rotate it at the provider first; removing it from git history alone is not enough.
