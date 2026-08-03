import assert from "node:assert/strict";
import { test } from "node:test";
import {
  APPROVED_PRODUCTION_ONLY_EVENT,
  expectedSemanticState,
  validateProductionLedgerException,
} from "../scripts/lib/production-ledger-exception.mjs";

const normal = [
  { version: "20260723140703", name: "repair_activity", normalized_sql_md5: "normal-a" },
  { version: "20260731035000", name: "unified_surface", normalized_sql_md5: "normal-b" },
];
const approvedLedgerEvent = {
  version: APPROVED_PRODUCTION_ONLY_EVENT.version,
  name: APPROVED_PRODUCTION_ONLY_EVENT.name,
  normalized_sql_md5: APPROVED_PRODUCTION_ONLY_EVENT.normalized_sql_md5,
  statement_count: APPROVED_PRODUCTION_ONLY_EVENT.statement_count,
};

function validInput() {
  return {
    repositoryMigrations: structuredClone(normal),
    productionLedger: [structuredClone(normal[0]), structuredClone(approvedLedgerEvent)],
    stagingLedger: [structuredClone(normal[0])],
    exceptionEvidence: structuredClone(APPROVED_PRODUCTION_ONLY_EVENT),
    semanticState: expectedSemanticState(),
  };
}

function expectFailure(mutate, fragment) {
  const input = validInput();
  mutate(input);
  const result = validateProductionLedgerException(input);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes(fragment)), result.failures.join("\n"));
}

test("exact production ledger with sole approved event passes", () => {
  const result = validateProductionLedgerException(validInput());
  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.deepEqual(result.pendingMigrations.map(({ version }) => version), ["20260731035000"]);
});

test("wrong production-only migration name fails", () =>
  expectFailure((input) => { input.productionLedger[1].name = "wrong"; }, "event name mismatch"));

test("wrong production-only statement count fails", () =>
  expectFailure((input) => { input.productionLedger[1].statement_count = 36; }, "statement_count mismatch"));

test("wrong production-only normalized MD5 fails", () =>
  expectFailure((input) => { input.productionLedger[1].normalized_sql_md5 = "bad"; }, "normalized_sql_md5 mismatch"));

test("wrong corrected historical SHA-256 fails", () =>
  expectFailure((input) => { input.exceptionEvidence.corrected_historical_sql_sha256 = "bad"; }, "corrected_historical_sql_sha256 mismatch"));

test("missing provenance fails", () =>
  expectFailure((input) => { delete input.exceptionEvidence.provenance; }, "missing provenance"));

test("wrong provenance fails", () =>
  expectFailure((input) => { input.exceptionEvidence.provenance.source_branch = "wrong"; }, "provenance mismatch"));

test("missing production-only classification fails", () =>
  expectFailure((input) => { delete input.exceptionEvidence.production_only; }, "missing production_only"));

test("production-only classification cannot be false", () =>
  expectFailure((input) => { input.exceptionEvidence.production_only = false; }, "production_only mismatch"));

test("semantic authorization mismatch fails", () =>
  expectFailure((input) => { input.semanticState.anon_helper_execute = true; }, "anon_helper_execute must be false"));

test("missing staff policy fails", () =>
  expectFailure((input) => { input.semanticState.staff_policies.pop(); }, "missing staff policy"));

test("another unexpected production migration fails", () =>
  expectFailure((input) => { input.productionLedger.push({ version: "20260725000000", name: "other", normalized_sql_md5: "x" }); }, "unexpected normal migration"));

test("missing normal repository migration before endpoint fails", () =>
  expectFailure((input) => {
    input.repositoryMigrations.splice(1, 0, { version: "20260723142000", name: "required", normalized_sql_md5: "required" });
    input.productionLedger.push({ version: "20260723150000", name: "endpoint", normalized_sql_md5: "endpoint" });
    input.repositoryMigrations.push({ version: "20260723150000", name: "endpoint", normalized_sql_md5: "endpoint" });
  }, "missing normal migration 20260723142000"));

test("normal migration hash mismatch still fails", () =>
  expectFailure((input) => { input.productionLedger[0].normalized_sql_md5 = "wrong"; }, "normal migration hash mismatch"));

test("historical event may not enter replay migration directory", () =>
  expectFailure((input) => { input.repositoryMigrations.push(structuredClone(approvedLedgerEvent)); }, "must not enter replay migrations"));

test("staging comparison rejects the production-only event", () =>
  expectFailure((input) => { input.stagingLedger.push(structuredClone(approvedLedgerEvent)); }, "staging must not contain"));

test("staging normal migration comparison remains strict", () =>
  expectFailure((input) => { input.stagingLedger[0].normalized_sql_md5 = "wrong"; }, "normal migration hash mismatch"));
