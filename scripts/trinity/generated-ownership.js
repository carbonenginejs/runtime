import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "@babel/parser";

/** Enumerates files deterministically without following directory links. */
async function files(directory, extension)
{
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true }))
  {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory())
    {
      for (const nested of await files(file, extension)) result.push(nested);
    }
    else if (entry.isFile() && entry.name.endsWith(extension)) result.push(file);
  }
  return result.sort();
}

/** Reads a literal metadata property; computed declarations are not inferred. */
function literal(object, name)
{
  const member = object?.properties?.find(item => !item.computed && (item.key?.name ?? item.key?.value) === name);
  return member?.value?.type === "StringLiteral" ? member.value.value : null;
}

/** Reads explicit model identity from Stage-3 declarations or CjsSchema.define. */
function definitions(ast)
{
  const result = new Map();
  for (const statement of ast.program.body)
  {
    const declaration = statement.declaration ?? statement;
    if (declaration.type === "ClassDeclaration")
    {
      for (const decorator of declaration.decorators ?? [])
      {
        const call = decorator.expression;
        if (call.type === "CallExpression" && call.callee?.object?.name === "meta" && call.callee?.property?.name === "define")
          result.set(declaration.id.name, call.arguments[0]);
      }
    }
    const call = statement.expression;
    if (call?.type === "CallExpression" && call.callee?.object?.name === "CjsSchema" && call.callee?.property?.name === "define")
    {
      if (call.arguments[0]?.type === "Identifier") result.set(call.arguments[0].name, call.arguments[1]);
    }
  }
  return result;
}

/**
 * Reads current ownership across every runtime layer. Source paths determine
 * generated/maintained/dropped state, never a stale generator banner or summary.
 * Only registered identities and schema-named classes participate; local helper
 * classes do not become global Carbon identities merely by sharing a JS name.
 */
export async function readGeneratedOwnership({ sourceRoot, schemaRoot })
{
  const schemas = new Map();
  for (const file of await files(schemaRoot, ".json"))
  {
    if (["index.json", "enums.json"].includes(path.basename(file))) continue;
    const doc = JSON.parse(await fs.readFile(file, "utf8"));
    if (!doc.blueClass) continue;
    const entries = schemas.get(doc.blueClass) ?? [];
    entries.push({ family: doc.family, schema: path.relative(schemaRoot, file).split(path.sep).join("/") });
    schemas.set(doc.blueClass, entries);
  }
  const records = new Map();
  for (const file of await files(sourceRoot, ".js"))
  {
    const source = await fs.readFile(file, "utf8");
    const ast = parse(source, { sourceType: "module", plugins: ["decorators", "decoratorAutoAccessors", "importAttributes"] });
    const defined = definitions(ast);
    for (const statement of ast.program.body)
    {
      const declaration = statement.declaration ?? statement;
      if (statement.type === "ExportNamedDeclaration" && declaration.type === "VariableDeclaration")
      {
        for (const variable of declaration.declarations)
        {
          // Family enum barrels contain scoped names such as State. Only a
          // schema-named value's own module claims a replaceable class identity.
          if (variable.id.type !== "Identifier" || !schemas.has(variable.id.name) || path.basename(file, ".js") !== variable.id.name) continue;
          const className = variable.id.name;
          const relative = path.relative(sourceRoot, file).split(path.sep).join("/");
          if (records.has(className)) throw new Error(`Duplicate Carbon identity ${className}: ${records.get(className).file} and ${relative}`);
          records.set(className, { className, file: relative, state: "maintained", layer: relative.split("/")[0], kind: "value" });
        }
        continue;
      }
      if (declaration.type !== "ClassDeclaration" || !declaration.id) continue;
      const metadata = defined.get(declaration.id.name);
      const className = literal(metadata, "className") ?? declaration.id.name;
      if (!metadata && !schemas.has(className)) continue;
      const relative = path.relative(sourceRoot, file).split(path.sep).join("/");
      const parts = relative.split("/");
      const state = parts.includes("dropped") ? "dropped" : parts.includes("generated") ? "generated" : "maintained";
      const record = { className, family: literal(metadata, "family"), file: relative, state, layer: parts[0], kind: "class" };
      const existing = records.get(className);
      if (existing) throw new Error(`Duplicate Carbon identity ${className}: ${existing.file} and ${relative}`);
      records.set(className, record);
    }
  }
  return { schemas, records };
}

