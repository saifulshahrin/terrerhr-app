# Terrer Internal User Provisioning

This guide explains how to add and manage internal app users safely.

## Current Auth Model

- Supabase Auth handles sign-in credentials.
- `public.profiles` controls app access and app role.
- Valid app roles:
  - `admin`
  - `recruiter`
  - `bd`
- `auth.users.id` must match `public.profiles.id`.
- User must have `is_active = true` to access strict-mode app flows.

## Provision a New Internal User

1. Create user in Supabase Auth.
2. Copy the new Auth user UUID (`auth.users.id`).
3. Insert or update matching row in `public.profiles` using the same UUID.
4. Set role to one of `admin`, `recruiter`, `bd`.
5. Set `is_active = true`.
6. Ask the user to sign in with their Supabase Auth credentials.

## Step-by-Step (Supabase Dashboard)

1. Open Supabase project dashboard.
2. Go to Authentication > Users.
3. Create user (email + password or invite flow).
4. Copy the generated user ID (UUID).
5. Go to SQL Editor and run the profile upsert template below.

## SQL Templates

Replace placeholders:
- `<USER_UUID>`
- `<USER_EMAIL>`
- `<FULL_NAME>`
- `<ROLE>` (`admin` | `recruiter` | `bd`)

### 1) Create or Update Profile (Upsert)

```sql
insert into public.profiles (id, email, full_name, role, is_active)
values (
  '<USER_UUID>'::uuid,
  '<USER_EMAIL>',
  '<FULL_NAME>',
  '<ROLE>',
  true
)
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = excluded.is_active;
```

### 2) Change Role

```sql
update public.profiles
set role = '<ROLE>'
where id = '<USER_UUID>'::uuid;
```

### 3) Deactivate User

```sql
update public.profiles
set is_active = false
where id = '<USER_UUID>'::uuid;
```

### 4) Reactivate User

```sql
update public.profiles
set is_active = true
where id = '<USER_UUID>'::uuid;
```

### 5) Quick Verification

```sql
select id, email, full_name, role, is_active
from public.profiles
where id = '<USER_UUID>'::uuid;
```

## Operational Notes

- If Auth login succeeds but app shows blocked access, verify:
  - profile row exists
  - profile `id` exactly matches `auth.users.id`
  - `role` is one of `admin`, `recruiter`, `bd`
  - `is_active = true`

## Security Warnings

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- Never disable RLS to work around provisioning issues.
- Do not use demo mode in production. Keep `VITE_AUTH_MODE=strict` in production.
