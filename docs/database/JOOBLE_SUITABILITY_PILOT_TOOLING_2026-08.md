# Jooble suitability pilot tooling

This repository contains a read-only, bounded Jooble inventory assessment script:

```powershell
node --experimental-strip-types scripts/jooble-suitability-pilot.ts
```

The script reads `JOOBLE_API_KEY` directly from the ignored root `.env` file. It
does not require the key in the parent shell, and it never prints the credential-bearing
API endpoint. Ten approved Malaysian searches are run sequentially with timeouts,
bounded retries, and pauses. Up to 40 accepted, unique links receive rate-limited
`HEAD` redirect checks with a five-redirect ceiling; full job pages are not crawled.

Generated JSON and Markdown are written under the ignored
`.jooble-pilot-output/` directory. Those fetched datasets must not be committed
without a separate review and explicit approval.

Source labels are only preliminary evidence. Acceptance still requires redirect
resolution to a primary employer or official ATS destination, freshness checks, and
commercial confirmation from Jooble.
