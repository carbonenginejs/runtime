#!/usr/bin/env node
// Implementation markers are JSDoc tags (decorator-upgrade.md § 00, operator 2026-10-30). This lint knows the complete
// set, so a misspelt marker fails instead of passing as an unknown tag that every reader ignores:
//
//   @implemented, @adapted, @noop, @notSupported, @renamed, @cjs, @abstract, @notImplemented, @notUsed
//
// It fails on a tag that is not in the set but is within two edits of one, or equal to one ignoring case
// (`@implmented`, `@Adapted`, `@not_supported`), and on `@renamed` without the Carbon name it stands for. It reports,
// without failing, `@adapted` and `@notSupported` tags that carry no reason on their line: the reason belongs there,
// and the count may only shrink once the markers have moved.
//
// Usage: node scripts/lint-marker-tags.js [--list]
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MARKER_TAGS } from "./lib/decorator-target-inventory.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const list = process.argv.includes("--list");
const KNOWN = new Set(MARKER_TAGS);
const FOLDED = new Map(MARKER_TAGS.map(tag => [ Fold(tag), tag ]));
const NEEDS_REASON = new Set([ "adapted", "notSupported" ]);

/** Lower case without separators, so `@not_supported` and `@NotSupported` meet `notSupported`. */
function Fold(tag)
{
  return tag.toLowerCase().replace(/[-_]/g, "");
}

/** Levenshtein distance, bounded: stops counting past `limit`. */
function Distance(a, b, limit)
{
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++)
  {
    const current = [ i ];
    let best = i;
    for (let j = 1; j <= b.length; j++)
    {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (current[j] < best) best = current[j];
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

/** The marker a near-miss tag was meant to be, or null. */
function MeantMarker(tag)
{
  const folded = FOLDED.get(Fold(tag));
  if (folded) return folded;
  // Short tags (@see, @type) are too close to everything to judge; markers are all six letters or more.
  if (tag.length < 5) return null;
  for (const marker of MARKER_TAGS) if (Distance(tag.toLowerCase(), marker.toLowerCase(), 2) <= 2) return marker;
  return null;
}

/** Every `.js` file under `dir`. */
async function SourceFiles(dir)
{
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true }))
  {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await SourceFiles(full));
    else if (entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

const errors = [];
const unreasoned = [];
for (const file of (await SourceFiles(path.join(root, "src"))).sort())
{
  const text = await readFile(file, "utf8");
  const relative = path.relative(root, file).replaceAll("\\", "/");
  for (const block of text.matchAll(/\/\*\*[\s\S]*?\*\//g))
  {
    const blockLine = text.slice(0, block.index).split("\n").length;
    const lines = block[0].split("\n");
    for (let i = 0; i < lines.length; i++)
    {
      const match = /^\s*(?:\/\*\*|\*)?\s*@([A-Za-z_][\w-]*)\b[ \t]*(.*?)\s*(?:\*\/)?$/.exec(lines[i]);
      if (!match) continue;
      const [ , tag, rest ] = match;
      const where = `${relative}:${blockLine + i}`;
      if (KNOWN.has(tag))
      {
        if (tag === "renamed" && !/^[A-Za-z_$][\w$]*/.test(rest)) errors.push(`${where}: @renamed needs the Carbon name it stands for, then the reason.`);
        if (NEEDS_REASON.has(tag) && !rest) unreasoned.push(`${where}: @${tag} has no reason on its line.`);
        continue;
      }
      const meant = MeantMarker(tag);
      if (meant) errors.push(`${where}: @${tag} is not a marker tag; did you mean @${meant}?`);
    }
  }
}

if (list) for (const line of unreasoned) console.log(line);
console.log(`Marker tags: ${errors.length} error(s); ${unreasoned.length} @adapted/@notSupported tag(s) without a reason on the line (reported, not failed).`);
for (const line of errors) console.error(line);
process.exitCode = errors.length ? 1 : 0;
