import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SEARCHES = [
  'Finance Manager', 'Data Analyst', 'Software Engineer', 'Marketing Executive',
  'Customer Success', 'Human Resources', 'Operations Executive', 'Fresh Graduate',
  'Accountant', 'Sales Executive',
] as const;

const AGGREGATORS = [
  'jooble', 'jobleads', 'ziprecruiter', 'linkedin', 'jobstreet', 'jora',
  'indeed', 'talent.com', 'adzuna', 'careerjet',
];
const ATS_HOST_MARKERS = [
  'myworkdayjobs.com', 'greenhouse.io', 'lever.co', 'smartrecruiters.com',
  'successfactors.com', 'oraclecloud.com', 'recruitee.com', 'jobvite.com',
  'ceipal.com',
];
const MALAYSIA_MARKERS = [
  'malaysia', 'kuala lumpur', 'selangor', 'petaling jaya', 'cyberjaya',
  'putrajaya', 'shah alam', 'klang', 'subang', 'penang', 'johor', 'melaka',
  'malacca', 'perak', 'sabah', 'sarawak', 'kedah', 'kelantan', 'terengganu',
  'negeri sembilan', 'pahang', 'labuan',
];
const KLANG_VALLEY_MARKERS = [
  'kuala lumpur', 'selangor', 'petaling jaya', 'cyberjaya', 'putrajaya',
  'shah alam', 'klang', 'subang', 'puchong', 'kajang', 'bangsar',
];

export type SourceClass =
  | 'likely direct employer'
  | 'likely official ATS'
  | 'known aggregator'
  | 'unknown or intermediary'
  | 'malformed or incomplete';

type RawJob = Record<string, unknown>;
type RedirectResult = {
  joobleUrl: string;
  redirectCount: number;
  finalUrl: string | null;
  finalHostname: string | null;
  destinationClass: 'direct employer' | 'official ATS' | 'job board' | 'aggregator' | 'unknown';
  available: boolean | null;
  status: number | null;
  error: string | null;
};
export type PilotRecord = {
  query: string;
  id: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  source: string | null;
  link: string | null;
  snippet: string | null;
  employmentType: string | null;
  updated: string | null;
  sourceClass: SourceClass;
  complete: boolean;
  accepted: boolean;
  duplicate: boolean;
  duplicateReasons: string[];
  malaysiaRelevance: 'clearly Malaysian' | 'vague or overseas' | 'suspicious mismatch';
  redirect: RedirectResult | null;
};

function clean(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text || null;
}

export function parseEnv(text: string, name: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] !== name) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value.trim() || null;
  }
  return null;
}

export function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
}

export function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|gclid|fbclid|ref|source)/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.toString();
  } catch { return null; }
}

export function isAggregator(value: string | null): boolean {
  const haystack = (value || '').toLowerCase();
  return AGGREGATORS.some((name) => haystack.includes(name));
}

export function classifySource(source: string | null, link: string | null): SourceClass {
  const host = hostnameOf(link);
  if (!source || !host) return 'malformed or incomplete';
  if (isAggregator(source) || isAggregator(host)) return 'known aggregator';
  if (ATS_HOST_MARKERS.some((marker) => host.includes(marker))) return 'likely official ATS';
  return 'unknown or intermediary';
}

export function classifyDestination(host: string | null): RedirectResult['destinationClass'] {
  if (!host) return 'unknown';
  if (isAggregator(host)) return 'aggregator';
  if (ATS_HOST_MARKERS.some((marker) => host.includes(marker))) return 'official ATS';
  if (/jobs?|careers?|recruit|talent/i.test(host)) return 'job board';
  return 'direct employer';
}

function malaysiaRelevance(location: string | null): PilotRecord['malaysiaRelevance'] {
  const value = (location || '').toLowerCase();
  if (MALAYSIA_MARKERS.some((marker) => value.includes(marker))) return 'clearly Malaysian';
  if (/(singapore|india|indonesia|thailand|philippines|australia|united states|remote worldwide)/i.test(value)) {
    return 'suspicious mismatch';
  }
  return 'vague or overseas';
}

