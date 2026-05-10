/*
  # Add unique email index to public.bd_contacts

  Context:
  - Importer uses upsert(..., { onConflict: 'email' })
  - bd_contacts.email must have a unique constraint/index for ON CONFLICT(email) to work.
  - We allow NULL/blank emails by using a partial unique index.
*/

create unique index if not exists bd_contacts_email_unique
  on public.bd_contacts (lower(email))
  where email is not null and length(trim(email)) > 0;