/** Builds the live Trinity ownership projection, independently of prior reports. */
export function createOwnershipSummary({ records, schemas }, reservations = [])
{
  const skipped = [];
  const generatedClasses = [];
  let written = 0;
  for (const record of records.values())
  {
    if (record.layer !== "trinity" || record.kind !== "class") continue;
    if (record.state === "generated")
    {
      written++;
      generatedClasses.push({ className: record.className, family: record.family, file: record.file });
      continue;
    }
    const all = schemas.get(record.className) ?? [];
    // JS-only scene helpers have no generated Carbon counterpart to protect.
    if (!all.length) continue;
    const candidates = all.filter(item => !reservations.some(entry => entry.className === record.className && entry.family === item.family));
    if (!candidates.length) continue;
    const exact = candidates.filter(item => item.family === record.family);
    const matching = exact.length ? exact : candidates.filter(item => item.family === record.family?.split("/")[0]);
    // A shared native interface may have separate include and Blue-exposure
    // schema documents. Protect both when source does not select one family.
    const selected = candidates.length === 1 ? candidates : matching.length === 1 ? matching : candidates;
    for (const schema of selected)
      skipped.push({ family: selected.length > 1 ? schema.family : record.family ?? schema.family, className: record.className, reason: "hand-maintained source exists" });
  }
  skipped.sort((a, b) => a.family.localeCompare(b.family) || a.className.localeCompare(b.className));
  generatedClasses.sort((a, b) => a.className.localeCompare(b.className));
  return { outRoot: "src/trinity/generated", classes: { written, skipped: skipped.length }, skipped, generatedClasses };
}

/** Rejects a generated candidate when any runtime layer already owns its identity. */
export function assertGeneratedInstallAllowed(inventory, className, family, reservations = [])
{
  if (!inventory.schemas.has(className)) throw new Error(`No Carbon schema for ${className}`);
  if (!inventory.schemas.get(className).some(entry => entry.family === family))
    throw new Error(`No Carbon schema for ${family}/${className}`);
  const reservation = reservations.find(entry => entry.className === className && entry.family === family);
  if (reservation) throw new Error(`Cannot install ${family}/${className}: ${reservation.reason}`);
  const record = inventory.records.get(className);
  if (record && record.state !== "generated")
    throw new Error(`Cannot install ${className}: ${record.state} source exists at ${record.file}`);
}

/** Retains the upstream generation artifact as provenance, not live ownership. */
export function updateOwnershipSummary(previous, inventory)
{
  const current = createOwnershipSummary(inventory, previous.generation?.skipped ?? []);
  // The public-method ratchet historically audits a promoted-class cohort, not
  // every class ever maintained in the runtime. Preserve every existing subject
  // (including unresolved old identities), then add actual generated-to-maintained
  // transitions. The broader native-method ratchet already scans every class.
  const paritySubjects = (previous.paritySubjects ?? previous.skipped ?? []).map(entry => ({ ...entry }));
  const subjects = new Set(paritySubjects.map(entry => `${entry.family}/${entry.className}`));
  for (const generated of previous.generatedClasses ?? [])
  {
    const record = inventory.records.get(generated.className);
    if (record?.layer !== "trinity" || record.state !== "maintained" || record.kind !== "class") continue;
    for (const entry of current.skipped.filter(item => item.className === generated.className))
    {
      const key = `${entry.family}/${entry.className}`;
      if (!subjects.has(key)) { paritySubjects.push(entry); subjects.add(key); }
    }
  }
  paritySubjects.sort((a, b) => a.family.localeCompare(b.family) || a.className.localeCompare(b.className));
  return { ...previous, ...current, paritySubjects };
}