function sleep(ms: number) { return new Promise((resolveSleep) => setTimeout(resolveSleep, ms)); }

async function fetchWithRetry(url: string, init: RequestInit, label: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.status < 500 || attempt === attempts) return response;
      lastError = new Error(`${label} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
    } finally {
      clearTimeout(timer);
    }
    await sleep(500 * attempt);
  }
  throw new Error(`${label} failed after bounded retries: ${lastError instanceof Error ? lastError.name : 'network error'}`);
}

async function queryJooble(apiKey: string, keywords: string): Promise<RawJob[]> {
  const endpoint = `https://jooble.org/api/${encodeURIComponent(apiKey)}`;
  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, location: 'Malaysia', page: '1', ResultOnPage: '50', companysearch: 'false' }),
  }, `Jooble search for ${keywords}`);
  if (!response.ok) throw new Error(`Jooble search for ${keywords} returned HTTP ${response.status}`);
  const body = await response.json().catch(() => null) as { jobs?: unknown } | null;
  if (!body || !Array.isArray(body.jobs)) throw new Error(`Jooble search for ${keywords} returned a malformed response`);
  return body.jobs.filter((job): job is RawJob => Boolean(job && typeof job === 'object'));
}

function toRecord(query: string, job: RawJob): PilotRecord {
  const record = {
    query,
    id: clean(job.id),
    title: clean(job.title),
    company: clean(job.company),
    location: clean(job.location),
    salary: clean(job.salary),
    source: clean(job.source),
    link: clean(job.link),
    snippet: clean(job.snippet)?.slice(0, 600) || null,
    employmentType: clean(job.type),
    updated: clean(job.updated),
  };
  const complete = Boolean(record.id && record.title && record.company && record.location && record.source && record.link);
  const sourceClass = complete ? classifySource(record.source, record.link) : 'malformed or incomplete';
  return {
    ...record,
    sourceClass,
    complete,
    accepted: complete && sourceClass !== 'known aggregator',
    duplicate: false,
    duplicateReasons: [],
    malaysiaRelevance: malaysiaRelevance(record.location),
    redirect: null,
  };
}

export function markDuplicates(records: PilotRecord[]): void {
  const seenId = new Set<string>();
  const seenUrl = new Set<string>();
  const seenComposite = new Set<string>();
  for (const record of records) {
    record.duplicateReasons = [];
    record.duplicate = false;
    const id = record.id?.toLowerCase() || null;
    const url = normalizeUrl(record.redirect?.finalUrl || record.link);
    const composite = [record.company, record.title, record.location].map((value) => (value || '').toLowerCase().trim()).join('|');
    if (id && seenId.has(id)) record.duplicateReasons.push('Jooble ID');
    if (url && seenUrl.has(url)) record.duplicateReasons.push('normalized final URL');
    if (composite !== '||' && seenComposite.has(composite)) record.duplicateReasons.push('company + title + location');
    if (id) seenId.add(id);
    if (url) seenUrl.add(url);
    if (composite !== '||') seenComposite.add(composite);
    record.duplicate = record.duplicateReasons.length > 0;
  }
}

