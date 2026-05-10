# BD Relationship Import Format (V1)

This file documents the CSV format for importing hiring-side relationship data into Terrer's BD Relationship Layer.

## CSV Columns

Required columns:
- `company_name`
- `contact_full_name`

Optional columns:
- `company_phone`
- `company_address`
- `company_city`
- `company_state`
- `company_country`
- `contact_first_name`
- `contact_last_name`
- `contact_email`
- `contact_phone`
- `contact_mobile_phone`
- `contact_job_title`
- `contact_department`
- `relationship_status`
- `source`
- `notes`

## Recommended Defaults

If omitted:
- `company_country`: defaults to `Malaysia`
- `relationship_status`: defaults to `new`
- `source`: defaults to `legacy_bd_list`

## Notes

- Companies are upserted by `normalized_name` (computed from `company_name`).
- Contacts are upserted by `email` where available (case-insensitive).
- If `contact_email` is missing, the importer will insert a new contact row (best-effort dedupe is limited).

