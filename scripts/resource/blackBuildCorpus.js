// BLACK BUILD CORPUS: builds every compiled object file (.black) of the current
// client index through the runtime object route, as resMan's LoadObject does
// (CjsBlackFormat.createObjectBuilder(bytes, { emit: "runtime" }).CreateObject(),
// registerObjectResources.js), and reports failures and build times.
//
// With --candidate '<json>', each file is also built a second time with those
// options merged into the builder's, and the two roots are compared through
// CjsSchema.getValues: the parity and timing proof for replacing the runtime
// read path (the BlackReader port). Values that differ between two builds on
// the SAME path (instance counters such as an observer's ID) are measured per
// file and left out of the comparison. The class-shaped read is the only
// one since the snapshot was removed; a candidate compares other reader
// options against it. Files come from tools-core, as the tests'
// client resources do (test/support/clientResources.js); geometry, textures and
// shaders are answered empty by a stub manager, so only the object build runs.
//
//   node scripts/resource/blackBuildCorpus.js [--prefix res:/dx9/] [--limit 0]
//     [--offset 0] [--runs 5] [--candidate '{"reader":"new"}'] [--paths a,b] [--out report.json]
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { clientResources } from "../../test/support/clientResources.js";
import { composeStubResMan } from "../../test/support/stubResMan.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import "../../npm/dist/trinity/index.js";
import "../../npm/dist/sof/index.js";
import "../../npm/dist/audio/index.js";
import "../../npm/dist/character/index.js";

const SERVER = process.env.CJS_TOOLS_SERVER ?? "http://127.0.0.1:5510";

/** The two files the BlackReader port is measured against, with their 2026-10-13 times. */
const BASELINES = [
  { path: "res:/dx9/model/turret/launcher/torpedo/torpedo_missile.black", ms: 0.41 },
  { path: "res:/fisfx/vds/vds_trail_fire_01a.black", ms: 17.6 }
];

function parseOptions(args)
{
  const options = { prefix: "res:/", offset: 0, limit: 0, runs: 5, candidate: null, paths: null, out: null };
  for (let index = 0; index < args.length; index += 2)
  {
    const name = args[index].replace(/^--/, ""), value = args[index + 1];
    if (!(name in options) || value === undefined) throw new Error(`bad option ${args[index]}`);
    if (name === "offset" || name === "limit" || name === "runs") options[name] = Number(value);
    else if (name === "candidate") options.candidate = JSON.parse(value);
    else if (name === "paths") options.paths = value.split(",").map(path => path.trim()).filter(Boolean);
    else options[name] = value;
  }
  if (!Number.isSafeInteger(options.runs) || options.runs < 1) throw new Error("--runs must be a positive integer");
  return options;
}

/** Builds the file's root object once. */
function Build(bytes, extra)
{
  return CjsBlackFormat.createObjectBuilder(bytes, { emit: "runtime", ...extra }).CreateObject();
}

