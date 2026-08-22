// Generates the data-only Carbon audio classes owned by runtime-audio
// (see docs/architecture.md and docs/reference/carbon-compatibility.md) from the
// tools-core's current Carbon schema build, reusing the same classTool API as
// runtime-trinity/scripts/regenerate_generated.js. trinityAudio is already
// hand-owned in src/trinity/trinityAudio and is not re-emitted here.
//
// The classTool import below reaches into a SIBLING CHECKOUT by relative path
// rather than by package specifier, and that is deliberate: tools-core depends
// on this package, so a declared dependency the other way would be a cycle.
// Nothing records this edge - not package.json, not the dependency checker -
// and it runs only under "npm run generate", never under test, lint or check.
// It survived the tools-core class rename of 2026-08-22 because the four names
// it imports are free FUNCTIONS rather than classes; a file move under
// tools-core/src/schema would take it out, and nothing would notice until
// somebody regenerated.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveExpectedFields, loadSchemaDoc, renderClassFile, schemaBaseClassForDoc } from "../../tools-core/src/schema/core/classTool.js";
import { assertGeneratedTargetWritable, isGeneratedClassSource } from "./generate_trinity_ownership.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(root, "..");
const schemaRoot = path.resolve(
  process.env.CARBON_SCHEMA_ROOT
    ?? path.join(workspaceRoot, "tools-core", ".scratch", "schema-build"));
const outRoot = path.join(root, "src", "trinity");
const GENERATED_FAMILIES = ["audio", "trinityAudioApi"];
// Hand-owned files are never (re-)generated or deleted; behavior ports live
// there (see each file's header). trinityAudio is an entirely hand-owned
// family; the audio-family entries below were promoted from generator output.
const HAND_OWNED_CLASSES = new Set([
  "AudActionLogCB",
  "AudActionRecord",
  "AudActionRecordExecuteActionOnPlayingID",
  "AudActionRecordPostEvent",
  "AudActionRecordSetRTPC",
  "AudActionRecordSetState",
  "AudActionRecordSetSwitch",
  "AudEmitter",
  "AudEventCurve",
  "AudGeometry",
  "AudioCurveSetDriver",
  "AudManager",
  "AudMusicPlayer",
  "AudObstructionOcclusion",
  "AudParameter",
  "AudPosition",
  "StretchAudio",
  "SpatialAudioSettings",
  "AudGameObjResource",
  "AudListener",
  "AudStaticDataRepository",
  "AudUIPlayer",
  "SoundPrioritization",
  "Tr2AudioStretchAuto",
  "Tr2AudioStretchBase"
]);

// Reviewed fidelity and authored-value outcomes:
// - TRIMMED_CLASSES: native Wwise/OS plumbing, editor tooling, or runtime/
//   debug telemetry with no data-graph value (verdicts cite the C++ Blue
//   exposure: attribute-less, interface-only, or not Blue at all).
const TRIMMED_CLASSES = new Set([
  "AudPathResolver",
  "AudioInputMgr",
  "FileHelpers",
  "IAudioInputMgr",
  "LowLevelIOHook",
  "MonitoredParameterInfo",
  "RH2LH",
  "SoundBankInfo",
  "SoundPrioritization",
  "StringUtils",
  "WaapiManager"
]);

// - FIELD_STRIP_CLASSES: Blue exposure has zero MAP_ATTRIBUTE, so the
//   reflection scan fell back to raw header members (artifacts, e.g. the
//   nested EventData struct). Blue-exposed methods are kept.
const FIELD_STRIP_CLASSES = new Set(["AudStaticDataRepository"]);

// - METHOD_ADDITIONS: Blue-exposed methods the reflection scan missed
//   (AudManager GetState -> GetStateValue, AudManager_Blue.cpp:116-121).
const METHOD_ADDITIONS = new Map([
  ["AudManager", [
    { name: "GetState", blueName: "GetState", target: "GetStateValue", declaredOn: "AudManager", macro: "MAP_METHOD_AND_WRAP", description: "" }
  ]]
]);

// - AUTHORED_FIELD_ADDITIONS: authored-value promotions per the kb.md
//   authored-value rule - members Blue hides (or routes through Initialize/
//   UpdateSettings params) that are authored data needed to rebuild state.
//   The divergence is an implementation decision, so each promoted field is
//   stamped @impl.adapted + @impl.reason(...) (field-capable impl decorators,
//   runtime-utils type/schema foundation) in addition to the [AUTHORED] JSDoc tag.
//   m_position: set from Initialize(name, prefix, position) at
//   AudGameObjResource.cpp:436. m_settings: supplied via
//   AudManager::UpdateSettings before init.
const AUTHORED_FIELD_ADDITIONS = new Map([
  ["AudGameObjResource", [
    {
      name: "position", member: "m_position", cppType: "Vector3", kind: "vec3",
      flags: ["AUTHORED"], io: "persist", notify: false,
      reason: "Carbon routes this through Initialize(name, prefix, position) outside Blue serialization; CarbonEngineJS persists it for values interchange.",
      default: { determinate: true, value: [0, 0, 0], source: "authored-value promotion (Initialize position param)" }
    }
  ]],
  ["AudManager", [
    {
      name: "settings", member: "m_settings", cppType: "AudSettingsPtr", kind: "model", typeArg: "AudSettings",
      flags: ["AUTHORED"], io: "persist", notify: false,
      reason: "Carbon supplies this via UpdateSettings() outside Blue serialization; CarbonEngineJS persists it for values interchange.",
      default: { determinate: true, value: null, source: "authored-value promotion (UpdateSettings config)" }
    }
  ]]
]);

