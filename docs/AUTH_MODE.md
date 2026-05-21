# Terrer Auth Mode

Terrer supports two auth modes via Vite env:

- `VITE_AUTH_MODE=demo`
- `VITE_AUTH_MODE=strict`

If `VITE_AUTH_MODE` is not set, Terrer defaults to `demo`.

## Demo Mode

- Login is not required.
- App shell loads directly.
- Role selector is enabled in the sidebar.
- Selected role is stored in localStorage (`terrer_public_role`).
- Use for stakeholder demos and local workflow walkthroughs.

## Strict Mode

- Supabase login is required.
- Access depends on valid `public.profiles` row with active status and valid role.
- Blocked state is enforced for missing/invalid/inactive profiles.
- Sidebar role override is disabled.

## Switching Back To Strict Login

Set:

`VITE_AUTH_MODE=strict`

Then restart the dev server/build so Vite picks up the env change.

## Admin Recovery

For strict-mode login recovery without weakening auth, see:

`docs/AUTH_RECOVERY.md`