async function checkRedirect(link: string): Promise<RedirectResult> {
  let current = link;
  let redirects = 0;
  try {
    for (; redirects <= 5; redirects += 1) {
      const response = await fetchWithRetry(current, {
        method: 'HEAD',
        redirect: 'manual',
        headers: { 'User-Agent': 'TerrerHR-Jooble-Suitability-Pilot/1.0' },
      }, 'redirect check', 2);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) return { joobleUrl: link, redirectCount: redirects, finalUrl: current, finalHostname: hostnameOf(current), destinationClass: classifyDestination(hostnameOf(current)), available: null, status: response.status, error: 'redirect without location' };
        current = new URL(location, current).toString();
        continue;
      }
      const host = hostnameOf(current);
      const available = response.status >= 200 && response.status < 400
        ? true
        : response.status === 404 || response.status === 410
          ? false
          : null;
      return { joobleUrl: link, redirectCount: redirects, finalUrl: current, finalHostname: host, destinationClass: classifyDestination(host), available, status: response.status, error: null };
    }
    return { joobleUrl: link, redirectCount: redirects, finalUrl: current, finalHostname: hostnameOf(current), destinationClass: classifyDestination(hostnameOf(current)), available: null, status: null, error: 'redirect limit exceeded' };
  } catch (error) {
    return { joobleUrl: link, redirectCount: redirects, finalUrl: current, finalHostname: hostnameOf(current), destinationClass: classifyDestination(hostnameOf(current)), available: false, status: null, error: error instanceof Error ? error.name : 'network error' };
  }
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function stats(records: PilotRecord[]) {
  return {
    total: records.length,
    complete: records.filter((r) => r.complete).length,
    accepted: records.filter((r) => r.accepted).length,
    rejected: records.filter((r) => r.sourceClass === 'known aggregator').length,
    likelyDirect: records.filter((r) => r.sourceClass === 'likely direct employer').length,
    likelyAts: records.filter((r) => r.sourceClass === 'likely official ATS').length,
    unknown: records.filter((r) => r.sourceClass === 'unknown or intermediary').length,
    missingFields: records.filter((r) => !r.complete).length,
    duplicates: records.filter((r) => r.duplicate).length,
  };
}

function percentage(n: number, d: number) { return d ? Number(((n / d) * 100).toFixed(1)) : 0; }

