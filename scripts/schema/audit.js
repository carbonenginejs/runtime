// Read-only consumer of tools-core's carbon-class CLI. This does not import or
// execute runtime classes, emit stubs, refresh schemas, or rebuild npm output.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SNAPSHOT } from "./pack.js";

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const slash = value => value.replaceAll("\\", "/");

function readJson(file)
{
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function absentDirectory(directory)
{
    try
    {
        if (!fs.statSync(directory).isDirectory()) throw new Error(`Not a directory: ${directory}`);
        return false;
    }
    catch (error)
    {
        if (error.code === "ENOENT") return true;
        throw error;
    }
}

function childPath(root, name)
{
    const target = path.resolve(root, name);
    const relative = path.relative(root, target);
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) throw new Error(`Schema index path leaves its directory: ${name}`);
    return target;
}

function walk(root, suffix)
{
    const files = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true }))
    {
        const file = path.join(root, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Linked input requires review: ${file}`);
        if (entry.isDirectory())
        {
            for (const child of walk(file, suffix)) files.push(child);
        }
        else if (entry.isFile() && file.endsWith(suffix)) files.push(file);
    }
    return files.sort();
}

function digest(root, files)
{
    const hash = createHash("sha256");
    for (const file of files)
    {
        hash.update(slash(path.relative(root, file)));
        hash.update("\0");
        hash.update(fs.readFileSync(file));
        hash.update("\0");
    }
    return hash.digest("hex");
}

/** Validate the complete indexed tree, including documents no runtime class uses. */
export function inspectSchemaTree(schemaRoot)
{
    const index = readJson(path.join(schemaRoot, "index.json"));
    if (index.schemaVersion !== 1 || !Array.isArray(index.families) || !index.families.length) throw new Error("Invalid or empty schema root index");
    const classes = [];
    const coverage = [];
    const families = new Set();
    for (const family of index.families)
    {
        if (typeof family.name !== "string" || families.has(family.name)) throw new Error("Invalid or duplicate schema family");
        families.add(family.name);
        const familyRoot = childPath(schemaRoot, family.name);
        const familyIndex = readJson(childPath(schemaRoot, family.index));
        if (familyIndex.schemaVersion !== 1 || familyIndex.family !== family.name || !Array.isArray(familyIndex.classes) || family.classes !== familyIndex.classes.length) throw new Error(`Inconsistent schema family index: ${family.name}`);
        if (family.name !== "trinityal") coverage.push(`family:${family.name}`);
        const files = new Set();
        for (const item of familyIndex.classes)
        {
            if (files.has(item.jsonFile)) throw new Error(`Duplicate schema document: ${family.name}/${item.jsonFile}`);
            files.add(item.jsonFile);
            const doc = readJson(childPath(familyRoot, item.jsonFile));
            if (doc.schemaVersion !== 1 || doc.family !== family.name || doc.blueClass !== item.blueClass || doc.cppClass !== item.cppClass) throw new Error(`Schema document disagrees with index: ${family.name}/${item.jsonFile}`);
            const schemaPath = `${family.name}/${item.jsonFile}`;
            classes.push({ family: family.name, blueClass: item.blueClass, cppClass: item.cppClass, schemaPath });
            if (family.name !== "trinityal") coverage.push(JSON.stringify([family.name, item.cppClass, item.blueClass, item.jsonFile]));
        }
    }
    // An enum file participates in field derivation even if no class uses it today.
    const enums = readJson(path.join(schemaRoot, "enums.json"));
    if (enums.schemaVersion !== 1 || !Array.isArray(enums.enums) || enums.enums.length !== index.enums) throw new Error("Invalid or incomplete schema enum document");
    for (const item of enums.enums)
    {
        if (typeof item.name !== "string" || !Array.isArray(item.values)) throw new Error("Invalid schema enum entry");
        if (item.family !== "trinityal")
        {
            coverage.push(JSON.stringify(["enum", item.family, item.qualifiedName || item.name]));
            for (const value of item.values) coverage.push(JSON.stringify(["enum-value", item.family, item.qualifiedName || item.name, value.name]));
        }
    }
    return { index, classes, coverage: coverage.sort() };
}

/** How stale a packed schema may be before the gate refuses it. */
const MAX_SNAPSHOT_AGE_DAYS = 7;


/**
 * Unpacks `scripts/carbon_schema_latest.gzip` and returns the tree root.
 *
 * MISSING FAILS AND OLD FAILS - neither skips. The file is committed, so its
 * absence means something removed it, and a stale schema means the gate is
 * checking against a Carbon that has moved on. A skip in either case is a green
 * build that proved nothing, which is the failure this gate was landed to end.
 *
 * Age comes from the recorded `packedAt`, not the file's mtime: a checkout
 * stamps every file with the checkout time, so mtime would report a year-old
 * snapshot as fresh.
 *
 * @returns {string} Directory holding the unpacked tree.
 */
function unpackSnapshot()
{
    if (!fs.existsSync(SNAPSHOT))
    {
        throw new Error(`Schema snapshot missing: ${SNAPSHOT}. `
            + "Regenerate the tree in tools-core and run scripts/schema/pack.js <tree>.");
    }

    const payload = JSON.parse(zlib.gunzipSync(fs.readFileSync(SNAPSHOT)).toString("utf8"));
    const ageDays = (Date.now() - Date.parse(payload.packedAt)) / 86400000;

    if (!(ageDays <= MAX_SNAPSHOT_AGE_DAYS))
    {
        throw new Error(`Schema snapshot is ${ageDays.toFixed(1)} days old `
            + `(limit ${MAX_SNAPSHOT_AGE_DAYS}, packed ${payload.packedAt}). `
            + "Regenerate the tree in tools-core and run scripts/schema/pack.js <tree>.");
    }

    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cjs-schema-"));
    for (const [ relative, document ] of Object.entries(payload.documents))
    {
        const file = path.join(root, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(document));
    }

    return root;
}


/**
 * Where the checker lives, WITHOUT reaching into a sibling directory.
 *
 * An installed dependency, found through node's own resolution. Nothing else.
 * If it is not installed the caller skips - it does not guess a relative path
 * and quietly succeed on one machine.
 *
 * @param {object} options Caller overrides.
 * @param {string} runtimeRoot This package's root.
 * @returns {string|null} The tools root, or null when unresolvable.
 */
function resolveToolsRoot(options, runtimeRoot)
{
    // `options.toolsRoot` is for TESTS, which pass a fixture inside their own
    // temporary directory. There is deliberately no environment variable: an
    // env var pointing at a sibling checkout is the same reach with extra
    // steps, and it is the reach that made this gate work on one machine and
    // silently skip everywhere else.
    if (options.toolsRoot) return path.resolve(options.toolsRoot);

    try
    {
        const require_ = createRequire(path.join(runtimeRoot, "package.json"));
        return path.dirname(require_.resolve("@carbonenginejs/tools-core/package.json"));
    }
    catch
    {
        return null;
    }
}


/** Run strict class checks and return raw findings with independent AST inventory. */
export async function collectReport(options = {})
{
    const runtimeRoot = path.resolve(options.runtimeRoot || process.env.CARBON_SCHEMA_RUNTIME_ROOT || packageRoot);
    // NO CROSS-DIRECTORY DEFAULTS. A package must not reach into a sibling by
    // relative path. The landed version defaulted to `../tools-core` and
    // `../../carbonengine`, which works only on a machine with the whole
    // organization checked out side by side and silently does nothing
    // everywhere else. The checker is resolved as a DEPENDENCY, or configured
    // explicitly, or this skips and says which.
    const toolsRoot = resolveToolsRoot(options, runtimeRoot);
    // The schema comes from ONE FILE IN THIS DIRECTORY - no sibling reach, no
    // environment variable, no configuration. `options.schemaRoot` remains for
    // tests, which point at a fixture inside their own temporary directory.
    const configuredSchema = options.schemaRoot;
    const schemaRoot = configuredSchema ? path.resolve(configuredSchema) : unpackSnapshot();
    const carbonRoot = options.carbonRoot || process.env.CARBON_ROOT || process.env.CARBONENGINE_ROOT || null;
    const startedAt = new Date().toISOString();
    // ORDER MATTERS. The schema tree is validated BEFORE the checker is
    // required, because "the tree is corrupt" must fail even on a machine that
    // would otherwise skip for want of the checker. Checking for the checker
    // first turned a corrupt tree into a silent skip, which is exactly the
    // "does not silently accept a broken existing tree" rule this gate carries.
    if (!schemaRoot) return { status: "SKIP", reason: "No schema tree configured: set CARBON_SCHEMA_ROOT" };
    if (absentDirectory(schemaRoot)) return { status: "SKIP", reason: `Entire schema tree absent: ${schemaRoot}` };
    const schemaFiles = walk(schemaRoot, ".json");
    const schemaHash = digest(schemaRoot, schemaFiles);
    const schema = inspectSchemaTree(schemaRoot);
    if (!toolsRoot) return { status: "SKIP", reason: "Checker unresolvable: add @carbonenginejs/tools-core as a dependency" };
    if (carbonRoot && absentDirectory(path.resolve(carbonRoot))) return { status: "SKIP", reason: `Carbon checkout absent: ${carbonRoot}` };
    const checker = path.join(toolsRoot, "bin/cjs-carbon-class.js");
    fs.accessSync(checker, fs.constants.R_OK);
    // Resolve the declared development dependency only after optional prerequisites.
    const { parse } = options.parser || createRequire(path.join(runtimeRoot, "package.json"))("@babel/parser");
    const { deriveExpectedFields } = await import(pathToFileURL(path.join(toolsRoot, "src/schema/core/classTool.js")).href);
    const srcRoot = path.join(runtimeRoot, "src");
    const sourceFiles = () => walk(srcRoot, ".js").filter(file => !slash(path.relative(srcRoot, file)).startsWith("trinityal/"));
    const checkerFiles = () => [checker].concat(walk(path.join(toolsRoot, "src/schema"), ".js"));
    const inputFiles = sourceFiles();
    const before = { runtime: digest(runtimeRoot, inputFiles), schema: schemaHash, checker: digest(toolsRoot, checkerFiles()) };
    const inventory = [];
    const classInventory = [];
    const candidates = [];
    for (const file of inputFiles)
    {
        const filePath = slash(path.relative(runtimeRoot, file));
        const local = slash(path.relative(srcRoot, file));
        const state = local.includes("/dropped/") ? "dropped" : local.includes("/generated/") ? "generated" : "maintained";
        const ast = parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["decorators"] });
        const declarations = [];
        for (const statement of ast.program.body)
        {
            const node = statement.declaration || statement;
            if (node.type !== "ClassDeclaration") continue;
            let identity = node.id?.name || "<anonymous>";
            for (const decorator of node.decorators || [])
            {
                const expression = decorator.expression;
                if (expression.callee?.object?.name !== "type" || expression.callee?.property?.name !== "define") continue;
                const arg = expression.arguments[0];
                if (arg?.type === "StringLiteral") identity = arg.value;
                if (arg?.type === "ObjectExpression")
                {
                    const prop = arg.properties.find(item => item.key?.name === "className");
                    if (prop?.value?.type === "StringLiteral") identity = prop.value.value;
                }
            }
            const schemaMatches = schema.classes.filter(item => item.blueClass === identity || item.cppClass === identity);
            const nestedCandidates = schemaMatches.length ? [] : schema.classes.filter(item => item.cppClass?.includes(".") && item.cppClass.replaceAll(".", "") === identity);
            const item = { filePath, state, domain: local.split("/")[0], declaration: node.id?.name || null, class: identity, base: node.superClass?.name || null, exported: statement.type.startsWith("Export"), line: node.loc.start.line, schemaMatches, nestedCandidates };
            declarations.push(item);
            classInventory.push(item);
        }
        const selected = declarations.find(item => item.exported);
        inventory.push({ filePath, state, class: selected?.class || null });
        // Send anonymous exported classes too: the checker's unsupported syntax
        // must produce an explicit failure rather than disappear from inventory.
        if (selected) candidates.push(file);
    }
    if (!candidates.length) throw new Error("Zero class candidates; refusing empty audit");
    const reports = [];
    const batches = [];
    for (let offset = 0; offset < candidates.length; offset += 20)
    {
        const batch = candidates.slice(offset, offset + 20);
        const args = [checker, "--check", ...batch, "--schema-root", schemaRoot, "--strict", "--json"];
        const result = spawnSync(process.execPath, args, { cwd: toolsRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 120000 });
        if (result.error || result.signal || ![0, 1, 2, 3, 4].includes(result.status)) throw new Error(`Checker process failed: ${result.error || result.signal || result.stderr}`);
        const payload = JSON.parse(result.stdout);
        const rows = Array.isArray(payload) ? payload : [payload];
        if (rows.length !== batch.length) throw new Error("Checker returned the wrong number of reports");
        for (let index = 0; index < rows.length; index++)
        {
            const row = rows[index];
            if (path.resolve(toolsRoot, row.filePath) !== batch[index]) throw new Error("Checker report path mismatch");
            row.filePath = slash(path.relative(runtimeRoot, batch[index]));
            if (!row.error && typeof row.schemaPath !== "string") throw new Error(`Missing schema path for ${row.filePath}`);
            if (row.schemaPath)
            {
                row.schemaPath = slash(path.relative(schemaRoot, row.schemaPath));
                const selected = classInventory.find(item => item.filePath === row.filePath && item.exported);
                if (!row.error && selected?.class === row.class && selected.state !== "dropped" && row.family !== "trinityal")
                {
                    const expected = deriveExpectedFields(readJson(childPath(schemaRoot, row.schemaPath)), {
                        schemaRoot, family: row.family, includeInherited: selected.base === "CjsModel"
                    });
                    if (Boolean(expected.fallback) !== Boolean(row.fallback)) throw new Error(`Checker fallback disagrees with schema derivation: ${row.class}`);
                    for (const group of ["fields", "methods"])
                    {
                        if (!Array.isArray(row[group])) throw new Error(`Missing ${group} report for ${row.filePath}`);
                        const observed = new Set(row[group].filter(item => item.expected).map(item => item.name));
                        for (const member of expected[group])
                        {
                            if (!observed.has(member.name)) throw new Error(`Checker omitted expected ${group} member ${row.class}.${member.name}`);
                        }
                        const derived = new Set(expected[group].map(member => member.name));
                        for (const name of observed)
                        {
                            if (name !== "<class>" && !derived.has(name)) throw new Error(`Checker invented expected ${group} member ${row.class}.${name}`);
                        }
                    }
                }
            }
            reports.push(row);
        }
        batches.push({ offset, count: batch.length, exitCode: result.status, stderr: result.stderr });
    }
    const after = { runtime: digest(runtimeRoot, sourceFiles()), schema: digest(schemaRoot, walk(schemaRoot, ".json")), checker: digest(toolsRoot, checkerFiles()) };
    return {
        status: JSON.stringify(before) === JSON.stringify(after) ? "COMPLETE" : "INPUTS_CHANGED",
        startedAt, finishedAt: new Date().toISOString(),
        provenance: { runtimeRoot, toolsRoot, schemaRoot, carbonRoot, node: process.version, schemaGeneratedAt: schema.index.generatedAt, before, after },
        inventory, classInventory, schemaCoverage: schema.coverage, reports, batches
    };
}
