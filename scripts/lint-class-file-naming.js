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
// THE SECOND RULE: ONE CLASS PER FILE. Six files were first accepted permanently
// on the grounds that each mirrored one Carbon header declaring several small
// types together - the HAL structures, the render-pass attachments, the
// resource-set trio, the query stubs, the audio action records, the error pair.
// The operator overruled that: we do not put multiple classes in one file, and
// mirroring a donor header is not a reason to. So there are NO permanent
// exemptions here, and those six now carry two faults rather than a licence.
//
// 50 files declare more than one class. The heaviest cases are not the big ones -
// they are families of tiny types, like `EveSOFDataParameter.js` with a base and
// six twelve-line subclasses, and the `ErrSOF*` errors declared beside the class
// that throws them. Splitting those buys a reader one predictable place to look
// for a name, which is the whole point of both rules.
//
// TWO FROZEN BASELINES, BECAUSE 95 SITES CANNOT BE FIXED IN ONE PASS. Each list
// records what already exists so this fails on anything NEW. Both may only
// shrink: a file that gets fixed and left in a list FAILS, so neither can rot
// back upwards.

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
const knownMisnamed = new Set(Object.keys(baseline.misnamed ?? {}));
const knownMultiple = new Set(Object.keys(baseline.multipleClasses ?? {}));
const misnamed = new Map();
const multiple = new Map();

for (const file of await sourceFiles(sourceRoot))
{
    const relative = slash(path.relative(packageRoot, file));
    const { classes, functions } = declarations(await readFile(file, "utf8"));

    if (!classes.length) continue;

    const base = path.basename(file, ".js");
    const names = classes.map(entry => entry.name);

    if (classes.length > 1) multiple.set(relative, names);

    if (!names.includes(base))
    {
        misnamed.set(relative, {
            classes: names,
            functions: functions.length,
            // A filename differing from its class only by case is the sharpest
            // form of this fault: every reader believes the file is named
            // correctly, and a case-insensitive filesystem never contradicts
            // them.
            caseOnly: names.some(name => name.toLowerCase() === base.toLowerCase())
        });
    }
}

if (write)
{
    const record = entries => Object.fromEntries(
        [ ...entries ].sort((a, b) => a[0].localeCompare(b[0]))
            .map(([ file, detail ]) => [ file, Array.isArray(detail) ? detail : detail.classes ])
    );

    await writeFile(
        baselinePath,
        `${JSON.stringify({ misnamed: record(misnamed), multipleClasses: record(multiple) }, null, 2)}\n`,
        "utf8"
    );
    console.log(`Recorded ${misnamed.size} misnamed and ${multiple.size} multi-class file(s).`);
    process.exit(0);
}

const problems = [];

for (const [ file, detail ] of [ ...misnamed ].sort((a, b) => a[0].localeCompare(b[0])))
{
    if (knownMisnamed.has(file)) continue;

    const hint = detail.caseOnly
        ? "The names differ only by CASE, which no reader will see."
        : detail.functions > 0
            ? `${detail.functions} free function(s) sit beside it; shared ones belong on the class as statics.`
            : "Rename the file after the class, or move the class to the file that owns its name.";

    problems.push(`${file}: declares ${detail.classes.join(", ")} and is named after none of them. ${hint}`);
}

for (const [ file, names ] of [ ...multiple ].sort((a, b) => a[0].localeCompare(b[0])))
{
    if (knownMultiple.has(file)) continue;

    problems.push(
        `${file}: declares ${names.length} classes (${names.join(", ")}). `
        + "One class per file, so each is findable by its own name."
    );
}

if (problems.length)
{
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} new violation(s). Neither list is an exception to grant.`);
    process.exit(1);
}

// A file that was fixed and left in a list is how a baseline rots back upwards,
// so it is named rather than quietly tolerated.
const stale = [
    ...[ ...knownMisnamed ].filter(file => !misnamed.has(file)),
    ...[ ...knownMultiple ].filter(file => !multiple.has(file))
];

if (stale.length)
{
    console.error(`These files no longer violate and must be removed from the baseline:\n  ${[ ...new Set(stale) ].join("\n  ")}`);
    console.error("\nRun with --write to re-record, which locks the gain in.");
    process.exit(1);
}

console.log(`Class/file naming: ${misnamed.size} misnamed and ${multiple.size} multi-class file(s) recorded, none new.`);