function buildReport(records: PilotRecord[], generatedAt: string) {
  const redirectRecords = records.filter((r) => r.redirect);
  const overall = stats(records);
  const acceptedUnique = records.filter((r) => r.accepted && !r.duplicate);
  const finalDirect = redirectRecords.filter((r) => r.redirect?.destinationClass === 'direct employer').length;
  const finalAts = redirectRecords.filter((r) => r.redirect?.destinationClass === 'official ATS').length;
  const dead = redirectRecords.filter((r) => r.redirect?.available === false).length;
  const duplicateRate = percentage(overall.duplicates, overall.total);
  const missingRate = percentage(overall.missingFields, overall.total);
  const redirectDirectRate = percentage(finalDirect, redirectRecords.length);
  const redirectAtsRate = percentage(finalAts, redirectRecords.length);
  const aggregatorFinalRate = percentage(redirectRecords.filter((r) => r.redirect?.destinationClass === 'aggregator').length, redirectRecords.length);
  const clearlyMalaysian = records.filter((r) => r.malaysiaRelevance === 'clearly Malaysian').length;
  const active = redirectRecords.filter((r) => r.redirect?.available === true).length;
  let verdict: 'GO — suitable as Terrer’s primary breadth feed' | 'CONDITIONAL GO — useful as a supplementary feed' | 'NO-GO — insufficient quality or unsuitable redirects';
  if (redirectDirectRate + redirectAtsRate >= 70 && missingRate <= 15 && duplicateRate <= 25) verdict = 'GO — suitable as Terrer’s primary breadth feed';
  else if (redirectDirectRate + redirectAtsRate >= 25 && missingRate <= 35) verdict = 'CONDITIONAL GO — useful as a supplementary feed';
  else verdict = 'NO-GO — insufficient quality or unsuitable redirects';

  const bySearch = Object.fromEntries(SEARCHES.map((query) => [query, stats(records.filter((r) => r.query === query))]));
  const sourceCounts = countBy(records.map((r) => r.source || '(missing)'));
  const hostnameCounts = countBy(redirectRecords.map((r) => r.redirect?.finalHostname || '(unresolved)'));
  const now = new Date(generatedAt).getTime();
  const freshnessBuckets = countBy(records.map((r) => {
    if (!r.updated) return 'missing';
    const ageDays = (now - new Date(r.updated).getTime()) / 86_400_000;
    if (!Number.isFinite(ageDays)) return 'malformed';
    if (ageDays < -1) return 'future dated';
    if (ageDays <= 7) return '0–7 days';
    if (ageDays <= 30) return '8–30 days';
    if (ageDays <= 90) return '31–90 days';
    return 'over 90 days';
  }));
  const sourceSummaries = Object.entries(sourceCounts).map(([source, count]) => ({
    source,
    count,
    classification: source === '(missing)'
      ? 'malformed or incomplete'
      : classifySource(source, source.includes('.') ? `https://${source}` : null),
    example: records.find((r) => (r.source || '(missing)') === source)?.title || null,
  })).sort((a, b) => b.count - a.count);
  const hostnameSummaries = Object.entries(hostnameCounts).map(([hostname, count]) => ({
    hostname,
    count,
    classification: hostname === '(unresolved)' ? 'unknown' : classifyDestination(hostname),
  })).sort((a, b) => b.count - a.count);
  const otherLocations = countBy(records.filter((r) => r.malaysiaRelevance === 'clearly Malaysian' && !KLANG_VALLEY_MARKERS.some((m) => (r.location || '').toLowerCase().includes(m))).map((r) => r.location || '(missing)'));
  const samples = {
    bestAccepted: acceptedUnique.filter((r) => ['direct employer', 'official ATS'].includes(r.redirect?.destinationClass || '') || ['likely direct employer', 'likely official ATS'].includes(r.sourceClass)).slice(0, 20),
    questionable: records.filter((r) => r.sourceClass === 'unknown or intermediary' || r.malaysiaRelevance !== 'clearly Malaysian' || r.redirect?.available !== true).slice(0, 10),
    rejectedAggregators: records.filter((r) => r.sourceClass === 'known aggregator' || r.redirect?.destinationClass === 'aggregator').slice(0, 10),
  };
  return {
    generatedAt,
    scope: { searches: SEARCHES, location: 'Malaysia', page: 1, resultOnPage: 50, redirectSampleSize: redirectRecords.length },
    verdict,
    overall: { ...overall, deadOrUnavailableLinks: dead, duplicateRate, missingFieldRate: missingRate },
    bySearch,
    sourceQuality: { sourceCounts, finalHostnameCounts: hostnameCounts, sourceSummaries, hostnameSummaries },
    redirectQuality: {
      directToEmployerPercentage: redirectDirectRate,
      directToAtsPercentage: redirectAtsRate,
      oneIntermediaryPercentage: percentage(redirectRecords.filter((r) => r.redirect?.redirectCount === 1).length, redirectRecords.length),
      multiRedirectPercentage: percentage(redirectRecords.filter((r) => (r.redirect?.redirectCount || 0) > 1).length, redirectRecords.length),
      aggregatorFinalDestinationPercentage: aggregatorFinalRate,
      deadLinkPercentage: percentage(dead, redirectRecords.length),
      unresolvedOrBlockedPercentage: percentage(redirectRecords.filter((r) => r.redirect?.available === null).length, redirectRecords.length),
    },
    malaysiaRelevance: {
      clearlyMalaysianRoles: clearlyMalaysian,
      vagueOrOverseasRoles: records.filter((r) => r.malaysiaRelevance === 'vague or overseas').length,
      suspiciousLocationMismatches: records.filter((r) => r.malaysiaRelevance === 'suspicious mismatch').length,
      klangValleyConcentration: records.filter((r) => KLANG_VALLEY_MARKERS.some((m) => (r.location || '').toLowerCase().includes(m))).length,
      otherMalaysianLocations: otherLocations,
    },
    freshness: { updatedDistribution: freshnessBuckets, activeDestinationPercentage: percentage(active, redirectRecords.length), feedFreshButUnavailable: redirectRecords.filter((r) => r.updated && r.redirect?.available === false).length },
    samples,
    integrationAssessment: {
      verdict,
      rationale: {
        sourceQuality: `${overall.likelyDirect} likely direct and ${overall.likelyAts} likely ATS records before redirect verification`,
        redirectQuality: `${redirectDirectRate}% direct-employer and ${redirectAtsRate}% official-ATS final destinations in the bounded sample`,
        malaysiaCoverage: `${percentage(clearlyMalaysian, overall.total)}% clearly Malaysian locations`,
        freshness: `${percentage(active, redirectRecords.length)}% of checked destinations appeared available`,
        duplicateRate: `${duplicateRate}%`,
        missingFieldRate: `${missingRate}%`,
        operationalCost: 'Requires redirect resolution, source allow/block lists, expiry checks, and conservative manual review of unknown intermediaries.',
        maintenanceBurden: 'Moderate to high because source names alone do not establish provenance and redirect destinations can change.',
        candidateAcquisitionFit: 'Useful only where Terrer resolves primary employer/ATS destinations and suppresses aggregator or unverifiable records.',
      },
    },
    commercialQuestions: [
      'Malaysian feed and display rights', 'Permitted caching duration', 'Permitted field display',
      'Attribution requirements', 'Redirect requirements', 'Refresh frequency',
      'Expiry and deletion requirements', 'Traffic minimums', 'CPC or CPA terms',
      'API limits', 'Rate limits', 'Commercial fees',
    ],
    records,
  };
}

