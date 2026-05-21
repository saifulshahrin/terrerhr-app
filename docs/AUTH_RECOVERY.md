# Terrer Auth Recovery (Strict Mode Safe)

This runbook is for local admin recovery only.

It does **not** weaken production auth and does **not** change `VITE_AUTH_MODE=strict`.

## Purpose

Use `scripts/setAdminPassword.mjs` to set a new password for:

- auth user id: `612730ac-36fb-4b38-b741-867fba41d9eb`
- email: `terrerhr@gmail.com`

The script verifies `public.profiles` first and requires `is_active=true`.

## Local env setup

Create/update local `.env` (or `.env.local`) in project root with:

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Important:
- Never expose service-role in frontend code.
- Never prefix service-role as `VITE_*`.
- `.env` is gitignored in this repo; do not commit local secrets.

## Run command

```powershell
node scripts/setAdminPassword.mjs "YourNewStrongPassword123!"
```

The script prints safe status only. It never logs the password or service role key.

## Run with immediate credential verification

```powershell
node scripts/setAdminPassword.mjs "TerrerTestPass2026" --verify
```

`--verify` performs an anon-key `signInWithPassword` test against the same project right after password reset.
No secrets are printed.

## PowerShell-safe temporary password format

For urgent recovery testing, use a temporary password with:
- letters + numbers only
- no spaces
- no shell-sensitive symbols

Example: `TerrerTestPass2026`

## After password reset: clear stale browser auth state

Before testing login again on `app.terrerhr.com`:

1. Open DevTools on the app domain.
2. Application tab:
3. Clear:
   - Local Storage for app domain
   - Session Storage for app domain
   - Cookies for app/supabase auth
4. Hard refresh (`Ctrl+Shift+R`) and sign in with the new password.
