# Current Approved Iteration

Unify recruiter workflow candidate truth around live Supabase candidate data with minimal blast radius.

## Approved First-Pass Scope
- src/lib/candidates.ts
- src/pages/TopMatches.tsx
- src/lib/dashboardData.ts
- src/pages/Pipeline.tsx

Conditional only if clearly required:
- src/store/StoreContext.tsx

Out of scope:
- src/pages/Candidates.tsx
- src/pages/Jobs.tsx
- src/pages/Dashboard.tsx
- src/pages/JobIntake.tsx
- Supabase schema changes
- migrations
- views
- RPCs

## Implementation Order
1. candidates helper layer
2. TopMatches
3. dashboardData
4. Pipeline

## Rules
- No schema changes
- Do not delete mockData.ts
- Preserve existing recruiter actions
- Stop if risk or ambiguity appears
- Keep changes narrow