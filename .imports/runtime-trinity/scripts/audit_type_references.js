// Fails when a schema field references a type identity that nothing declares.
//
// A decorator argument (@type.model("X"), @type.list("X"), @type.rawStruct("X"))
// is a STRING: nothing verifies at authoring time that X exists. A stale or
// invented name therefore ships silently as a field that can never hydrate -
// EveChildBulletStormInstance and the booster's VertexShaderData/PixelShaderData
// reached runtime-trinity exactly that way, emitted from Carbon schema docs whose
// nested structs the scanner had dropped.
//
// This audit resolves every reference through the live schema registry, so it
// checks what actually matters: whether CjsSchema can produce a constructor for
// the name at runtime.
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";

import * as runtime from "../npm/dist/index.js";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const emitJson = process.argv.includes("--json");

// Field kinds whose type carries a class identity rather than a primitive.
const REFERENCE_KEYS = ["className", "itemType", "keyType", "valueType"];

// Primitive and math kinds share the itemType slot with class names
// (@type.array("vec4")). Carbon identities are always PascalCase and every
// primitive kind token is lower-case, so the initial settles it.
const CLASS_IDENTITY = /^[A-Z]/;

// Carbon interface identities (ITr2Controller, IEveDistributionMethod, ...) are
// duck-typed seams: JS has no class for them by design, so a reference that
// cannot resolve is expected rather than a defect.
const INTERFACE_IDENTITY = /^I[A-Z]/;

// Identities another package owns, or that model a native seam this package
// deliberately does not represent. Each entry is a reviewed waiver with its
// reason; anything not listed here is expected to resolve.
const ALLOWED = new Map([
  ["Tr2EffectRes", "runtime-resource owns decoded resource representations."],
  ["Tr2ImageRes", "runtime-resource owns decoded resource representations."],
  ["Tr2LightProfileRes", "runtime-resource owns decoded resource representations."],
  ["TriGeometryRes", "runtime-resource owns decoded resource representations."],
  ["TriGrannyRes", "runtime-resource owns decoded resource representations."],
  ["TriTextureRes", "runtime-resource owns decoded resource representations."],
  ["Tr2SkinnedObject", "runtime-character owns skinned-object behavior."],
  ["Tr2BufferAL", "An engine package owns live backend handles."],
  ["Tr2ConstantBufferAL", "An engine package owns live backend handles."],
  ["Tr2TextureAL", "An engine package owns live backend handles."],
  ["Tr2TextureAtlasVectorRO", "An engine package owns live backend handles."],
  ["Be::Var", "Blue variable storage; native host type with no portable model."],
  ["Be::VarEntry", "Blue variable storage; native host type with no portable model."],
  ["PyObject", "Python interop handle; no portable model."],
  ["ImageIO::HostBitmap", "Native imageio bitmap; runtime-resource owns decoded pixels."],
  ["Tr2ParallelTaskGroup", "Native task-scheduling primitive replaced by async JS."]
]);

/**
 * Buckets an unresolvable reference by why it fails to resolve.
 *
 * `rawStruct` is the emitter's fallback for a native or unmodelled C++ type
 * (HANDLE, BluePy, CcpParser::Program), and an `I*` identity is a duck-typed
 * interface seam. Neither is expected to have a class. Everything else is a
 * modelled value the schema promises and the runtime cannot deliver.
 *
 * @param {object} reference Unresolved reference record.
 * @returns {string} "opaque-native", "interface-seam", or "missing-model".
 */
function Classify(reference)
{
  if (reference.kind === "rawStruct") return "opaque-native";
  if (INTERFACE_IDENTITY.test(reference.identity)) return "interface-seam";
  return "missing-model";
}

const declared = new Set();
const classes = [];

for (const [exportName, value] of Object.entries(runtime))
{
  if (typeof value !== "function") continue;

  // Every exported class counts as a declared identity, including the plain
  // ones with no schema registration: a native CPU helper such as TriFrustum
  // (not Blue-exposed in Carbon) is a legitimate reference target even though
  // CjsSchema cannot construct it by name.
  declared.add(exportName);

  const className = CjsSchema.getClassName(value);
  if (!className) continue;

  declared.add(className);
  classes.push({ exportName, className, Constructor: value });
}

const references = [];