function applyAuthoredImplMarkers(text, additions) {
  let result = text;
  for (const field of additions) {
    const jsdocLine = `  /** ${field.member} (${field.cppType}) [AUTHORED] */`;
    if (!result.includes(jsdocLine)) {
      throw new Error(`Authored field JSDoc line not found for ${field.name}`);
    }
    result = result.replace(jsdocLine, `${jsdocLine}\n  @impl.adapted\n  @impl.reason("${field.reason}")`);
  }
  if (!/import \{[^}]*\bimpl\b[^}]*\} from "@carbonenginejs\/runtime-utils\/schema"/.test(result)) {
    result = result.replace(/import \{ ([^}]*) \} from "@carbonenginejs\/runtime-utils\/schema";/, (match, names) => {
      const list = [...new Set([...names.split(",").map(item => item.trim()), "impl"])].sort();
      return `import { ${list.join(", ")} } from "@carbonenginejs/runtime-utils/schema";`;
    });
  }
  return result;
}

function walkJson(dir) {
  return fs.readdirSync(dir)
    .filter(name => name.endsWith(".json") && name !== "index.json")
    .sort()
    .map(name => path.join(dir, name));
}

function classNameFor(doc, file) {
  return doc.blueClass || doc.cppClass || doc.black?.className || path.basename(file, ".json");
}

function writeFile(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

const summary = { generated: 0, skipped: [], errors: [], families: {} };
const prepared = [];
const emittable = new Set();

if (!fs.existsSync(schemaRoot)) {
  throw new Error(
    `Missing Carbon schema build: ${schemaRoot}. Run "npm.cmd run schema:build" in tools-core, `
    + "or set CARBON_SCHEMA_ROOT to a current tools-core schema build.");
}

for (const family of GENERATED_FAMILIES) {
  const familyDir = path.join(schemaRoot, family);
  if (!fs.existsSync(familyDir)) {
    throw new Error(`Missing schema family directory: ${familyDir}`);
  }
  for (const file of walkJson(familyDir)) {
    const { doc, schemaRoot: loadedRoot, family: loadedFamily } = loadSchemaDoc({ schema: file });
    const className = classNameFor(doc, file);
    if (HAND_OWNED_CLASSES.has(className)) {
      summary.skipped.push({ family, className, reason: "hand-owned source exists" });
      continue;
    }
    if (TRIMMED_CLASSES.has(className)) {
      summary.skipped.push({ family, className, reason: "trimmed by 2026-07-18 port review (no data-graph value)" });
      continue;
    }
    const expected = deriveExpectedFields(doc, { schemaRoot: loadedRoot, family: loadedFamily });
    if (FIELD_STRIP_CLASSES.has(className)) {
      expected.fields = [];
    }
    for (const method of METHOD_ADDITIONS.get(className) || []) {
      if (!expected.methods.some(existing => existing.name === method.name)) {
        expected.methods.push(method);
      }
    }
    for (const field of AUTHORED_FIELD_ADDITIONS.get(className) || []) {
      if (!expected.fields.some(existing => existing.name === field.name)) {
        expected.fields.push(field);
      }
    }
    if (expected.fallback && !expected.fields.length && !expected.methods.length) {
      summary.skipped.push({ family, className, reason: expected.fallback.reason });
      continue;
    }
    prepared.push({ family, className, file, doc, loadedRoot, loadedFamily, expected });
    emittable.add(className);
  }
}

for (const family of GENERATED_FAMILIES) {
  const familyDir = path.join(outRoot, family);
  if (!fs.existsSync(familyDir)) {
    continue;
  }
  for (const name of fs.readdirSync(familyDir)) {
    if (!name.endsWith(".js") || name === "index.js") {
      continue;
    }
    const file = path.join(familyDir, name);
    if (isGeneratedClassSource(fs.readFileSync(file, "utf8"))) {
      fs.rmSync(file);
    }
  }
}

for (const item of prepared) {
  const { family, className, doc, loadedRoot, loadedFamily, expected } = item;
  try {
    const baseClass = schemaBaseClassForDoc(doc, { schemaRoot: loadedRoot, family: loadedFamily });
    const extendsOptions = baseClass && emittable.has(baseClass)
      ? { extendsClass: baseClass, extendsImport: `./${baseClass}.js` }
      : {};
    if (!extendsOptions.extendsClass) {
      expected.meta.baseClass = "CjsModel";
    }
    let text = renderClassFile(expected, {
      doc: { ...doc, family },
      js: true,
      ...extendsOptions
    });
    const authoredFields = AUTHORED_FIELD_ADDITIONS.get(className);
    if (authoredFields) {
      text = applyAuthoredImplMarkers(text, authoredFields);
    }
    const outputFile = path.join(outRoot, family, `${className}.js`);
    if (fs.existsSync(outputFile)) {
      assertGeneratedTargetWritable(outputFile, fs.readFileSync(outputFile, "utf8"));
    }
    writeFile(outputFile, text);
    summary.generated++;
    summary.families[family] = (summary.families[family] || 0) + 1;
  } catch (error) {
    summary.errors.push({ family, className, error: error.message });
  }
}

for (const family of GENERATED_FAMILIES) {
  const familyDir = path.join(outRoot, family);
  const classes = fs.readdirSync(familyDir)
    .filter(name => name.endsWith(".js") && name !== "index.js")
    .map(name => path.basename(name, ".js"))
    .sort();
  const lines = classes.map(name => `export * from "./${name}.js";`);
  writeFile(path.join(outRoot, family, "index.js"), `${lines.join("\n")}\n`);
}

if (summary.errors.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(summary, null, 2));
