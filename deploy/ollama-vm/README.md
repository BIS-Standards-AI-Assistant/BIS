# Ollama host — split deployment (Vercel app + this VM)

Vercel's functions are serverless — no persistent process, so Ollama cannot
run there. This folder runs Ollama on a separate, persistent machine that
the Vercel-hosted app calls over the network via `LOCAL_LLM_BASE_URL`.

This repo's own live-verified numbers (see the root README): `llama3.2:3b`
answers in ~10-22s per call on CPU. No GPU is required for this model, but a
GPU will be faster if one is available.

## 1. Get a VM

Any provider that gives you a persistent Linux box with Docker works —
this isn't tied to one vendor:

- DigitalOcean / Hetzner / Linode — cheapest, plain CPU droplets (4GB+ RAM
  recommended for `llama3.2:3b`)
- AWS Lightsail / EC2, GCP Compute Engine — more setup, more control
- RunPod / Fly.io GPU machines — if you outgrow CPU inference

Open inbound ports `80`, `443`, and `11434` in the VM's firewall (only
`443`/`11434` are actually used once you have a real domain — see below).

## 2. Install Docker, clone this folder

```bash
curl -fsSL https://get.docker.com | sh
git clone <this-repo-url>
cd BIS/deploy/ollama-vm
cp .env.example .env
```

Edit `.env`:
- `OLLAMA_TOKEN` — generate with `openssl rand -hex 32`. This is the only
  thing standing between the internet and your Ollama server, since Ollama
  itself has no authentication.
- `OLLAMA_DOMAIN` — point a subdomain (e.g. `ollama.yourdomain.com`) at
  this VM's IP first (an A record), then set it here for automatic HTTPS.
  Leave blank for a quick plain-HTTP demo on port `11434` — do not do this
  for anything a real user will depend on, since the bearer token would
  travel in cleartext.

## 3. Start it

```bash
docker compose up -d
docker compose exec ollama ollama pull llama3.2:3b
```

Verify:

```bash
curl -H "Authorization: Bearer $(grep OLLAMA_TOKEN .env | cut -d= -f2)" \
  https://<your-domain>/v1/models
curl -i https://<your-domain>/v1/models   # no header — expect 401
```

## 4. Point the Vercel app at it

In the Vercel project's environment variables (production):

```
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=https://<your-domain>/v1
LOCAL_LLM_MODEL=llama3.2:3b
LOCAL_LLM_API_KEY=<same value as OLLAMA_TOKEN>
```

`src/lib/providers/local-provider.ts` sends `LOCAL_LLM_API_KEY` as
`Authorization: Bearer <key>` on every request — Caddy (this folder) checks
it before ever reaching Ollama.

The app's guardrails (fixed refusal text, the 0.45 relevance floor, and the
citation-identity-free response schema — see the root README's
"Guardrails — staying on topic" section) are provider-agnostic: they run in
the pipeline before/around the LLM call, not inside the model. They apply
exactly the same way whether the model behind `LOCAL_LLM_BASE_URL` is this
stock `llama3.2:3b` or a future fine-tuned one — nothing here needs to
change if the model itself changes later.

## Operating notes

- **Restart/upgrade**: `docker compose pull && docker compose up -d` —
  `ollama-data` is a named volume, the pulled model survives restarts.
- **Rotate the token**: change `OLLAMA_TOKEN` in `.env`, `docker compose up
  -d` to reload Caddy, then update `LOCAL_LLM_API_KEY` on Vercel.
- **This VM has no database on it.** It only serves the LLM; the app's
  Postgres/pgvector connection (`DATABASE_URL`) still points at your Neon
  project from Vercel directly, same as the OpenRouter-only path.
- **If this VM is down**, `LLM_PROVIDER=auto`'s fallback chain still applies
  (see the root README) — the app degrades to the next configured provider
  or evidence-only answers, it does not go down.
