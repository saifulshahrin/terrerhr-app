import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [orderSql, consentSql, storeSource, dashboardSource, queueSource] = await Promise.all([
  readFile('supabase/migrations/20260917000100_add_placement_job_orders.sql', 'utf8'),
  readFile('supabase/migrations/20260918000100_add_candidate_submission_consent.sql', 'utf8'),
  readFile('src/store/StoreContext.tsx', 'utf8'),
  readFile('src/pages/Dashboard.tsx', 'utf8'),
  readFile('src/pages/BDQueue.tsx', 'utf8'),
]);

test('client submission requires an approved Placement Order at the database boundary', () => {
  assert.match(orderSql, /new\.submission_stage = 'submitted_to_client'/);
  assert.match(orderSql, /o\.approval_status = 'approved'/);
  assert.match(orderSql, /raise exception 'An approved Placement Order is required before client submission'/);
});

test('client submission requires exact candidate, role and client consent', () => {
  assert.match(consentSql, /where submission_id = new\.id/);
  assert.match(consentSql, /consent_record\.job_id is distinct from new\.job_id/);
  assert.match(consentSql, /consent_record\.candidate_id is distinct from new\.candidate_id/);
  assert.match(consentSql, /Candidate consent tied to this exact client and role is required/);
});

test('recruiter output enters BD review instead of bypassing commercial and consent gates', () => {
  assert.match(storeSource, /sendToBdReviewWithOutput/);
  assert.match(storeSource, /submission_stage: 'ready_for_bd_review'/);
  assert.doesNotMatch(storeSource, /const submitToClientWithOutput/);
  assert.doesNotMatch(storeSource, /const submitToClient =/);
});

test('dashboard cannot bypass the guarded BD review screen', () => {
  assert.match(dashboardSource, /onNavigate\?\.\('bd-queue'\)/);
  assert.doesNotMatch(dashboardSource, /updateSubmissionInStore\(item\.submissionId, 'submitted_to_client'\)/);
});

test('BD queue checks both approval prerequisites before enabling client submission', () => {
  assert.match(queueSource, /approval_status', 'approved'/);
  assert.match(queueSource, /disabled=\{busy \|\| !item\.consent \|\| !item\.orderApproved\}/);
});
