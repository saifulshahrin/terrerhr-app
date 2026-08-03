export const APPROVED_PRODUCTION_ONLY_EVENT = Object.freeze({
  version: "20260723143425",
  name: "reconcile_candidate_engine_production_authorization",
  normalized_sql_md5: "f07c7ee2e1eaf811f0337b108bdc6e12",
  corrected_historical_sql_sha256:
    "9d7d4331c58a482c6f25e2369d0a289f611139b0125b23c29b90577ed0b4ee77",
  statement_count: 37,
  replayable: false,
  production_only: true,
  semantic_equivalence_required: true,
  replay_migration_generated: false,
  provenance: Object.freeze({
    source_branch: "repair/candidate-engine-production-ledger-plan-2026-07",
    original_commit: "680b351766a7bf8a809ec968a09af4fbc874b48a",
    corrected_authoritative_commit:
      "ae27965cd7a4c07bbee5c713040b61eff470200a",
    historical_path:
      "supabase/migrations/20260723143425_reconcile_candidate_engine_production_authorization.sql",
  }),
});

const EXPECTED_POLICY_NAMES = new Set(
  ["applications", "submissions", "activity_log"].flatMap((table) =>
    ["select", "insert", "update"].map((command) =>
      `${table}_${command}_staff`,
    ),
  ),
);

const REQUIRED_EVENT_FIELDS = [
  "version",
  "name",
  "normalized_sql_md5",
  "corrected_historical_sql_sha256",
  "statement_count",
  "replayable",
  "production_only",
  "semantic_equivalence_required",
  "replay_migration_generated",
  "provenance",
];

function stable(value) {
  return JSON.stringify(value);
}

function validateApprovedEvidence(event, failures) {
  if (!event || typeof event !== "object") {
    failures.push("approved production-only event evidence is missing");
    return;
  }

  for (const field of REQUIRED_EVENT_FIELDS) {
    if (!(field in event)) {
      failures.push(`approved event evidence is missing ${field}`);
    }
  }

  for (const [field, expected] of Object.entries(
    APPROVED_PRODUCTION_ONLY_EVENT,
  )) {
    if (stable(event[field]) !== stable(expected)) {
      failures.push(`approved event evidence ${field} mismatch`);
    }
  }
}

function validateNormalPrefix(repositoryMigrations, environmentLedger, failures) {
  const repositoryByVersion = new Map(
    repositoryMigrations.map((migration) => [migration.version, migration]),
  );
  const normalLedger = environmentLedger.filter(
    ({ version }) => version !== APPROVED_PRODUCTION_ONLY_EVENT.version,
  );

  for (const actual of normalLedger) {
    const expected = repositoryByVersion.get(actual.version);
    if (!expected) {
      failures.push(`unexpected normal migration ${actual.version}`);
      continue;
    }
    if (actual.name !== expected.name) {
      failures.push(`${actual.version}: normal migration name mismatch`);
    }
    if (actual.normalized_sql_md5 !== expected.normalized_sql_md5) {
      failures.push(`${actual.version}: normal migration hash mismatch`);
    }
  }

  const endpoint = normalLedger.at(-1)?.version;
  if (endpoint) {
    for (const expected of repositoryMigrations) {
      if (expected.version <= endpoint && !normalLedger.some(({ version }) => version === expected.version)) {
        failures.push(`missing normal migration ${expected.version} before ledger endpoint`);
      }
    }
  }

  for (let index = 1; index < normalLedger.length; index += 1) {
    if (normalLedger[index - 1].version >= normalLedger[index].version) {
      failures.push("normal migration ledger is not strictly ordered");
      break;
    }
  }

  return repositoryMigrations.filter(
    ({ version }) => !normalLedger.some((actual) => actual.version === version),
  );
}

