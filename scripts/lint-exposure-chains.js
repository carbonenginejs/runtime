// Exposure chains: every registered class that extends another registered class
// declares the class its exposure chains to, and a Carbon class chains where
// Carbon's does.
//
// WHY. Readers, writers, the Copier, getValues/setValues and the graph compile
// walk the exposure chain, as Carbon's FindEntry, writer and Copier walk
// ClassInfo::mParentClassInfo. Nothing walks `extends` for exposure. A class
// with no chain of its own answers with its nearest ancestor's
// (`exposureChainTo`), so a missing declaration skips a level silently: the
// rows of the class it extends stop being read.
//
// WHAT FAILS, per registered class with a registered JS ancestor:
// - ours (meta.define): no chain of its own, or a chain to anything but the
//   registered class it extends;
// - an unexposed Carbon class (meta.carbon) the same way: Carbon gives it no
//   ClassInfo, so there is no Carbon chain to follow;
// - Carbon's (be.define): a chain that differs from the EXPOSURE_CHAINTO, or
//   EXPOSURE_END(), that closes its EXPOSURE_BEGIN in Carbon's sources, or no
//   EXPOSURE_BEGIN for it at all.
// A class with no registered ancestor is a chain root, and an interface has no
// exposure block of its own; neither is checked. The generic
// EXPOSURE_BEGIN_IMP blocks (BlueDict.h, BlueListUtil.h, BlueStructureList.h)
// name no class and are not read. A block a macro writes for its first
// parameter (SOF_PARAM_EXPOSE_TO_BLUE, SOCKET_PARAM_EXPOSE_TO_BLUE) is read at
// each call of that macro. A class retired from Carbon is checked against the
// block in the donor commit its file cites (RETIRED_BLOCKS).
//
// Classes are read from a build of npm/dist, which this needs, and Carbon's
// exposure blocks from CARBON_ROOT, which must be set. There is no baseline:
// every finding fails.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { requireCarbonRoot } from "./lib/carbon-root.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(root, "npm", "dist");

/** Blocks of classes retired from Carbon that we still port, read from the donor commit their files cite. */
const RETIRED_BLOCKS = new Map([
    [ "Tr2InteriorCell", { chainTo: null, at: "trinity 24d033fa~1 Interior/Tr2InteriorCell_Blue.cpp:12" } ],
    [ "Tr2InteriorStatic", { chainTo: null, at: "trinity 24d033fa~1 Interior/Tr2InteriorStatic_Blue.cpp:59" } ],
    [ "Tr2InteriorFlare", { chainTo: null, at: "trinity 71329945~1 Interior/Tr2InteriorFlare_Blue.cpp:10" } ],
    [ "Tr2InteriorFlareData", { chainTo: null, at: "trinity 71329945~1 Interior/Tr2InteriorFlareData_Blue.cpp:9" } ],
    [ "Tr2InteriorParticleObject", { chainTo: null, at: "trinity 71329945~1 Interior/Tr2InteriorParticleObject_Blue.cpp:15" } ],
]);

/**
 * Every file under dir whose name passes the test, skipping the directories named in skip.
 *
 * @param {string} dir Directory to walk.
 * @param {(name: string) => boolean} test File name test.
 * @param {Set<string>} skip Directory names to leave out.
 * @param {string[]} [files=[]] Accumulator.
 * @returns {string[]} Absolute paths, unsorted.
 */
function walk(dir, test, skip, files = [])
{
    for (const entry of readdirSync(dir, { withFileTypes: true }))
    {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (!skip.has(entry.name)) walk(full, test, skip, files); }
        else if (test(entry.name)) files.push(full);
    }
    return files;
}

/**
 * Carbon's exposure blocks, from every .cpp, .h and .inl: each EXPOSURE_BEGIN( Name, ... ) with the chain
 * its closing macro names, EXPOSURE_CHAINTO( Parent ) or EXPOSURE_END() (blueexposure/include/BlueExposureMacros.h:128-138).
 *
 * @param {string} carbonRoot The Carbon checkout.
 * @returns {Map<string, {chainTo: string|null, at: string}>} By class name.
 */
