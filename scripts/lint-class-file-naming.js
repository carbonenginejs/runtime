// A file that declares a class must be NAMED after one of them.
//
// WHY THIS SCRIPT EXISTS. The operator opened `trinityal/webgpu/core/workQueue.js`
// and said a standalone lowercase file was the wrong shape for what was inside
// it: a 581-line exported class, `CjsWebgpuWorkQueue`, with five free functions
// beside it, in a folder of otherwise small function modules. That was not one
// file's mistake. Surveying `src` found 51 files declaring a class that no
// reader could find by name, and the survey changed what the rule had to be
// twice:
//
// 1. IT IS NOT A PREFIX RULE. The first proposal was that a file must be
//    `index.js` or start with `Cjs`, `Eve` or `Tr2`. 615 files fail that and
//    292 of them declare a class, but most are CORRECT - `AudManager.js`
//    declares `AudManager`, `TriGeometryRes.js` declares `TriGeometryRes`,
//    `TriCurveSet.js` declares `TriCurveSet`. Carbon's own prefixes include
//    `Aud` and `Tri`, and its behaviours - `FollowASpline`, `Formation` - carry
//    no prefix at all. A prefix rule would report 292 files to catch 51.
//
// 2. IT IS NOT AN EXPORT RULE EITHER. The second proposal only counted EXPORTED
//    classes, on the theory that a private helper class is an implementation
//    detail of a function module. `DeflateBitReader` disproves it. It is private
//    to `resource/formats/fbx/core/helpers.js`, a 268-function file, and it is
//    not an FBX detail at all: that file carries a complete private DEFLATE
//    implementation - `inflateZlib`, `inflateDeflate`, `inflateStoredBlock`,
//    `inflateHuffmanBlock`, `DeflateBitReader`, `DeflateHuffmanTable` - which is
//    RFC 1951 with nothing FBX about it. Its own JSDoc says it "reads bits from
//    the current FBX binary reader", and it does neither. It is private by
//    ACCIDENT OF PLACEMENT, which is the fault, not the excuse.
//
// So the rule is the one thing both cases share and no legitimate file breaks:
// if a file declares classes, the filename is one of their names. A function
// module with no class is untouched, which is what keeps `math/vec3.js` and the
// format helper modules out of it.
//
// WHAT THE FIX USUALLY IS. Rename the file after its class, or move the class to
// the file that owns its name. Where free functions are shared and not genuinely
// private, they become STATICS on the class that owns them - Carbon's parent
// where there is one. Seven bit readers are scattered across the format layer
// this way (`BinaryReader`, `BitReader`, `Bc7BitReader`, `DeflateBitReader`,
// `EntropyReader`, `BitWriter`, `PacketReader`), and `src/resource/format` - the
// SHARED format infrastructure, beside `CjsByteReader` - is where that kind of
// primitive already belongs. `CjsByteReader` is byte-level only, so the missing
// sibling is a `CjsBitReader`, not a duplicate of it.
//
// A FROZEN BASELINE, BECAUSE 45 OF THE 51 ARE REAL DEBT. Six files are accepted
// permanently: each mirrors ONE Carbon header that declares several small types
// together, which is Carbon's shape and not a naming accident. The rest are
// recorded so this fails on anything NEW while the existing list is worked down.
// The list may only shrink. Nothing may be added to the accepted set without the
// same justification the six carry.

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(packageRoot, "src");
const baselinePath = path.join(packageRoot, "scripts", "class-file-naming-baseline.json");
const write = process.argv.includes("--write");

function slash(value)
{
    return value.replaceAll(path.sep, "/");
}

async function sourceFiles(directory)
{
    const files = [];

    for (const entry of await readdir(directory, { withFileTypes: true }))
    {
        const target = path.join(directory, entry.name);

        if (entry.isDirectory()) files.push(...await sourceFiles(target));
        else if (entry.isFile() && entry.name.endsWith(".js")) files.push(target);
    }

    return files;
}

