# Secret Rotation

Rotate local keys before tagging or public launch if a key was ever pasted into `.mcp.json`, `.env`, terminal history, screenshots, issue text, or temporary docs.

## What To Rotate

- OpenAI, Anthropic, Gemini, Vercel, Cloudflare, Supabase, Stripe, GitHub, and broker/API keys.
- Any local MCP bearer token or `NEXURAL_API_KEYS` value.
- Any key used while recording demos or screenshots.

## Professional Rotation Flow

1. Revoke the old key in the provider dashboard.
2. Create a new least-privilege key.
3. Store it only in local environment variables or the deployment provider secret store.
4. Remove old values from `.mcp.json`, `.env`, shell history, screenshots, and notes.
5. Run:

```powershell
python scripts\repo-tools\secret_scan.py
```

6. Push only after CI secret scan is green.

## Repo Policy

`.mcp.json`, `.env`, local databases, exported reports, and raw strategy CSVs are ignored and must stay untracked.
