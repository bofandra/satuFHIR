# FHIRCare

**Learn FHIR by running a clinical workflow with SATUSEHAT Sandbox.**

FHIRCare is an open-source, zero-database educational prototype. It provides a familiar clinical UI while exposing the FHIR request, response, references and learning explanation behind each action.

> Educational prototype only. Not intended for clinical production use.

## Core principles

- **Zero database** — SATUSEHAT is the clinical source of truth.
- **Stateless backend** — Hono only handles app auth, SATUSEHAT OAuth and an allowlisted FHIR gateway.
- **FHIR visible by design** — every clinical action can be inspected.
- **Sandbox first** — production access is blocked unless `ALLOW_PRODUCTION=true` is explicitly configured.
- **No PHI persistence** — learning progress may use localStorage; clinical resources may not.

## Included MVP

- Shared zero-DB login
- SATUSEHAT OAuth2 `client_credentials`
- Generic allowlisted FHIR gateway
- Patient search by NIK
- Patient workspace
- Encounter create/read/update
- Condition
- Observation: blood pressure and temperature
- Procedure
- ServiceRequest: laboratory and radiology
- DiagnosticReport
- Medication + MedicationRequest / Medication + MedicationDispense
- Encounter timeline reconstructed from SATUSEHAT
- FHIR Inspector: request, response, explain, cURL
- FHIR Explorer
- FHIR Playground
- Patient Journey learning screen
- Browser-local lesson progress
- Unit test, Playwright smoke test, GitHub Actions
- Vercel, Netlify and Cloudflare Pages entry points

## Requirements

- Node.js 20.19+
- pnpm 9+
- SATUSEHAT Sandbox Organization ID, Client ID and Client Secret

## Local setup

```bash
git clone <your-repository-url>
cd fhircare
pnpm install
cp .env.example .env
pnpm auth:hash -- "choose-a-password"
```

Paste the generated PBKDF2 value into `APP_PASSWORD_HASH`, then configure the SATUSEHAT Sandbox credentials in `.env`.

```bash
pnpm dev
```

Frontend: `http://localhost:5173`  
API: `http://localhost:8787`

Vite proxies `/api` to the local Hono server.


### URL privacy

The frontend uses `HashRouter`. Patient/Encounter resource IDs used for navigation live after the `#` fragment and are not sent as page-route paths to the hosting provider. FHIR search values such as NIK are sent to the app backend in a POST body rather than in the app's inbound query string.

## SATUSEHAT environment

Defaults used by the source:

```text
OAuth: https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1
FHIR:  https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1
```

The OAuth request is server-to-server and uses `POST /accesstoken?grant_type=client_credentials` with URL-encoded `client_id` and `client_secret`.

## Important note about payload templates

FHIRCare ships small educational payload builders. SATUSEHAT implementation guides, profiles, terminology and validation rules evolve. Before using a flow in a workshop, compare the generated payload with the **current SATUSEHAT playbook for that use case**. The FHIR Playground is intentionally included so learners can inspect and adjust resources.

## Deployment

### Vercel

1. Import the GitHub repository.
2. Add all variables from `.env.example` in Project Settings → Environment Variables.
3. Build command: `pnpm build`.
4. Deploy.

`api/index.ts` forwards the rewritten `/api/*` request into the shared Hono app. The frontend uses `HashRouter`, so SPA routes do not require server rewrites.

### Netlify

1. Import the repository.
2. Add environment variables.
3. Netlify reads `netlify.toml`.
4. The SPA is built to `dist`; `/api/*` runs through the Hono Netlify Function adapter.

### GitHub Actions CI/CD to Netlify

This repository includes `.github/workflows/netlify.yml`.

The workflow runs lint, typecheck, unit tests, build, and the Playwright smoke test for pull requests and pushes. Pushes to `main` deploy production to Netlify with `netlify deploy --build --prod`, which uploads the static build and the configured Netlify Function.

Configure these GitHub Actions repository secrets:

- `NETLIFY_AUTH_TOKEN` — Netlify personal access token.
- `NETLIFY_SITE_ID` — Netlify Project ID.

Configure the app runtime variables in the Netlify project environment, not in committed source:

- `APP_AUTH_ENABLED`
- `APP_USERNAME`
- `APP_PASSWORD_HASH`
- `AUTH_SECRET`
- `SATUSEHAT_ENV`
- `SATUSEHAT_CLIENT_ID`
- `SATUSEHAT_CLIENT_SECRET`
- `SATUSEHAT_ORGANIZATION_ID`
- `SATUSEHAT_PRACTITIONER_ID`
- `SATUSEHAT_LOCATION_ID`
- `ALLOW_PRODUCTION`

### Cloudflare Pages

1. Create a Pages project from this repository.
2. Build command: `pnpm build`.
3. Output directory: `dist`.
4. Add the environment variables in Pages settings.
5. `functions/api/[[path]].ts` forwards `/api/*` to the shared Hono app.

## Authentication model

FHIRCare intentionally has no user table. One shared learner account is configured through environment variables. Passwords are stored as PBKDF2 hashes. The server issues a signed HttpOnly cookie. Set `APP_AUTH_ENABLED=false` only for isolated local/workshop environments where an application login is unnecessary.

## Tests

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

CI does **not** require SATUSEHAT credentials. Real Sandbox integration testing should be an explicit private/manual workflow.

## Repository rules for AI coding

Read `AGENTS.md` before changing the code. In particular: do not introduce a clinical database, do not leak credentials, do not log PHI, and do not hide FHIR behind the UI.

## License

Apache-2.0.
