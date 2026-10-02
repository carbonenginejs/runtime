import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Reviewed legacy modules have owned exports that ordinary --emit-enums omits.
// This command supplies exact catalog selectors and registration member references
// to tools-core's guarded refresh. All modules validate before any write occurs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let toolsRoot = path.resolve(root, "../tools-core");
let schemaRoot = process.env.CARBON_SCHEMA_ROOT;
let write = false;
for (let i = 2; i < process.argv.length; i++)
{
    const argument = process.argv[i];
    if (argument === "--write") write = true;
    else if (argument === "--check") write = false;
    else if (argument === "--tools-root" || argument === "--schema-root")
    {
        const value = process.argv[++i];
        if (!value || value.startsWith("--")) throw new Error(`${argument} requires a directory`);
        if (argument === "--tools-root") toolsRoot = path.resolve(value);
        else schemaRoot = path.resolve(value);
    }
    else throw new Error(`Unknown argument ${argument}`);
}
schemaRoot = schemaRoot ? path.resolve(schemaRoot) : path.join(toolsRoot, ".scratch/schema-build");
const { refreshEnumRegistrations } = await import(pathToFileURL(path.join(toolsRoot, "src/schema/core/classTool.js")));
const inputs = JSON.parse(await fs.readFile(path.join(root, "scripts/trinity/enum-registration-inputs.json"), "utf8"));
if (inputs.version !== 1 || !Array.isArray(inputs.modules)) throw new Error("Unsupported enum registration inputs");
const catalog = JSON.parse(await fs.readFile(path.join(schemaRoot, "enums.json"), "utf8")).enums;
const outputs = [];
let exportsCount = 0, registrationsCount = 0;
for (const module of inputs.modules)
{
    if (!/^src\/trinity\/generated\/(?:[A-Za-z0-9_-]+\/)+enums\.js$/.test(module.file))
        throw new Error(`Unexpected generated enum path ${module.file}`);
    const records = module.selectors.map(selector =>
    {
        const matches = catalog.filter(entry => entry.name === selector.name
            && entry.qualifiedName === selector.qualifiedName && entry.source === selector.source);
        if (matches.length !== 1) throw new Error(`Expected one catalog identity for ${module.file}: ${selector.qualifiedName}`);
        return matches[0];
    });
    const file = path.join(root, module.file);
    const source = await fs.readFile(file, "utf8");
    const output = refreshEnumRegistrations(source, records, module.registrations);
    if (!write && source !== output) throw new Error(`Enum registration refresh required: ${module.file}`);
    outputs.push({file, output});
    exportsCount += records.length;
    registrationsCount += module.registrations.length;
}
if (write)
{
    for (const {file, output} of outputs) await fs.writeFile(file, output);
}
console.log(`Generated enum registrations ${write ? "refreshed" : "checked"}: ${outputs.length} modules, ${exportsCount} exports, ${registrationsCount} registrations.`);
