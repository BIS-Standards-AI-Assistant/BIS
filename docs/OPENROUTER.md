# OpenRouter setup

The BIS Assistant can use OpenRouter for hosted reasoning, answer generation,
and provider fallback. OpenRouter is optional: the app still runs with the
deterministic/evidence-only path when no LLM provider is configured.

## Local development

1. Create an account and generate a key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Copy the example environment file if you have not already done so:

   ```bash
   cp .env.example .env.local
   ```

   On PowerShell, use:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Add the key and a model to `.env.local`:

   ```dotenv
   OPENROUTER_API_KEY=your_openrouter_key
   OPENROUTER_MODEL=your_openrouter_model_id
   ```

   Use the model ID shown by OpenRouter. A free-tier model can be used when
   available; model availability and rate limits are controlled by OpenRouter.
4. Leave `LLM_PROVIDER=auto` to let the app use configured providers in its
   normal fallback order, or set:

   ```dotenv
   LLM_PROVIDER=openrouter-free
   ```

   Pinning the provider makes OpenRouter the only hosted provider attempted for
   that request path. If you leave `OPENROUTER_MODEL` empty, the provider uses
   its built-in default model.
5. Restart the development server after changing `.env.local`:

   ```bash
   npm run dev
   ```

## In-app notification

When `OPENROUTER_API_KEY` is not present on the server, the app shows an
OpenRouter setup notification on first load. It is styled to match the BIS UI,
links to the key-creation page, and explains the `.env.local` setting. The
notification does not collect or transmit the key in the browser. Dismissing
it stores only a local browser dismissal flag; it does not store the API key.

Once the server sees `OPENROUTER_API_KEY`, the notification is not rendered.

## Docker

Put the variables in the `.env.local` file used by Docker, then start the
OpenRouter profile:

```bash
docker compose --profile openrouter up --build
```

The container reads `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` from the
environment. Do not commit `.env.local` or expose the key as a `NEXT_PUBLIC_*`
variable.

## Vercel

Add the variables to the target environment before deploying:

```bash
vercel env add OPENROUTER_API_KEY production
vercel env add OPENROUTER_MODEL production
vercel --prod
```

After changing a Vercel environment variable, redeploy so the server-side
runtime receives the new value.

## Troubleshooting

- **The notification still appears:** confirm the variable is named exactly
  `OPENROUTER_API_KEY`, restart/redeploy the server, and reload the page.
- **Requests use evidence-only behavior:** check that `LLM_PROVIDER` is not
  set to `none`, and that both the key and selected model are available to your
  OpenRouter account.
- **The provider fails and another provider is tried:** this is expected when
  `LLM_PROVIDER=auto`; inspect the server logs for the provider trace without
  printing or sharing the API key.