for (const entry of classes.sort((a, b) => a.className.localeCompare(b.className)))
{
  let schema = null;

  try
  {
    schema = CjsSchema.getSchema(entry.Constructor);
  }
  catch
  {
    continue;
  }

  for (const field of schema?.fields ?? [])
  {
    for (const key of REFERENCE_KEYS)
    {
      const identity = field.type?.[key];
      if (typeof identity !== "string" || !CLASS_IDENTITY.test(identity)) continue;

      references.push({
        className: entry.className,
        family: CjsSchema.getClassFamily(entry.Constructor) ?? "",
        field: field.name,
        kind: field.type?.kind ?? "",
        slot: key,
        identity,
        resolved: Boolean(CjsSchema.GetConstructor(identity)) || declared.has(identity)
      });
    }
  }
}

const unresolved = references
  .filter(reference => !reference.resolved && !ALLOWED.has(reference.identity))
  .map(reference => ({ ...reference, category: Classify(reference) }));
const waived = references.filter(reference => !reference.resolved && ALLOWED.has(reference.identity));
const missing = unresolved.filter(reference => reference.category === "missing-model");

const result = {
  generatedAt: new Date().toISOString(),
  summary: {
    classes: classes.length,
    references: references.length,
    identities: new Set(references.map(reference => reference.identity)).size,
    unresolved: unresolved.length,
    unresolvedIdentities: new Set(unresolved.map(reference => reference.identity)).size,
    missingModels: missing.length,
    missingModelIdentities: new Set(missing.map(reference => reference.identity)).size,
    interfaceSeams: new Set(unresolved.filter(reference => reference.category === "interface-seam")
      .map(reference => reference.identity)).size,
    opaqueNative: new Set(unresolved.filter(reference => reference.category === "opaque-native")
      .map(reference => reference.identity)).size,
    waived: waived.length
  },
  unresolved,
  waived
};

if (emitJson)
{
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
else
{
  PrintMarkdown(result);
}

// Only a missing MODEL fails the audit. Interface seams and opaque native
// types are reported for visibility but are expected to stay unresolvable.
process.exitCode = missing.length ? 1 : 0;

/**
 * Prints a compact Markdown report of unresolvable type references.
 *
 * @param {object} audit Audit result.
 */
function PrintMarkdown(audit)
{
  console.log("# runtime-trinity type-reference audit");
  console.log();
  console.log(`- Registered classes inspected: ${audit.summary.classes}.`);
  console.log(`- Type references checked: ${audit.summary.references} across ${audit.summary.identities} distinct identities.`);
  console.log(`- **Missing models: ${audit.summary.missingModels} across ${audit.summary.missingModelIdentities} identities.**`);
  console.log(`- Interface seams (duck-typed, expected): ${audit.summary.interfaceSeams} identities.`);
  console.log(`- Opaque native types (\`@type.rawStruct\`, expected): ${audit.summary.opaqueNative} identities.`);
  if (audit.summary.waived) console.log(`- Allowlisted references: ${audit.summary.waived}.`);
  console.log();

  PrintCategory("Missing models", audit.unresolved.filter(reference => reference.category === "missing-model"),
    "Declare the missing class, correct the reference, or record a reviewed allowlist entry.");
  PrintCategory("Interface seams", audit.unresolved.filter(reference => reference.category === "interface-seam"), null);
  PrintCategory("Opaque native types", audit.unresolved.filter(reference => reference.category === "opaque-native"), null);
}

/**
 * Prints one grouped category section.
 *
 * @param {string} title Section heading.
 * @param {object[]} records Unresolved references in the category.
 * @param {string|null} advice Closing guidance, when the category is actionable.
 */
function PrintCategory(title, records, advice)
{
  console.log(`## ${title}`);
  console.log();

  if (!records.length)
  {
    console.log("None.");
    console.log();
    return;
  }

  const groups = new Map();

  for (const record of records)
  {
    let group = groups.get(record.identity);
    if (!group)
    {
      group = [];
      groups.set(record.identity, group);
    }
    group.push(record);
  }

  for (const [identity, group] of [...groups].sort(([a], [b]) => a.localeCompare(b)))
  {
    const sites = group
      .map(record => `${record.className}.${record.field} (@type.${record.kind})`)
      .join(", ");
    console.log(`- **${identity}** - referenced by ${sites}`);
  }

  console.log();
  if (advice) console.log(`${advice}\n`);
}

void root;
