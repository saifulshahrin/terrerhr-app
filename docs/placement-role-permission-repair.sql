-- Applied via Supabase migration repair_placement_role_helper_execute, 2026-09-25.
-- RLS invokes this helper as the signed-in database role.
-- Preserve private-schema isolation and deny anonymous execution.
grant execute on function private.is_current_user_any_role(text[]) to authenticated;
