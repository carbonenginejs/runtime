// Guards the rule in `.agents/rules.md`: required organization-owned methods are
// called DIRECTLY, never hidden behind `?.`.
//
// WHY THIS SCRIPT EXISTS. The rule was written down and kept coming back anyway.
// Every other hard rule in this repository has a checker - layering, source
// style, docs, retired vocabulary - and every one of those stays fixed. This one
// only held while somebody remembered it, and by 2026-09-05 there were 1699
// sites across 209 files.
//
// WHAT IT CATCHES, AND THE DISTINCTION THAT MATTERS. Only the METHOD hedge:
// `thing.DoWork?.( ... )`, which says "call this if the method happens to
// exist". PascalCase is this runtime's instance-method convention, so a
// PascalCase name is a method on a class we own, and a class we own either has
// the method or is the thing to fix. camelCase is left alone: those are
// caller-supplied callbacks and host-object probes, which the rule permits.
//
// `thing?.DoWork()` IS NOT COUNTED, and the first version of this script got
// that wrong. A nullable OBJECT is an ordinary fact - a list can hold a null, a
// reference can be unresolved - and guarding it says nothing about whether the
// method exists. The rule is about hiding a missing IMPLEMENTATION. Counting the
// receiver guard also made the checker useless for measuring progress: turning
// `thing?.DoWork?.()` into `thing?.DoWork()` is exactly the fix, and the count
// did not move.
//
// `thing?.property` is untouched for the same reason.
//
// HOW THE BASELINE WORKS. Rewriting 1699 sites at once would be sixteen hundred
// judgement calls made in a hurry, and removing a `?.` that was load-bearing
// turns a silent skip into a crash. So the existing sites are frozen per file
// and the check fails only when a file goes UP. Burn a file down and re-record
// the lower number: the baseline is a ratchet, not a permission slip.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const baselineFile = path.join(root, "scripts", "optional-call-baseline.json");

/** `thing.DoWork?.(` - the method itself hedged, whatever the receiver. */
const OPTIONAL_OWNED_CALL = /\.[A-Z][A-Za-z0-9_]*\?\.\(/gu;

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//gu;
const LINE_COMMENT = /^[ \t]*\/\/.*$/gmu;

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

function slash(value)
{
    return value.replaceAll(path.sep, "/");
}

// Comments describe the mistake as often as they commit it - this very file does
// - so they are blanked before counting. String literals are NOT blanked:
// stripping them correctly needs an escape-aware scanner, and a PascalCase
// optional call inside a string literal is not something this codebase does.
function withoutComments(source)
{
    return source.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "");
}

const counts = {};

for (const file of await sourceFiles(sourceRoot))
{
    const relativeFile = slash(path.relative(root, file));
    const code = withoutComments(await fs.readFile(file, "utf8"));
    const found = code.match(OPTIONAL_OWNED_CALL)?.length ?? 0;

    if (found) counts[relativeFile] = found;
}

if (process.argv.includes("--write"))
{
    await fs.writeFile(baselineFile, `${JSON.stringify(counts, null, 2)}\n`);
    console.log(`optional-call baseline written: ${Object.keys(counts).length} files`);
    process.exit(0);
}

const baseline = JSON.parse(await fs.readFile(baselineFile, "utf8"));
const problems = [];

for (const [ file, found ] of Object.entries(counts))
{
    const allowed = baseline[file] ?? 0;

    if (found > allowed)
    {
        problems.push(
            `${file}: ${found} optional calls to owned methods, baseline ${allowed}. `
            + "Call the method directly; if it can be missing, fix the class."
        );
    }
}

if (problems.length)
{
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} file(s) went up. Nothing here is a new exception to grant.`);
    process.exit(1);
}

const total = Object.values(counts).reduce((sum, found) => sum + found, 0);

console.log(`Optional owned-method calls: ${total} in ${Object.keys(counts).length} files, none above baseline.`);

// A file that improved and was not re-recorded is not an error, but it is how
// the baseline rots back upwards, so it is said out loud.
const improved = Object.entries(baseline).filter(([ file, allowed ]) => (counts[file] ?? 0) < allowed);

if (improved.length)
{
    console.log(`${improved.length} file(s) are below baseline - re-record with --write to lock the gain in.`);
}
