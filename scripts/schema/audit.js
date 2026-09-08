// Read-only consumer of tools-core's carbon-class CLI. This does not import or
// execute runtime classes, emit stubs, refresh schemas, or rebuild npm output.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

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

/** Run strict class checks and return raw findings with independent AST inventory. */
export async function collectReport(options = {})
{
    const runtimeRoot = path.resolve(options.runtimeRoot || process.env.CARBON_SCHEMA_RUNTIME_ROOT || packageRoot);
    const toolsRoot = path.resolve(options.toolsRoot || process.env.CARBON_SCHEMA_TOOLS_ROOT || path.join(runtimeRoot, "../tools-core"));
    const schemaRoot = path.resolve(options.schemaRoot || process.env.CARBON_SCHEMA_ROOT || path.join(toolsRoot, ".scratch/schema-build"));
    const carbonRoot = path.resolve(options.carbonRoot || process.env.CARBON_ROOT || process.env.CARBONENGINE_ROOT || path.join(runtimeRoot, "../../carbonengine"));
    const startedAt = new Date().toISOString();
    if (absentDirectory(schemaRoot)) return { status: "SKIP", reason: `Entire schema tree absent: ${schemaRoot}` };
    const schemaFiles = walk(schemaRoot, ".json");
    const schemaHash = digest(schemaRoot, schemaFiles);
    const schema = inspectSchemaTree(schemaRoot);
    if (absentDirectory(carbonRoot)) return { status: "SKIP", reason: `Carbon checkout absent: ${carbonRoot}` };
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
