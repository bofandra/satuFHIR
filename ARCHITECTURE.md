# Architecture

FHIRCare is a zero-database educational FHIR client.

```text
React/Vite browser
      |
      | same-origin /api
      v
Hono stateless gateway
      |-- shared app authentication (PBKDF2 + signed cookie)
      |-- SATUSEHAT OAuth2 client_credentials
      |-- allowlisted FHIR proxy
      v
SATUSEHAT Sandbox FHIR R4
```

## State policy

- Clinical data: SATUSEHAT only.
- OAuth token: ephemeral server memory.
- Login session: signed HttpOnly cookie.
- Learning progress: browser localStorage, no PHI.
- No SQL/NoSQL database.

## Reconstructing UI

FHIRCare keeps SATUSEHAT resource IDs in routes. Encounter pages fetch the Encounter and search linked resource types using the Encounter ID. Therefore a browser refresh reconstructs the screen from SATUSEHAT rather than a local clinical store.
