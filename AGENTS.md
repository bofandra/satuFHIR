# AI Engineering Rules

1. Never expose SATUSEHAT Client ID or Client Secret to the browser.
2. Never commit credentials or real patient data.
3. Never persist clinical FHIR resources in a local database, browser storage, analytics tool, or log.
4. SATUSEHAT Sandbox is the default and production is explicitly gated by `ALLOW_PRODUCTION=true`.
5. Every clinical action should make its FHIR interaction inspectable: request, response, HTTP status, references, cURL, explanation.
6. Keep the backend stateless. In-memory OAuth token caching is allowed.
7. Only non-clinical learning progress/preferences may use `localStorage`.
8. Add or update tests for behavior changes.
9. Before completion run lint, typecheck, tests and build.
10. Treat SATUSEHAT profiles and terminology as versioned external contracts; verify current official documentation before changing payload templates.