function markdown(report: ReturnType<typeof buildReport>): string {
  const rows = (values: Record<string, number>) => Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => `| ${name.replace(/\|/g, '\\|')} | ${count} |`).join('\n');
  const searchRows = Object.entries(report.bySearch).map(([query, value]) => `| ${query} | ${value.total} | ${value.complete} | ${value.accepted} | ${value.rejected} | ${value.likelyDirect} | ${value.likelyAts} | ${value.unknown} | ${value.missingFields} | ${value.duplicates} |`).join('\n');
  const sampleRows = (items: PilotRecord[]) => items.map((r) => `| ${r.title || '(missing)'} | ${r.company || '(missing)'} | ${r.location || '(missing)'} | ${r.source || '(missing)'} | ${r.redirect?.finalHostname || '(unchecked)'} |`).join('\n');
  return `# Jooble API suitability pilot

Generated: ${report.generatedAt}

## Verdict

**${report.verdict}**

## A. Overall totals

| Metric | Count |
|---|---:|
| Results returned | ${report.overall.total} |
| Complete records | ${report.overall.complete} |
| Missing-field records | ${report.overall.missingFields} |
| Rejected aggregator records | ${report.overall.rejected} |
| Likely direct-employer records | ${report.overall.likelyDirect} |
| Likely ATS records | ${report.overall.likelyAts} |
| Unknown-source records | ${report.overall.unknown} |
| Dead or unavailable sampled links | ${report.overall.deadOrUnavailableLinks} |
| Duplicate records | ${report.overall.duplicates} |

## B. Results by search category

| Search | Total | Complete | Accepted | Rejected | Direct | ATS | Unknown | Missing | Duplicates |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${searchRows}

## C. Top source names and final hostnames

### Sources
| Source | Count |
|---|---:|
${rows(report.sourceQuality.sourceCounts)}

### Final hostnames
| Hostname | Count |
|---|---:|
${rows(report.sourceQuality.finalHostnameCounts)}

## D. Redirect-quality analysis

- Direct to employer: ${report.redirectQuality.directToEmployerPercentage}%
- Direct to official ATS: ${report.redirectQuality.directToAtsPercentage}%
- One intermediary: ${report.redirectQuality.oneIntermediaryPercentage}%
- Multiple redirects: ${report.redirectQuality.multiRedirectPercentage}%
- Aggregator final destination: ${report.redirectQuality.aggregatorFinalDestinationPercentage}%
- Dead link: ${report.redirectQuality.deadLinkPercentage}%
- Unresolved or blocked: ${report.redirectQuality.unresolvedOrBlockedPercentage}%

## E. Malaysian relevance

- Clearly Malaysian roles: ${report.malaysiaRelevance.clearlyMalaysianRoles}
- Vague or overseas roles: ${report.malaysiaRelevance.vagueOrOverseasRoles}
- Klang Valley concentration: ${report.malaysiaRelevance.klangValleyConcentration}
- Suspicious location mismatches: ${report.malaysiaRelevance.suspiciousLocationMismatches}

## F. Freshness

- Active sampled destinations: ${report.freshness.activeDestinationPercentage}%
- Fresh feed records with unavailable sampled destination: ${report.freshness.feedFreshButUnavailable}

## G. Sample records

### Best accepted
| Title | Company | Location | Source | Final hostname |
|---|---|---|---|---|
${sampleRows(report.samples.bestAccepted)}

### Questionable
| Title | Company | Location | Source | Final hostname |
|---|---|---|---|---|
${sampleRows(report.samples.questionable)}

### Rejected aggregator examples
| Title | Company | Location | Source | Final hostname |
|---|---|---|---|---|
${sampleRows(report.samples.rejectedAggregators)}

## H. Integration assessment

${Object.entries(report.integrationAssessment.rationale).map(([key, value]) => `- **${key}:** ${value}`).join('\n')}

## I. Commercial questions requiring Jooble confirmation

${report.commercialQuestions.map((question) => `- ${question}`).join('\n')}
`;
}

