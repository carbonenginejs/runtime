// Fails when a schema field references a class or nominal interface identity
// that no combined-runtime layer declares.
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CjsSchema } from "../npm/dist/global/schema/index.js";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const selectedLayer = GetOption("--layer");
const emitJson = process.argv.includes("--json");
const MODULES = [
  [ "global", "global/index.js" ],
  [ "resource", "resource/index.js" ],
  [ "trinity", "trinity/index.js" ],
  [ "sof", "sof/index.js" ],
  [ "audio", "audio/index.js" ],
  [ "character", "character/index.js" ],
  [ "input", "input/index.js" ],
  [ "core", "core/index.js" ],
  [ "engine/webgpu", "engine/webgpu/index.js" ],
  [ "tools", "tools/index.js" ]
];

// Field kinds whose type carries a class identity rather than a primitive.
const REFERENCE_KEYS = [ "className", "itemType", "keyType", "valueType" ];
const CLASS_IDENTITY = /^[A-Z]/;
const INTERFACE_IDENTITY = /^I[A-Z]/;

// Native or backend identities which the JavaScript schema records but the
// combined runtime deliberately does not construct.
const ALLOWED = new Map([
  [ "Tr2EffectRes", "The resource layer owns decoded effect representations under a different public identity." ],
  [ "Tr2ImageRes", "The resource layer owns decoded image representations under a different public identity." ],
  [ "Tr2LightProfileRes", "The resource layer owns decoded light-profile representations under a different public identity." ],
  [ "TriGeometryRes", "The resource layer owns decoded geometry representations under a different public identity." ],
  [ "TriGrannyRes", "The resource layer owns decoded Granny representations under a different public identity." ],
  [ "TriTextureRes", "The resource layer owns decoded texture representations under a different public identity." ],
  [ "Tr2SkinnedObject", "The character layer owns skinned-object behavior." ],
  [ "Tr2BufferAL", "An engine owns live backend handles." ],
  [ "Tr2ConstantBufferAL", "An engine owns live backend handles." ],
  [ "Tr2TextureAL", "An engine owns live backend handles." ],
  [ "Tr2TextureAtlasVectorRO", "An engine owns live backend handles." ],
  [ "Be::Var", "Blue variable storage is a native host type with no portable model." ],
  [ "Be::VarEntry", "Blue variable storage is a native host type with no portable model." ],
  [ "PyObject", "Python interop handles have no portable model." ],
  [ "ImageIO::HostBitmap", "Native imageio bitmaps are represented by decoded resource values." ],
  [ "Tr2ParallelTaskGroup", "Native task scheduling is represented by JavaScript async work." ]
]);

const modules = MODULES.filter(([ layer ]) => !selectedLayer
  || layer === selectedLayer
  || layer.startsWith(`${selectedLayer}/`));

if (!modules.length)
{
  throw new Error(`Unknown runtime layer: ${selectedLayer}`);
}

const declared = new Set();
const classes = [];
const seenConstructors = new Set();

for (const [ layer, relativeModule ] of modules)
{
  const moduleUrl = pathToFileURL(path.join(root, "npm", "dist", relativeModule)).href;
  const runtimeLayer = await import(moduleUrl);

  for (const [ exportName, value ] of Object.entries(runtimeLayer))
  {
    if (typeof value !== "function") continue;
    declared.add(exportName);
    if (seenConstructors.has(value)) continue;
    seenConstructors.add(value);

    const className = CjsSchema.getClassName(value);
    if (!className) continue;

    declared.add(className);
    classes.push({ layer, exportName, className, Constructor: value });
  }
}

const references = [];

for (const entry of classes.sort((a, b) =>
  `${a.layer}/${a.className}`.localeCompare(`${b.layer}/${b.className}`)))
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
        layer: entry.layer,
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
const missingModels = unresolved.filter(reference => reference.category === "missing-model");
const contractGaps = unresolved.filter(reference => reference.category === "contract-gap");
const actionable = [ ...missingModels, ...contractGaps ];

const result = {
  generatedAt: new Date().toISOString(),
  scope: selectedLayer ?? "runtime",
  summary: {
    classes: classes.length,
    layers: SummarizeLayers(classes),
    references: references.length,
    identities: new Set(references.map(reference => reference.identity)).size,
    unresolved: unresolved.length,
    unresolvedIdentities: new Set(unresolved.map(reference => reference.identity)).size,
    missingModels: missingModels.length,
    missingModelIdentities: new Set(missingModels.map(reference => reference.identity)).size,
    contractGaps: contractGaps.length,
    contractGapIdentities: new Set(contractGaps.map(reference => reference.identity)).size,
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

// Missing models and nominal contracts fail. Opaque native types remain
// informational because rawStruct explicitly records that boundary.
process.exitCode = actionable.length ? 1 : 0;

/**
 * Reads a command-line option value.
 *
 * @param {string} name
 * @returns {string|null}
 */
function GetOption(name)
{
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

/**
 * Buckets an unresolvable reference by why it fails to resolve.
 *
 * @param {object} reference
 * @returns {string}
 */
function Classify(reference)
{
  if (reference.kind === "rawStruct") return "opaque-native";
  if (INTERFACE_IDENTITY.test(reference.identity)) return "contract-gap";
  return "missing-model";
}

/** @param {object[]} values @returns {object} */
function SummarizeLayers(values)
{
  const summary = new Map();
  for (const value of values) summary.set(value.layer, (summary.get(value.layer) ?? 0) + 1);
  return Object.fromEntries([...summary].sort(([ a ], [ b ]) => a.localeCompare(b)));
}

/**
 * Prints a compact Markdown report.
 *
 * @param {object} audit
 */
function PrintMarkdown(audit)
{
  console.log(`# ${audit.scope} type-reference audit`);
  console.log();
  console.log(`- Registered classes inspected: ${audit.summary.classes}.`);
  console.log(`- Type references checked: ${audit.summary.references} across ${audit.summary.identities} distinct identities.`);
  console.log(`- **Missing models: ${audit.summary.missingModels} across ${audit.summary.missingModelIdentities} identities.**`);
  console.log(`- **Nominal contract gaps: ${audit.summary.contractGaps} across ${audit.summary.contractGapIdentities} identities.**`);
  console.log(`- Opaque native types (\`@type.rawStruct\`, expected): ${audit.summary.opaqueNative} identities.`);
  if (audit.summary.waived) console.log(`- Allowlisted references: ${audit.summary.waived}.`);
  console.log();

  PrintCategory("Missing models", audit.unresolved.filter(reference => reference.category === "missing-model"),
    "Declare the missing class, correct the reference, or record a reviewed allowlist entry.");
  PrintCategory("Nominal contract gaps", audit.unresolved.filter(reference => reference.category === "contract-gap"),
    "Define the canonical base contract and make organization-owned implementations extend it.");
  PrintCategory("Opaque native types", audit.unresolved.filter(reference => reference.category === "opaque-native"), null);
}

/**
 * Prints one grouped category section.
 *
 * @param {string} title
 * @param {object[]} records
 * @param {string|null} advice
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

  for (const [ identity, group ] of [...groups].sort(([ a ], [ b ]) => a.localeCompare(b)))
  {
    const sites = group
      .map(record => `${record.layer}:${record.className}.${record.field} (@type.${record.kind})`)
      .join(", ");
    console.log(`- **${identity}** - referenced by ${sites}`);
  }

  console.log();
  if (advice) console.log(`${advice}\n`);
}
