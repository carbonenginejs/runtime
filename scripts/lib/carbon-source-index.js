import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { headerTypes, jsClasses } from "./carbon-header-shape.js";

/** Enumerate source files, keeping generated classes but excluding dropped code. */
export async function filesUnder(directory, extensions)
{
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true }))
    {
        if ([ ".git", "node_modules", "dropped", "npm", "dist" ].includes(entry.name)) continue;
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) for (const file of await filesUnder(target, extensions)) files.push(file);
        else if (entry.isFile() && extensions.includes(path.extname(entry.name))) files.push(target);
    }
    return files.sort();
}

/** Index cited headers against the live donor; ambiguous paths remain findings. */
export async function sourceIndex(packageRoot, carbonRoot)
{
    const headers = await filesUnder(carbonRoot, [ ".h", ".hpp" ]);
    const relativeHeaders = new Map(headers.map(file => [ path.relative(carbonRoot, file).replaceAll("\\", "/"), file ]));
    const byBase = new Map();
    for (const [ relative, file ] of relativeHeaders)
    {
        const base = path.posix.basename(relative);
        if (!byBase.has(base)) byBase.set(base, []);
        byBase.get(base).push([ relative, file ]);
    }
    const classes = new Map();
    const cited = new Set();
    const problems = new Map();
    const sources = new Map();
    for (const file of await filesUnder(path.join(packageRoot, "src"), [ ".js" ]))
    {
        const relative = path.relative(packageRoot, file).replaceAll("\\", "/");
        const source = await readFile(file, "utf8");
        for (const node of jsClasses(source))
        {
            if (!classes.has(node.id.name)) classes.set(node.id.name, []);
            classes.get(node.id.name).push({ file: relative, node });
        }
        // A class may declare the donor it ports under a different name, with
        // `carbon:` in its type.define / CjsSchema.define. That declaration is
        // the author's, and it is the only thing tying a deliberately renamed
        // port back to its donor - CjsScriptCallback to BlueScriptCallback, or
        // every Tr2*ALStub to the one Tr2*AL name Carbon gives all backends.
        // Without it a renamed port reads here as a missing one.
        for (const [ , donor ] of source.matchAll(/\bcarbon:\s*"(\w+)"/g))
        {
            if (!classes.has(donor)) classes.set(donor, []);
            classes.get(donor).push({ file: relative, node: null, declared: true });
        }
        if (relative.split("/").includes("generated")) continue;
        const head = source.match(/^(?:\s*\/\/[^\n]*(?:\n|$))+/)?.[0] ?? "";
        if (!head.includes("Source:")) continue;
        for (const match of head.matchAll(/(?:Source:\s*|^\/\/\s+)([\w./\\-]+\.h(?:pp)?)(?=[\s:+(),]|$)/gm))
        {
            const citation = match[1].replaceAll("\\", "/");
            let target = relativeHeaders.has(citation) ? citation : null;
            if (!target)
            {
                const candidates = byBase.get(path.posix.basename(citation)) ?? [];
                // Historical shortened provenance is accepted only if unambiguous.
                if (candidates.length === 1) target = candidates[0][0];
                else problems.set(`citation:${citation}`, `${relative}: ${candidates.length ? "ambiguous" : "unresolved"} donor header ${citation}`);
            }
            if (target) cited.add(target);
        }
    }
    for (const relative of cited)
    {
        const source = await readFile(relativeHeaders.get(relative), "utf8");
        sources.set(relative, { source, types: headerTypes(source) });
    }
    return { classes, sources, problems };
}

/** Ratchet known findings: new and stale entries both fail. */
export async function baselineProblems(findings, baselinePath, write)
{
    const { writeFile } = await import("node:fs/promises");
    if (write)
    {
        await writeFile(baselinePath, JSON.stringify(Object.fromEntries([ ...findings ].sort()), null, 2) + "\n");
        console.log(`Recorded ${findings.size} existing findings in ${path.basename(baselinePath)}.`);
        return true;
    }
    const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
    const fresh = [ ...findings ].filter(([ key ]) => !Object.hasOwn(baseline, key));
    const stale = Object.keys(baseline).filter(key => !findings.has(key));
    for (const [ key, detail ] of fresh) console.error(`${key}: ${detail}`);
    for (const key of stale) console.error(`Stale baseline entry: ${key}`);
    if (fresh.length || stale.length) console.error("Review new findings; remove resolved entries with --write.");
    return !fresh.length && !stale.length;
}
