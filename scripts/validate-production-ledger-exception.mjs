import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  expectedSemanticState,
  validateProductionLedgerException,
} from "./lib/production-ledger-exception.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const evidence = JSON.parse(
  await readFile(
    join(root, "docs", "database", "ledger-restoration", "ledger-evidence.json"),
    "utf8",
  ),
);

const pendingUnifiedOpportunityMigrations = [
  {
    version: "20260731035000",
    name: "unified_opportunity_surface_schema",
    normalized_sql_md5: "pending-local-file",
  },
  {
    version: "20260801085404",
    name: "allow_employer_job_detail_external_source",
    normalized_sql_md5: "pending-local-file",
  },
  {
    version: "20260802074653",
    name: "add_canonical_compensation_text",
    normalized_sql_md5: "pending-local-file",
  },
];

const shared = evidence.shared_migrations.map((migration) => ({
  version: migration.version,
  name: migration.name,
  normalized_sql_md5: migration.normalized_sql_md5,
}));
const productionLedger = [
  ...shared,
  {
    version: evidence.production_only_event.version,
    name: evidence.production_only_event.name,
    normalized_sql_md5: evidence.production_only_event.normalized_sql_md5,
    statement_count: evidence.production_only_event.statement_count,
  },
];

const result = validateProductionLedgerException({
  repositoryMigrations: [...shared, ...pendingUnifiedOpportunityMigrations],
  productionLedger,
  stagingLedger: shared,
  exceptionEvidence: evidence.production_only_event,
  semanticState: expectedSemanticState(),
});

const pendingVersions = result.pendingMigrations.map(({ version }) => version);
const expectedPending = pendingUnifiedOpportunityMigrations.map(({ version }) => version);
if (JSON.stringify(pendingVersions) !== JSON.stringify(expectedPending)) {
  result.failures.push(
    `pending sequence mismatch ${pendingVersions.join(",")} != ${expectedPending.join(",")}`,
  );
  result.ok = false;
}

if (!result.ok) {
  console.error("Unified Opportunity Gate 1 exception-aware dry-run FAILED");
  for (const failure of result.failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Unified Opportunity Gate 1 exception-aware dry-run PASSED");
  console.log(`- approved production-only event: ${evidence.production_only_event.version}`);
  console.log(`- pending migrations: ${pendingVersions.join(", ")}`);
  console.log("- staging comparison remains exception-free");
}