function validateSemanticState(state, failures) {
  if (!state || typeof state !== "object") {
    failures.push("semantic authorization evidence is missing");
    return;
  }

  const requiredTrue = [
    "helper_exists",
    "authenticated_private_schema_usage",
    "authenticated_helper_execute",
  ];
  const requiredFalse = [
    "anon_helper_execute",
    "service_role_helper_execute",
    "public_helper_execute",
    "legacy_anonymous_policies_present",
    "legacy_broad_authenticated_policies_present",
    "delete_or_all_policies_present",
    "weaker_policy_or_grant_present",
  ];

  for (const field of requiredTrue) {
    if (state[field] !== true) failures.push(`semantic state ${field} must be true`);
  }
  for (const field of requiredFalse) {
    if (state[field] !== false) failures.push(`semantic state ${field} must be false`);
  }

  const policies = Array.isArray(state.staff_policies) ? state.staff_policies : [];
  const actualNames = new Set();
  for (const policy of policies) {
    actualNames.add(policy.name);
    if (policy.role !== "authenticated") {
      failures.push(`${policy.name}: policy role must be authenticated`);
    }
    if (!policy.uses_active_staff_helper) {
      failures.push(`${policy.name}: policy must use active-staff helper`);
    }
    if (!EXPECTED_POLICY_NAMES.has(policy.name)) {
      failures.push(`unexpected staff policy ${policy.name}`);
    }
  }
  for (const name of EXPECTED_POLICY_NAMES) {
    if (!actualNames.has(name)) failures.push(`missing staff policy ${name}`);
  }
  if (policies.length !== EXPECTED_POLICY_NAMES.size) {
    failures.push("semantic state must contain exactly nine staff policies");
  }
}

export function validateProductionLedgerException({
  repositoryMigrations,
  productionLedger,
  stagingLedger,
  exceptionEvidence,
  semanticState,
}) {
  const failures = [];
  validateApprovedEvidence(exceptionEvidence, failures);

  if (!Array.isArray(repositoryMigrations) || repositoryMigrations.length === 0) {
    failures.push("repository migration evidence is missing");
  }
  if (!Array.isArray(productionLedger)) failures.push("production ledger is missing");
  if (!Array.isArray(stagingLedger)) failures.push("staging ledger is missing");
  if (failures.some((failure) => failure.endsWith("ledger is missing"))) {
    return { ok: false, failures, pendingMigrations: [] };
  }

  const repositoryException = repositoryMigrations.filter(
    ({ version }) => version === APPROVED_PRODUCTION_ONLY_EVENT.version,
  );
  if (repositoryException.length > 0) {
    failures.push("approved production-only event must not enter replay migrations");
  }

  const productionExceptions = productionLedger.filter(
    ({ version }) => version === APPROVED_PRODUCTION_ONLY_EVENT.version,
  );
  if (productionExceptions.length !== 1) {
    failures.push("production must contain exactly one approved production-only event");
  } else {
    const actual = productionExceptions[0];
    for (const field of ["name", "normalized_sql_md5", "statement_count"]) {
      if (actual[field] !== APPROVED_PRODUCTION_ONLY_EVENT[field]) {
        failures.push(`production-only event ${field} mismatch`);
      }
    }
  }

  if (
    stagingLedger.some(
      ({ version }) => version === APPROVED_PRODUCTION_ONLY_EVENT.version,
    )
  ) {
    failures.push("staging must not contain the production-only event");
  }

  const pendingMigrations = validateNormalPrefix(
    repositoryMigrations,
    productionLedger,
    failures,
  );
  validateNormalPrefix(repositoryMigrations, stagingLedger, failures);
  validateSemanticState(semanticState, failures);

  return { ok: failures.length === 0, failures, pendingMigrations };
}

export function expectedSemanticState() {
  return {
    helper_exists: true,
    authenticated_private_schema_usage: true,
    authenticated_helper_execute: true,
    anon_helper_execute: false,
    service_role_helper_execute: false,
    public_helper_execute: false,
    legacy_anonymous_policies_present: false,
    legacy_broad_authenticated_policies_present: false,
    delete_or_all_policies_present: false,
    weaker_policy_or_grant_present: false,
    staff_policies: [...EXPECTED_POLICY_NAMES].map((name) => ({
      name,
      role: "authenticated",
      uses_active_staff_helper: true,
    })),
  };
}
