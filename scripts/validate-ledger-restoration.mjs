import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(scriptDirectory, "..");
const migrationsDirectory = join(repositoryRoot, "supabase", "migrations");
const evidencePath = join(
  repositoryRoot,
  "docs",
  "database",
  "ledger-restoration",
  "ledger-evidence.json",
);

const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();

const failures = [];
const versions = new Map();

for (const name of migrationNames) {
  const match = name.match(/^(\d+)_/);
  if (!match) continue;
  const normalizedVersion =
    match[1].length === 8 ? match[1].padEnd(14, "0") : match[1];
  const names = versions.get(normalizedVersion) ?? [];
  names.push(name);
  versions.set(normalizedVersion, names);
}

for (const [version, names] of versions) {
  if (names.length > 1) {
    failures.push(`duplicate migration version ${version}: ${names.join(", ")}`);
  }
}

const expectedVersions = evidence.shared_migrations.map(({ version }) => version);
if ([...expectedVersions].sort().join("\n") !== expectedVersions.join("\n")) {
  failures.push("evidence manifest is not ordered by migration version");
}

for (const migration of evidence.shared_migrations) {
  const filename = `${migration.version}_${migration.name}.sql`;
  const path = join(migrationsDirectory, filename);
  let sql;

  try {
    sql = await readFile(path, "utf8");
  } catch {
    failures.push(`missing restoration migration ${filename}`);
    continue;
  }

  const sha256 = createHash("sha256").update(sql).digest("hex");
  if (sha256 !== migration.file_sha256) {
    failures.push(
      `${filename}: SHA-256 mismatch ${sha256} != ${migration.file_sha256}`,
    );
  }

  const normalizedSqlMd5 = createHash("md5")
    .update(sql.replace(/\s+/g, ""))
    .digest("hex");
  if (normalizedSqlMd5 !== migration.normalized_sql_md5) {
    failures.push(
      `${filename}: normalized SQL MD5 mismatch ${normalizedSqlMd5} != ${migration.normalized_sql_md5}`,
    );
  }

  if ((versions.get(migration.version) ?? []).length !== 1) {
    failures.push(`${filename}: migration version is absent or non-unique`);
  }
}

if (
  migrationNames.some((name) =>
    name.startsWith(
      `${evidence.production_only_event.version}_`,
    ),
  )
) {
  failures.push(
    `${evidence.production_only_event.version} must remain audit-only and must not exist as a replay migration`,
  );
}

const indexOf = (version) => expectedVersions.indexOf(version);
const helperVersion = "20260723133303";
for (const dependentVersion of [
  "20260723134205",
  "20260723135237",
  "20260723140703",
]) {
  if (indexOf(helperVersion) >= indexOf(dependentVersion)) {
    failures.push(
      `helper migration ${helperVersion} must precede dependent migration ${dependentVersion}`,
    );
  }
}

for (const dependentVersion of ["20260723135237", "20260723140703"]) {
  const migration = evidence.shared_migrations.find(
    ({ version }) => version === dependentVersion,
  );
  const sql = await readFile(
    join(migrationsDirectory, `${migration.version}_${migration.name}.sql`),
    "utf8",
  );
  if (!sql.includes("private.is_current_user_active_staff()")) {
    failures.push(
      `${dependentVersion} does not contain the required active-staff helper dependency`,
    );
  }
}

const candidateFiles = evidence.shared_migrations
  .filter(({ version }) => version.startsWith("20260723"))
  .map(({ version, name }) =>
    join(migrationsDirectory, `${version}_${name}.sql`),
  );
const candidateSql = (
  await Promise.all(candidateFiles.map((path) => readFile(path, "utf8")))
).join("\n");

for (const forbidden of [
  "external_opportunities",
  "external_opportunity_reviews",
  "normalized_source_url",
  "create_external_opportunity_review_trusted",
]) {
  if (candidateSql.includes(forbidden)) {
    failures.push(`Candidate Engine restoration unexpectedly contains ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error("Repository-ledger restoration static validation FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Repository-ledger restoration static validation PASSED");
  console.log(`- ${evidence.shared_migrations.length} restored migrations verified`);
  console.log("- migration versions are unique and ordered");
  console.log("- file SHA-256 and normalized ledger SQL hashes match");
  console.log("- helper precedes dependent Candidate Engine policies");
  console.log("- production-only event is absent from replay migrations");
  console.log("- Unified Opportunity objects are absent from the restoration chain");
}