async function main() {
  const root = resolve(process.cwd());
  const envText = await readFile(resolve(root, '.env'), 'utf8').catch(() => '');
  const apiKey = parseEnv(envText, 'JOOBLE_API_KEY');
  if (!apiKey) throw new Error('JOOBLE_API_KEY is missing or empty in the local .env file.');

  const records: PilotRecord[] = [];
  for (const query of SEARCHES) {
    const jobs = await queryJooble(apiKey, query);
    records.push(...jobs.map((job) => toRecord(query, job)));
    await sleep(650);
  }
  markDuplicates(records);

  const redirectCandidates = SEARCHES.flatMap((query) =>
    records
      .filter((record) => record.query === query && record.complete && !record.duplicate && record.link)
      .slice(0, 4),
  );
  for (const record of redirectCandidates) {
    record.redirect = await checkRedirect(record.link as string);
    record.sourceClass = record.redirect.destinationClass === 'aggregator' ? 'known aggregator'
      : record.redirect.destinationClass === 'official ATS' ? 'likely official ATS'
      : record.redirect.destinationClass === 'direct employer' ? 'likely direct employer'
      : record.sourceClass;
    record.accepted = record.complete && record.sourceClass !== 'known aggregator' && record.redirect.available !== false;
    await sleep(600);
  }
  markDuplicates(records);

  const generatedAt = new Date().toISOString();
  const report = buildReport(records, generatedAt);
  const outDir = resolve(root, '.jooble-pilot-output');
  await mkdir(outDir, { recursive: true });
  const stamp = generatedAt.replace(/[:.]/g, '-');
  const jsonPath = resolve(outDir, `jooble-suitability-${stamp}.json`);
  const markdownPath = resolve(outDir, `jooble-suitability-${stamp}.md`);
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  await writeFile(markdownPath, markdown(report), 'utf8');
  console.log(JSON.stringify({
    verdict: report.verdict,
    overall: report.overall,
    redirectQuality: report.redirectQuality,
    malaysiaRelevance: report.malaysiaRelevance,
    output: { jsonPath, markdownPath },
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Jooble pilot failed.');
    process.exitCode = 1;
  });
}