export function readCarbonChains(carbonRoot)
{
    const blocks = new Map();
    const token = /\bEXPOSURE_(BEGIN|CHAINTO|END)\s*\(\s*([A-Za-z_][\w:]*)?/gu;
    const files = walk(carbonRoot, name => /\.(cpp|h|inl)$/u.test(name), new Set([ ".git", "vendor", "node_modules" ]))
        .sort()
        .map(file => ({ at: path.relative(carbonRoot, file).replace(/\\/gu, "/"), text: readFileSync(file, "utf8") }))
        .filter(({ text }) => text.includes("EXPOSURE_"));

    // A macro that writes a whole block for the class its first parameter names
    // (SOF_PARAM_EXPOSE_TO_BLUE, EveSOFData_Blue2.cpp:20-31): its name, with the chain its body closes on.
    const wrappers = new Map();
    const definition = /^[ \t]*#[ \t]*define[ \t]+(\w+)\(\s*(\w+)[^)]*\)((?:.*\\\r?\n)*.*)$/gmu;
    for (const { text } of files)
    {
        for (const [ , macro, parameter, body ] of text.matchAll(definition))
        {
            const tokens = [ ...body.matchAll(token) ];
            if (tokens.length < 2 || tokens[0][1] !== "BEGIN" || tokens[0][2] !== parameter) continue;
            const close = tokens[1];
            if (close[1] !== "BEGIN") wrappers.set(macro, close[1] === "CHAINTO" ? close[2] : null);
        }
    }
    const call = wrappers.size ? new RegExp(`\\b(${[ ...wrappers.keys() ].join("|")})\\s*\\(\\s*([A-Za-z_]\\w*)`, "gu") : null;

    for (const file of files)
    {
        // The macro definitions themselves are not blocks.
        const text = file.text.replace(/^[ \t]*#[ \t]*define\b(?:.*\\\r?\n)*.*$/gmu, "");
        const lineOf = index => text.slice(0, index).split("\n").length;
        let open = null;
        for (const match of text.matchAll(token))
        {
            if (match[1] === "BEGIN") open = { name: match[2], at: `${file.at}:${lineOf(match.index)}` };
            else if (open)
            {
                blocks.set(open.name, { chainTo: match[1] === "CHAINTO" ? match[2] : null, at: open.at });
                open = null;
            }
        }
        if (call) for (const match of text.matchAll(call)) blocks.set(match[2], { chainTo: wrappers.get(match[1]), at: `${file.at}:${lineOf(match.index)}` });
    }
    return blocks;
}

/**
 * The findings for every registered class.
 *
 * @param {Map<string, {chainTo: string|null, at: string}>} carbon Carbon's chains, from readCarbonChains.
 * @returns {Promise<string[]>} One line per finding.
 */
async function check(carbon)
{
    // Every module registers its classes on import; their log output is not this lint's.
    const quiet = [ "warn", "info", "debug", "error" ].map(name => [ name, console[name] ]);
    for (const [ name ] of quiet) console[name] = () => {};
    const failedImports = [];
    for (const file of walk(DIST, name => name.endsWith(".js") && !/worker|\.min\.|bundle/iu.test(name), new Set([ "workers" ])).sort())
    {
        try { await import(pathToFileURL(file).href); }
        catch (error) { failedImports.push(`${path.relative(DIST, file)}: ${String(error.message).split("\n")[0]}`); }
    }
    for (const [ name, fn ] of quiet) console[name] = fn;

    const load = file => import(pathToFileURL(path.join(DIST, file)).href);
    const { CjsSchema } = await load("blue/schema/index.js");
    const { getClassRegistrations } = await load("blue/exposure/classes/registry.js");
    const { exposureChainTo, hasOwnInterfaceTable } = await load("blue/compose/interface.js");

    const findings = failedImports.map(line => `import failed: ${line}`);
    for (const { type } of getClassRegistrations())
    {
        let parent = Object.getPrototypeOf(type);
        while (typeof parent === "function" && parent !== Function.prototype && !CjsSchema.getClassName(parent)) parent = Object.getPrototypeOf(parent);
        if (typeof parent !== "function" || parent === Function.prototype) continue;

        const name = CjsSchema.getClassName(type);
        const schema = CjsSchema.getSchema(type);
        if (schema.interface === true) continue;
        const own = hasOwnInterfaceTable(type) ? exposureChainTo(type) : null;
        const ownName = own ? CjsSchema.getClassName(own) : null;
        if (schema.blue === true)
        {
            const block = carbon.get(name) ?? RETIRED_BLOCKS.get(name);
            if (!block) findings.push(`${name}: a Carbon class with no EXPOSURE_BEGIN in Carbon's sources.`);
            else if (block.chainTo !== ownName)
                findings.push(`${name}: chains to ${ownName ?? "nothing"}; Carbon's ${block.chainTo ? `EXPOSURE_CHAINTO( ${block.chainTo} )` : "EXPOSURE_END()"} at ${block.at}.`);
            continue;
        }
        const parentName = CjsSchema.getClassName(parent);
        const kind = schema.carbon ? " (unexposed Carbon class)" : "";
        if (!own) findings.push(`${name}${kind}: extends ${parentName} and declares no exposure chain.`);
        else if (own !== parent) findings.push(`${name}${kind}: extends ${parentName} but chains to ${ownName}.`);
    }
    return findings.sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
{
    const findings = await check(readCarbonChains(requireCarbonRoot()));
    for (const line of findings) console.error(line);
    console.log(findings.length ? `\n${findings.length} exposure chain finding(s).` : "Every exposure chain matches.");
    process.exit(findings.length ? 1 : 0);
}