/** Median build time in ms over `runs` builds, after one warm-up build. */
function Time(bytes, extra, runs)
{
  Build(bytes, extra);
  const times = [];
  for (let run = 0; run < runs; run++)
  {
    const start = performance.now();
    Build(bytes, extra);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

/** Plain, comparable form of a getValues result: typed arrays as arrays, cycles marked. */
function Normalize(value, seen = new WeakSet())
{
  if (value === null || typeof value !== "object") return typeof value === "number" && Number.isNaN(value) ? "NaN" : value;
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (seen.has(value)) return "[cycle]";
  seen.add(value);
  const result = Array.isArray(value) ? value.map(item => Normalize(item, seen)) : Object.fromEntries(Object.keys(value).sort().map(key => [ key, Normalize(value[key], seen) ]));
  seen.delete(value);
  return result;
}

/** Every path at which two normalized values differ, up to `limit`. */
function Differences(a, b, limit = 200, path = "", out = [])
{
  // -0 and +0 compare equal: Carbon's BlackReader copies the stored float bits (a
  // stored -0 stays -0), while the values transport normalizes the sign.
  if (out.length >= limit || Object.is(a, b) || (a === 0 && b === 0)) return out;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object")
  {
    out.push({ path: path || "/", current: a, candidate: b });
    return out;
  }
  if (Array.isArray(a) !== Array.isArray(b))
  {
    out.push({ path: path || "/", current: "array?" + Array.isArray(a), candidate: "array?" + Array.isArray(b) });
    return out;
  }
  for (const key of new Set([ ...Object.keys(a), ...Object.keys(b) ])) Differences(a[key], b[key], limit, `${path}/${key}`, out);
  return out;
}

/**
 * The class.member that threw: a failed build's message is the nesting path
 * (`Parent.member: Child.member: ... Leaf.member after x: reason`), so the
 * deepest class.member named before the reason.
 */
function FailingMember(message)
{
  const members = [ ...message.matchAll(/\b([A-Z][A-Za-z0-9]+\.[a-zA-Z_][A-Za-z0-9_]*)\b(?: after [A-Za-z0-9_]+)?:/g) ].map(match => match[1]);
  return members.length ? members[members.length - 1] : null;
}

const options = parseOptions(process.argv.slice(2));
const client = await clientResources();
if (client.skip) throw new Error(client.skip);
composeStubResMan(() => null);

let paths = options.paths;
if (!paths)
{
  const index = await (await fetch(`${SERVER}/eve/${client.build}/app/resfileindex.txt`)).text();
  const prefix = options.prefix.toLowerCase();
  paths = index.split(/\r?\n/).map(line => line.split(",")[0].trim()).filter(path => path.toLowerCase().endsWith(".black") && path.toLowerCase().startsWith(prefix));
  for (const { path } of BASELINES) if (!paths.includes(path) && path.startsWith(prefix)) paths.push(path);
  paths = paths.slice(options.offset, options.limit ? options.offset + options.limit : undefined);
}

const report = { build: client.build, candidate: options.candidate, runs: options.runs, files: 0, failures: [], mismatches: [], baselines: [], slowest: [], totalMs: { current: 0, candidate: 0 } };
const timings = [];
for (const [ number, path ] of paths.entries())
{
  let bytes;
  try { bytes = await client.Read(path); }
  catch (error) { report.failures.push({ path, stage: "read", error: error.message }); continue; }
  report.files++;
  const entry = { path };
  try
  {
    entry.current = Time(bytes, {}, options.runs);
    report.totalMs.current += entry.current;
  }
  catch (error) { report.failures.push({ path, stage: "current", error: String(error.message ?? error).slice(0, 300) }); continue; }
  if (options.candidate)
  {
    try
    {
      entry.candidate = Time(bytes, options.candidate, options.runs);
      report.totalMs.candidate += entry.candidate;
      const first = Normalize(CjsSchema.getValues(Build(bytes, {})));
      const noise = new Set(Differences(first, Normalize(CjsSchema.getValues(Build(bytes, {})))).map(item => item.path));
      const differences = Differences(first, Normalize(CjsSchema.getValues(Build(bytes, options.candidate)))).filter(item => !noise.has(item.path));
      if (differences.length) report.mismatches.push({ path, count: differences.length, first: differences.slice(0, 5), ignoredNoise: noise.size });
    }
    catch (error)
    {
      const message = String(error.message ?? error);
      report.failures.push({ path, stage: "candidate", member: FailingMember(message), error: message.slice(-400) });
    }
  }
  timings.push(entry);
  const baseline = BASELINES.find(item => item.path === path);
  if (baseline) report.baselines.push({ ...entry, recordedMs: baseline.ms });
  if ((number + 1) % 500 === 0) console.log(`${number + 1}/${paths.length} files, ${report.failures.length} failures, ${report.mismatches.length} mismatches`);
}
report.slowest = timings.sort((a, b) => b.current - a.current).slice(0, 25);
// Candidate failures grouped by the class.member they name: the declarations to fix.
const byMember = {};
for (const failure of report.failures) if (failure.stage === "candidate") byMember[failure.member ?? "(unnamed)"] = (byMember[failure.member ?? "(unnamed)"] ?? 0) + 1;
report.candidateFailuresByMember = Object.fromEntries(Object.entries(byMember).sort((a, b) => b[1] - a[1]));
report.totalMs.current = Math.round(report.totalMs.current);
report.totalMs.candidate = Math.round(report.totalMs.candidate);

console.log(JSON.stringify({ build: report.build, files: report.files, failures: report.failures.length, mismatches: report.mismatches.length, totalMs: report.totalMs, baselines: report.baselines,
  candidateFailuresByMember: Object.fromEntries(Object.entries(report.candidateFailuresByMember).slice(0, 15)) }, null, 1));
if (options.out) writeFileSync(options.out, JSON.stringify(report, null, 1));
process.exit(0);
