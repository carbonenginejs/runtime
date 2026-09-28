// Checks docs/standards/source-style.md § "Typed arrays and scratch": typed
// arrays and math values allocated per call, scratch slots that are misnamed
// or escape, and math-pool values that are taken and never given back.
//
// WHY THIS SCRIPT EXISTS. The demo slowed the longer it ran (2026-09-28): the
// JS heap swung 330-555 MB, about 7 MB/s of garbage, most of it small typed
// arrays and gl-matrix vectors made fresh every frame. ccpwgl hit the same wall
// on Chromium.
//
// ALLOCATIONS:
//   - `new <X>Array(<number>)` and `new <X>Array([ <numbers> ])` are fixed-size
//     values and are flagged ANYWHERE (constructors, field initialisers, top
//     level) except inside `static scratch = {...}`: use the math type's create;
//   - inside a function or method body, any other `new <X>Array(...)` and the
//     math namespaces' `create`, `clone` and `fromValues` (vec*, quat, mat*,
//     box3, sph3, ray3, lne3, tri3, pln, color).
//   A line carrying `// alloc: <why>` is not counted.
//
// SCRATCH: a slot in `static scratch = {...}` is named type_index (vec3_0);
// a local bound from `...scratch` keeps the slot's name; and a scratch-bound
// local assigned to `this.x`, returned, or captured by a closure is flagged.
//
// POOL BALANCE. Every `const v = X.alloc()` (no arguments: the math pools;
// per-object data's `alloc(accumulator, ...)` is a frame lease the accumulator
// reclaims) in a function must reach `X.unalloc(v)` with the same X on every
// exit: a missing unalloc, a return or throw between the alloc and the unalloc
// (outside a finally that releases it), and `vec3.alloc` given back through
// `vec2.unalloc` are flagged. A value returned to the caller carries
// `// pool-return: <why>` on its alloc line. Pool use in a function that does
// not call itself is listed as INFO only, as a scratch candidate.
//
// HOW THE BASELINE WORKS. Same ratchet as lint-instanceof: counts per file are
// frozen in scripts/typed-array-alloc-baseline.json, the check fails only when
// a file goes UP, and `--write` records a lower number once sites are fixed.
// `--list` prints every site.


import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RULE, scanTypedArrayAlloc } from "./typed-array-alloc.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const baselineFile = path.join(root, "scripts", "typed-array-alloc-baseline.json");
const HOT_FOLDERS = [ "src/trinity", "src/trinityal", "src/sof" ];

async function sourceFiles(directory)
{
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true }))
  {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(target);
  }
  return files;
}

const slash = value => value.replaceAll(path.sep, "/");

const counts = {};
const sites = {};
const scratch = {};
const scratchSites = {};
const pool = {};
const poolSites = {};
const info = [];
for (const file of await sourceFiles(sourceRoot))
{
  const relativeFile = slash(path.relative(root, file));
  const { allocations, scratchProblems, poolProblems, poolInfo } = scanTypedArrayAlloc(await fs.readFile(file, "utf8"), relativeFile);
  if (allocations.length) { counts[relativeFile] = allocations.length; sites[relativeFile] = allocations; }
  if (scratchProblems.length) { scratch[relativeFile] = scratchProblems.length; scratchSites[relativeFile] = scratchProblems; }
  if (poolProblems.length) { pool[relativeFile] = poolProblems.length; poolSites[relativeFile] = poolProblems; }
  info.push(...poolInfo);
}

/** Per-folder totals, hot folders first. */
function folderSummary()
{
  const folders = {};
  for (const [ file, count ] of Object.entries(counts))
  {
    const folder = file.split("/").slice(0, 2).join("/");
    folders[folder] = (folders[folder] ?? 0) + count;
  }
  return Object.entries(folders).sort(([ a, x ], [ b, y ]) =>
  {
    const hotA = HOT_FOLDERS.indexOf(a), hotB = HOT_FOLDERS.indexOf(b);
    if (hotA !== hotB) return (hotA === -1 ? 99 : hotA) - (hotB === -1 ? 99 : hotB);
    return y - x;
  });
}

if (process.argv.includes("--list"))
{
  for (const [ folder, count ] of folderSummary()) console.log(`${String(count).padStart(6)}  ${folder}`);
  console.log("");
  for (const [ file, found ] of Object.entries(sites).sort((a, b) => b[1].length - a[1].length))
  {
    console.log(`${file}: ${found.length}`);
    for (const site of found) console.log(`    ${site.line}  ${site.kind}`);
  }
  console.log("\nScratch:");
  for (const problems of Object.values(scratchSites)) for (const problem of problems) console.log(`  ${problem}`);
  console.log("\nPool balance:");
  for (const problems of Object.values(poolSites)) for (const problem of problems) console.log(`  ${problem}`);
  console.log("\nInfo (pool use in functions that do not call themselves):");
  for (const line of info) console.log(`  ${line}`);
  process.exit(0);
}

if (process.argv.includes("--write"))
{
  await fs.writeFile(baselineFile, `${JSON.stringify({ allocations: counts, scratch, pool }, null, 2)}\n`);
  console.log(`typed-array alloc baseline written: ${Object.keys(counts).length} files, ${Object.keys(scratch).length} with scratch problems, ${Object.keys(pool).length} with pool problems`);
  process.exit(0);
}

const baseline = JSON.parse(await fs.readFile(baselineFile, "utf8"));
const problems = [];
for (const [ file, found ] of Object.entries(counts))
{
  const allowed = baseline.allocations?.[file] ?? 0;
  if (found > allowed)
  {
    problems.push(`${file}: ${found} typed-array allocations inside functions, baseline ${allowed}. `
      + `Use the math type's create for a fixed-size value and class scratch for a per-call one (${RULE}). --list prints the sites.`);
  }
}
for (const [ file, found ] of Object.entries(scratch))
{
  const allowed = baseline.scratch?.[file] ?? 0;
  if (found > allowed) problems.push(...scratchSites[file].map(line => `${line} (scratch baseline ${allowed} for this file; ${RULE})`));
}
for (const [ file, found ] of Object.entries(pool))
{
  const allowed = baseline.pool?.[file] ?? 0;
  if (found > allowed) problems.push(...poolSites[file].map(line => `${line} (pool baseline ${allowed} for this file; ${RULE})`));
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
if (problems.length)
{
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s) above baseline. ${RULE}`);
  process.exit(1);
}
console.log(`Typed-array alloc: ${total} sites in ${Object.keys(counts).length} files held at baseline; `
  + `${Object.values(pool).reduce((a, b) => a + b, 0)} pool-balance problems held; ${Object.values(scratch).reduce((a, b) => a + b, 0)} scratch problems held; ${info.length} info notes.`);
