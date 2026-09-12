// Do our ported enums agree with Carbon's, and does every enum a cited header
// declares have a JavaScript vocabulary at all?
//
// WHY THIS EXISTS. Nothing checked either question. lint-donor-coverage indexes
// only class/struct/BLUE_CLASS/BLUE_INTERFACE, so enums were invisible to it,
// and test/trinity/enum-statics.test.js imports npm/dist/trinity only - it never
// sees global/consts, which is where `docs/standards/enum-placement.md` sends
// vocabulary shared across layers. So the home the standard prefers was the one
// home nothing verified.
//
// A WRONG ENUM VALUE IS SILENT. Carbon writes idioms like `1 << GetType()` over
// these numbers and hands them straight to a backend; a member that is off by
// one, or missing so the ones after it shift, changes behaviour with nothing to
// catch it. Names are checked loosely because our convention varies (Carbon's
// UC_POSITION is our POSITION); VALUES are checked exactly, because they are the
// part that has to be right.
//
// Usage:
//   node scripts/lint-enum-parity.js            check against the baseline
//   node scripts/lint-enum-parity.js --write    re-record the baseline
//   node scripts/lint-enum-parity.js <Name>     look one enum up in both trees
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { headerEnums } from "./lib/carbon-header-shape.js";
import { sourceIndex, filesUnder, baselineProblems } from "./lib/carbon-source-index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const carbonRoot = process.env.CARBON_ROOT ?? "E:/carbonengine";

// A C++ idiom that pads the underlying type to 32 bits. It names no state, and
// JavaScript numbers have no width to force, so it is never ported.
const isPadding = member => member.endsWith("_FORCE_DWORD");

/** Strip comments so a JSDoc block between members cannot hide the member after it. */
function stripComments(source)
{
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** Every frozen numeric vocabulary in one module, as a name -> (member -> value) map. */
function jsVocabularies(source)
{
    const found = new Map();
    const clean = stripComments(source);

    for (const match of clean.matchAll(/(?:export\s+const|static)\s+(\w+)\s*=\s*Object\.freeze\(\{([^}]*)\}\)/g))
    {
        const members = new Map();
        let numeric = true;

        for (const entry of match[2].split(","))
        {
            const text = entry.trim();
            if (!text) continue;
            const pair = text.match(/^["']?(\w+)["']?\s*:\s*(-?(?:0[xX][0-9a-fA-F]+|\d+))$/);
            if (!pair) { numeric = false; continue; }
            members.set(pair[1], Number(pair[2]));
        }
        // A map of strings, or one keyed by computed values, is not an enum port.
        if (members.size && numeric) found.set(match[1], members);
    }
    return found;
}

/** Match a Carbon member to ours, allowing the prefix conventions we use. */
function jsKeyFor(member, jsMembers)
{
    if (jsMembers.has(member)) return member;
    for (const key of jsMembers.keys()) if (member.endsWith(`_${key}`)) return key;
    return null;
}

if (!existsSync(carbonRoot))
{
    console.log("Enum parity SKIPPED: set CARBON_ROOT to the Carbon source checkout.");
}
else
{
    const { sources } = await sourceIndex(root, carbonRoot);

    // JS side, with the headers each file cites, so a bare name like `Status`
    // can be attributed rather than guessed at.
    const vocabularies = new Map();
    for (const file of await filesUnder(path.join(root, "src"), [ ".js" ]))
    {
        const relative = path.relative(root, file).replaceAll("\\", "/");
        const source = await readFile(file, "utf8");
        const head = source.match(/^(?:\s*\/\/[^\n]*(?:\n|$))+/)?.[0] ?? "";

        for (const [ name, members ] of jsVocabularies(source))
        {
            if (!vocabularies.has(name)) vocabularies.set(name, []);
            vocabularies.get(name).push({ file: relative, members, head });
        }
    }

    const lookup = process.argv.slice(2).find(argument => !argument.startsWith("--"));
    if (lookup)
    {
        for (const [ header, { source } ] of sources)
        {
            for (const declared of headerEnums(source))
            {
                if (declared.name !== lookup && `${declared.owner}${declared.name}` !== lookup) continue;
                console.log(`Carbon  ${header}:${declared.line}  ${declared.owner ? declared.owner + "::" : ""}${declared.name}`);
                for (const [ member, value ] of declared.members) console.log(`          ${member} = ${value ?? "?"}`);
            }
        }
        for (const candidate of vocabularies.get(lookup) ?? [])
        {
            console.log(`Ours    ${candidate.file}`);
            for (const [ member, value ] of candidate.members) console.log(`          ${member} = ${value}`);
        }
        if (!vocabularies.has(lookup)) console.log(`Ours    no frozen vocabulary named ${lookup}`);
    }
    else
    {
        const problems = new Map();
        let declaredCount = 0;
        let comparedCount = 0;

        for (const [ header, { source } ] of sources)
        {
            for (const declared of headerEnums(source))
            {
                declaredCount += 1;
                const identity = declared.owner ? `${declared.owner}::${declared.name}` : declared.name;

                // Prefer a vocabulary in a file that cites THIS header; a bare name
                // is not an identity, and Carbon reuses Status, Type, Result and
                // Usage across unrelated classes.
                const named = [
                    ...(vocabularies.get(declared.name) ?? []),
                    ...(declared.owner ? vocabularies.get(`${declared.owner}${declared.name}`) ?? [] : [])
                ];
                // Attribution, not name collision. A vocabulary counts as this enum's
                // port only if its file cites the donor header, or - for a nested
                // enum, now that one class per file is the rule - is named after the
                // owner. Carbon declares Status, Type, Result and Usage inside many
                // unrelated classes, so a bare name proves nothing.
                const cited = named.filter(candidate => candidate.head.includes(path.posix.basename(header)));
                const owned = declared.owner
                    ? named.filter(candidate => path.basename(candidate.file, ".js") === declared.owner)
                    : [];
                const candidates = owned.length ? owned : cited;

                if (!candidates.length)
                {
                    problems.set(`${header}#${identity}`, named.length
                        ? `enum ${identity} (${header}:${declared.line}) has no attributable vocabulary: ${named.length} share its name but none cites this header. Cite the donor in the file that ports it.`
                        : `no JavaScript vocabulary for enum ${identity} (${header}:${declared.line}); port it to its owning class, its family module, or global/consts.`);
                    continue;
                }

                const ours = candidates[0];
                comparedCount += 1;

                for (const [ member, value ] of declared.members)
                {
                    if (isPadding(member) || value === null) continue;
                    const key = jsKeyFor(member, ours.members);

                    if (key === null)
                    {
                        problems.set(`${header}#${identity}.${member}`,
                            `${ours.file}: enum ${identity} is missing Carbon's ${member} = ${value}.`);
                        continue;
                    }
                    // Carbon spells a uint32 sentinel -1; the C++ evaluator resolves it
                    // to 4294967295. Compare unsigned so the two agree.
                    if ((ours.members.get(key) >>> 0) !== (value >>> 0))
                    {
                        problems.set(`${header}#${identity}.${member}`,
                            `${ours.file}: enum ${identity} has ${key} = ${ours.members.get(key)} where Carbon's ${member} = ${value}.`);
                    }
                }
            }
        }

        const passed = await baselineProblems(problems, path.join(root, "scripts/enum-parity-baseline.json"), process.argv.includes("--write"));
        console.log(`Enum parity: ${declaredCount} enums declared by cited headers, ${comparedCount} compared against a JavaScript vocabulary, ${problems.size} recorded findings.`);
        if (!passed) process.exitCode = 1;
    }
}