/**
 * The classes a module declares at its top level, and the free functions beside
 * them.
 *
 * This parses rather than greps: a class declared inside a function body is not
 * a module's subject, and `export class` has to read the same as `class`.
 *
 * @param {string} source The module text.
 * @returns {{classes: object[], functions: string[]}} What the module declares.
 */
function declarations(source)
{
    const ast = parse(source, {
        sourceType: "module",
        plugins: [ [ "decorators", { version: "2023-11" } ] ]
    });
    const classes = [];
    const functions = [];

    for (const node of ast.program.body)
    {
        const exported = node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration";
        const declaration = exported ? node.declaration : node;

        if (!declaration || !declaration.id) continue;

        if (declaration.type === "ClassDeclaration")
        {
            classes.push({
                name: declaration.id.name,
                exported,
                lines: declaration.loc.end.line - declaration.loc.start.line + 1
            });
        }
        else if (declaration.type === "FunctionDeclaration") functions.push(declaration.id.name);
    }

    return { classes, functions };
}

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const accepted = new Set(Object.keys(baseline.carbonGroupings ?? {}));
const recorded = new Set(Object.keys(baseline.misplaced ?? {}));
const found = new Map();

for (const file of await sourceFiles(sourceRoot))
{
    const relative = slash(path.relative(packageRoot, file));
    const { classes, functions } = declarations(await readFile(file, "utf8"));

    if (!classes.length) continue;

    const base = path.basename(file, ".js");

    if (classes.some(entry => entry.name === base)) continue;

    found.set(relative, {
        classes: classes.map(entry => entry.name),
        functions: functions.length,
        // A filename differing from its class only by case is the sharpest form
        // of this fault: every reader believes the file is named correctly, and
        // on a case-insensitive filesystem nothing ever contradicts them.
        caseOnly: classes.some(entry => entry.name.toLowerCase() === base.toLowerCase())
    });
}

if (write)
{
    const misplaced = {};

    for (const [ file, detail ] of [ ...found ].sort((a, b) => a[0].localeCompare(b[0])))
    {
        if (accepted.has(file)) continue;

        misplaced[file] = detail.classes;
    }

    await writeFile(
        baselinePath,
        `${JSON.stringify({ carbonGroupings: baseline.carbonGroupings ?? {}, misplaced: misplaced }, null, 2)}\n`,
        "utf8"
    );
    console.log(`Recorded ${Object.keys(misplaced).length} misplaced file(s) to ${slash(path.relative(packageRoot, baselinePath))}.`);
    process.exit(0);
}

const problems = [];

for (const [ file, detail ] of [ ...found ].sort((a, b) => a[0].localeCompare(b[0])))
{
    if (accepted.has(file) || recorded.has(file)) continue;

    const classes = detail.classes.join(", ");
    const hint = detail.caseOnly
        ? "The names differ only by CASE, which no reader will see."
        : detail.functions > 0
            ? `${detail.functions} free function(s) sit beside it; shared ones belong on the class as statics.`
            : "Rename the file after the class, or move the class to the file that owns its name.";

    problems.push(`${file}: declares ${classes} and is named after none of them. ${hint}`);
}

if (problems.length)
{
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} new file(s) declare a class no reader can find by name.`);
    process.exit(1);
}

// A file that was fixed and left in the baseline is how the list rots back
// upwards, so it is named rather than quietly tolerated.
const stale = [ ...recorded, ...accepted ].filter(file => !found.has(file));

if (stale.length)
{
    console.error(`These files no longer violate and must be removed from the baseline:\n  ${stale.join("\n  ")}`);
    console.error("\nRun with --write to re-record, which locks the gain in.");
    process.exit(1);
}

const debt = [ ...found ].filter(([ file ]) => !accepted.has(file)).length;

console.log(`Class/file naming: ${found.size} file(s) declare a class they are not named after - ${accepted.size} accepted Carbon groupings, ${debt} recorded, none new.`);
