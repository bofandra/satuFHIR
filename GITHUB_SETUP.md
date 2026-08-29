# Publish to GitHub

```bash
git init
git add .
git commit -m "Initial FHIRCare open-source prototype"
git branch -M main
git remote add origin https://github.com/<YOUR_ACCOUNT>/fhircare.git
git push -u origin main
```

Before pushing:

```bash
cp .env.example .env
# configure .env locally only; .env is gitignored
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Recommended GitHub repository settings:

- enable secret scanning and push protection,
- enable Dependabot security updates,
- enable private vulnerability reporting,
- require the CI workflow on pull requests to `main`.
