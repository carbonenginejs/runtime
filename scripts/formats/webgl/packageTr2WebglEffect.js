import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

// Deep imports rather than index re-exports: this is a build script, so it may
// reach package internals, and widening the public surface to satisfy a tool
// would be the wrong trade. The Tr2*/tr2* spellings below were renamed to
// Hlsl*/hlsl* when format-hlsl merged into runtime-resource, which is what left
// this script unable to load.
import { CjsHlslFormat } from "../../../src/formats/hlsl/index.js";
import { HlslEffectBindingManifest } from "../../../src/formats/hlsl/core/tr2/shader/HlslEffectBindingManifest.js";
import {
  HlslRenderContextEnum,
  hlslShaderStageName
} from "../../../src/formats/hlsl/core/tr2/HlslRenderContextEnum.js";
import { CjsWebglFormat } from "../../../src/formats/webgl/index.js";
import {
  formatCewgIntegrityErrors,
  formatIncompleteCewgPasses,
  inspectCewgPackageIntegrity,
  inspectCewgRasterCompleteness,
  isCewgDiagnosticIntegrityError
} from "./cewgCompleteness.js";
import {
  LIGHT_STUB_RESOURCE_NAMES,
  resolveStubLightRegisters,
  stripResourcesFromManifest
} from "./stubLightResources.js";
import { writeFileAtomic } from "./atomicWrite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const defaultInput = path.join(
  projectRoot,
  "test",
  "fixtures",
  "quadv5.sm_hi"
);
const defaultOutput = path.join(projectRoot, "artifacts", "quadv5.webgl.cewg");
const defaultWorkDir = path.join(projectRoot, "artifacts", "hlsl2webgl-effect");

/**
 * Parses command-line arguments.
 *
 * @param {string[]} argv Command-line arguments.
 * @returns {object} Parsed options.
 */
function parseArgs(argv) {
  const args = {
    input: defaultInput,
    output: defaultOutput,
    workDir: defaultWorkDir,
    tool: process.env.HLSL2WEBGL || null,
    language: "es300",
    flags: null,
    sourceGame: null,
    sourceClient: null,
    sourceBuild: null,
    sourceLogicalPath: null,
    technique: null,
    pass: null,
    stage: null,
    includeSourceEffect: false,
    overwrite: false,
    allowFailures: false,
    allPermutations: true,
    native: false,
    // How the shared packager lowers a recognised local-light family. The two
    // lowering flags below set this and no longer force the legacy path; the
    // library owns the recognition and the profile constants.
    localLights: "none"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out" && argv[i + 1]) args.output = path.resolve(argv[++i]);
    else if (arg === "--work-dir" && argv[i + 1]) args.workDir = path.resolve(argv[++i]);
    else if (arg === "--tool" && argv[i + 1]) args.tool = path.resolve(argv[++i]);
    else if (arg === "--lang" && argv[i + 1]) args.language = argv[++i];
    else if (arg === "--flags" && argv[i + 1]) args.flags = argv[++i];
    else if (arg === "--source-game" && argv[i + 1]) args.sourceGame = argv[++i];
    else if (arg === "--source-client" && argv[i + 1]) args.sourceClient = argv[++i];
    else if (arg === "--source-build" && argv[i + 1]) args.sourceBuild = argv[++i];
    else if (arg === "--source-logical-path" && argv[i + 1]) args.sourceLogicalPath = argv[++i];
    else if (arg === "--technique" && argv[i + 1]) args.technique = argv[++i];
    else if (arg === "--pass" && argv[i + 1]) {
      const value = argv[++i];
      if (!/^\d+$/.test(value)) throw new Error(`--pass must be a non-negative integer: ${value}`);
      args.pass = Number(value);
    }
    else if (arg === "--stage" && argv[i + 1]) args.stage = argv[++i].toLowerCase();
    else if (arg === "--native") args.native = true;
    else if (arg === "--include-source-effect") args.includeSourceEffect = true;
    else if (arg === "--overwrite" || arg === "--force") args.overwrite = true;
    else if (arg === "--allow-failures") args.allowFailures = true;
    else if (arg === "--selected-only") args.allPermutations = false;
    else if (arg === "--all-permutations") args.allPermutations = true;
    else if (arg === "--stub-light-resources") args.localLights = "drop";
    else if (arg === "--light-constant-buffer") args.localLights = "constant-buffer";
    else if (arg === "--packed-light-texture") args.localLights = "packed-texture";
    else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (!arg.startsWith("--")) {
      args.input = path.resolve(arg);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return args;
}

/**
 * Prints command usage.
 */
function printUsage() {
  console.log([
    "Usage: node scripts/packageTr2WebglEffect.js [effect-file] [options]",
    "",
    "Options:",
    "  --out <path>              Output CEWG path. Defaults to artifacts/quadv5.webgl.cewg.",
    "  --work-dir <dir>          Stage DXBC/GLSL output directory.",
    "  --native                  Translate with the native hlsl2webgl tool instead of the JS emitter.",
    "  --tool <exe>              hlsl2webgl executable (implies --native paths). Defaults to HLSL2WEBGL.",
    "  --lang <lang>             hlsl2webgl target language, default es300.",
    "  --flags <value>           hlsl2webgl numeric flags override.",
    "  --source-game <name>      Source game identity (for example Frontier).",
    "  --source-client <name>    Source client identity (for example stillness).",
    "  --source-build <id>       Immutable source build identity.",
    "  --source-logical-path <p> Original res:/ shader path.",
    "  --technique <name>        Restrict to one technique.",
    "  --pass <index>            Restrict to one pass index.",
    "  --stage <name>            Restrict to one stage name.",
    "  --include-source-effect   Add the original Tr2 effect bytes as TR2E.",
    "  --overwrite, --force      Explicitly replace an existing CEWG output file.",
    "  --allow-failures          Write partial packages even when translation fails.",
    "  --selected-only           Package only the default/selected permutation.",
    "  --all-permutations        Package every permutation record. This is the default.",
    "  --stub-light-resources    Drop the local-light resources and lower their reads",
    "                            to zero, producing unlit output. Useful for isolating",
    "                            a lighting problem; --packed-light-texture keeps lights",
    "                            and still fits the texture budget.",
    "  --light-constant-buffer   Lower local-light resources to a constant buffer.",
    "                            Frees all three light texture units, but caps the",
    "                            light count; known to fail on busy scenes.",
    "  --packed-light-texture    Lower local-light resources to one packed RGBA32UI",
    "                            texture. Frees two of the three units and is the",
    "                            route that works. Detail maps merge automatically,",
    "                            so no extra flag is needed to fit .sm_depth shaders."
  ].join("\n"));
}

/**
 * Tests whether a path exists.
 *
 * @param {string} filePath Path to test.
 * @returns {Promise<boolean>} True when the path exists.
 */
async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds a locally built hlsl2webgl executable.
 *
 * @param {string|null} explicitPath Explicit executable path.
 * @returns {Promise<string|null>} Resolved executable path.
 */
async function findHlsl2Webgl(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.HLSL2WEBGL,
    path.join(projectRoot, "vendor", "HLSLcc", "build-probe", "HLSLcc", "Release", "hlsl2webgl.exe"),
    path.join(projectRoot, "vendor", "HLSLcc", "build-probe", "HLSLcc", "hlsl2webgl.exe"),
    path.join(projectRoot, "vendor", "HLSLcc", "build-probe", "Release", "hlsl2webgl.exe"),
    path.join(projectRoot, "vendor", "HLSLcc", "build-probe", "hlsl2webgl.exe"),
    path.join(projectRoot, "vendor", "HLSLcc", "build-hlsl2webgl", "Release", "hlsl2webgl.exe"),
    path.join(projectRoot, "vendor", "HLSLcc", "build-hlsl2webgl", "hlsl2webgl.exe"),
    path.join(projectRoot, "vendor", "HLSLcc", "build", "Release", "hlsl2webgl.exe"),
    path.join(projectRoot, "vendor", "HLSLcc", "build", "hlsl2webgl.exe")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (await pathExists(resolved)) return resolved;
  }

  return null;
}

/**
 * Checks whether a byte array starts with a DXBC header.
 *
 * @param {Uint8Array} bytes Byte array.
 * @returns {boolean} True when the bytes look like DXBC.
 */
function isDxbc(bytes) {
  return bytes?.length >= 4
    && bytes[0] === 0x44
    && bytes[1] === 0x58
    && bytes[2] === 0x42
    && bytes[3] === 0x43;
}

/**
 * Converts text to a filesystem-safe token.
 *
 * @param {string} value Input text.
 * @returns {string} Safe token.
 */
function safeName(value) {
  return String(value || "unknown").replace(/[^a-z0-9_.-]+/gi, "_");
}

/**
 * Hashes bytecode bytes for stable package-level shader identity.
 *
 * @param {Uint8Array} bytes Bytecode bytes.
 * @returns {string} SHA-1 hash.
 */
function hashBytes(bytes) {
  return createHash("sha1").update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)).digest("hex");
}

/**
 * Builds a stable key for one effect body record.
 *
 * @param {object} record Effect body record.
 * @returns {string} Body key.
 */
function bodyKey(record) {
  return `body_${record.offset}_${record.size}`;
}

/**
 * Computes the default mixed-radix permutation index.
 *
 * @param {object[]} permutations Permutation descriptions.
 * @returns {number} Default permutation index.
 */
function defaultPermutationIndex(permutations) {
  let multiplier = 1;
  let index = 0;
  for (const permutation of permutations) {
    index += (permutation.defaultOption || 0) * multiplier;
    multiplier *= permutation.options.length || 1;
  }
  return index;
}

/**
 * Decodes mixed-radix permutation options.
 *
 * The first serialized permutation varies fastest, matching Carbon's lookup
 * behavior and the established QuadV5 correlation fixture.
 *
 * @param {object[]} permutations Permutation descriptions.
 * @param {number} permutationIndex Mixed-radix permutation index.
 * @returns {object[]} Decoded option selections.
 */
function decodePermutationOptions(permutations, permutationIndex) {
  let remaining = permutationIndex;
  return permutations.map((permutation) => {
    const optionCount = permutation.options.length || 1;
    const optionIndex = optionCount ? remaining % optionCount : 0;
    remaining = Math.floor(remaining / optionCount);
    return {
      name: permutation.name,
      value: permutation.options[optionIndex] || "",
      optionIndex,
      defaultOption: permutation.defaultOption
    };
  });
}

/**
 * Returns options in the shape expected by `Tr2EffectRes.GetShader`.
 *
 * @param {object[]} decodedOptions Decoded options.
 * @returns {object[]} Shader lookup options.
 */
function toShaderOptions(decodedOptions) {
  return decodedOptions.map((option) => ({
    name: option.name,
    value: option.value
  }));
}

/**
 * Builds the set of permutation records to export.
 *
 * @param {object} effectRes Loaded effect resource.
 * @param {object} args Parsed options.
 * @returns {object[]} Export variant records.
 */
function buildExportVariants(effectRes, args) {
  if (args.allPermutations) {
    return effectRes.m_offsets.map((record, variantIndex) => {
      const permutationIndex = Number.isInteger(record.index) ? record.index : variantIndex;
      const options = decodePermutationOptions(effectRes.m_permutations, permutationIndex);
      return {
        key: `variant_${permutationIndex}`,
        variantIndex,
        permutationIndex,
        tableIndex: variantIndex,
        bodyKey: bodyKey(record),
        bodyOffset: record.offset,
        bodySize: record.size,
        options,
        tableIndexMatchesPermutationIndex: variantIndex === permutationIndex
      };
    });
  }

  const permutationIndex = defaultPermutationIndex(effectRes.m_permutations);
  const record = effectRes.m_offsets[permutationIndex];
  if (!record) {
    throw new Error(`Default permutation index ${permutationIndex} is not present in the effect table`);
  }
  return [{
    key: `variant_${permutationIndex}`,
    variantIndex: permutationIndex,
    permutationIndex,
    tableIndex: permutationIndex,
    bodyKey: bodyKey(record),
    bodyOffset: record.offset,
    bodySize: record.size,
    options: decodePermutationOptions(effectRes.m_permutations, permutationIndex),
    tableIndexMatchesPermutationIndex: Number.isInteger(record.index) ? record.index === permutationIndex : true
  }];
}

/**
 * Collects stage inputs from a decoded effect description.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {object} args Parsed options.
 * @returns {{ stages: object[], errors: string[] }} Stage records and collection errors.
 */
function collectStages(effectDescription, args) {
  const stages = [];
  const errors = [];

  for (const technique of effectDescription.techniques || []) {
    if (args.technique && technique.name !== args.technique) continue;
    if (!args.stage && !Number.isInteger(args.pass) && technique.passes.length === 0) {
      errors.push(`${technique.name} declares no passes`);
    }

    for (let passIndex = 0; passIndex < technique.passes.length; passIndex += 1) {
      if (Number.isInteger(args.pass) && passIndex !== args.pass) continue;
      const pass = technique.passes[passIndex];
      let declaredStageCount = 0;

      for (let stageType = 0; stageType < HlslRenderContextEnum.SHADER_TYPE_COUNT; stageType += 1) {
        const stageInput = pass.stageInputs[stageType];
        if (!stageInput?.m_exists) continue;
        declaredStageCount += 1;
        const stageName = hlslShaderStageName(stageType);
        if (args.stage && stageName !== args.stage) continue;
        if (!stageInput.cjsShaderBytecode) {
          errors.push(
            `${technique.name}.pass${passIndex}.${stageName} declares shader handle ` +
              `${stageInput.m_shader ?? "unknown"} but has no shader bytecode`
          );
          continue;
        }

        stages.push({
          key: `${technique.name}.pass${passIndex}.${stageName}`,
          techniqueName: technique.name,
          passIndex,
          stageType,
          stageName,
          shaderHandle: stageInput.m_shader,
          bytecode: stageInput.cjsShaderBytecode,
          pipelineInputs: cloneJson(stageInput.signature?.pipelineInputs || []),
          registers: cloneJson(stageInput.signature?.registers || []),
          resources: mapToJson(stageInput.resources),
          samplers: mapToJson(stageInput.samplers),
          uavs: mapToJson(stageInput.uavs),
          constants: cloneJson(stageInput.constants || [])
        });
      }
      if (!args.stage && declaredStageCount === 0) {
        errors.push(`${technique.name}.pass${passIndex} declares no shader stages`);
      }
    }
  }

  return { stages, errors };
}

/**
 * Runs hlsl2webgl for a single DXBC stage.
 *
 * @param {string} toolPath hlsl2webgl executable.
 * @param {string} dxbcPath Input DXBC path.
 * @param {string} glslPath Output GLSL path.
 * @param {object} args Parsed options.
 * @returns {Promise<object>} Process result.
 */
function runHlsl2Webgl(toolPath, dxbcPath, glslPath, args) {
  return new Promise((resolve) => {
    const toolArgs = [
      "--input", dxbcPath,
      "--output", glslPath,
      "--lang", args.language
    ];
    if (args.flags !== null) {
      toolArgs.push("--flags", args.flags);
    }

    const child = spawn(toolPath, toolArgs, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        exitCode: null,
        stdout,
        stderr: stderr + error.message
      });
    });
    child.on("close", (exitCode) => {
      resolve({
        ok: exitCode === 0,
        exitCode,
        stdout,
        stderr
      });
    });
  });
}

/**
 * Main CLI entry point.
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);
  const useNative = args.native || Boolean(args.tool);
  const toolPath = useNative ? await findHlsl2Webgl(args.tool) : null;

  if (sameFilePath(inputPath, outputPath)) {
    throw new Error("CEWG output must not overwrite the source effect file");
  }

  if (!args.overwrite && await pathExists(outputPath)) {
    throw new Error(`CEWG output already exists; pass --overwrite to replace it: ${outputPath}`);
  }

  if (useNative && !toolPath) {
    throw new Error("hlsl2webgl executable not found. Run npm.cmd run eve-hlslcc:build, or pass --tool <path>.");
  }

  const sourceBytes = await readFile(inputPath);
  if (!requiresLegacyDiagnosticPath(args, useNative))
  {
    const sourceIdentity = {
      filePath: path.relative(projectRoot, inputPath),
      logicalPath: args.sourceLogicalPath || path.relative(projectRoot, inputPath),
      game: args.sourceGame,
      client: args.sourceClient,
      build: args.sourceBuild,
      byteLength: sourceBytes.byteLength,
      md5: createHash("md5").update(sourceBytes).digest("hex"),
      sha256: createHash("sha256").update(sourceBytes).digest("hex")
    };
    const result = CjsWebglFormat.buildEffect(sourceBytes, {
      source: path.relative(projectRoot, inputPath),
      outputPath: path.relative(projectRoot, outputPath),
      sourceIdentity,
      generatedAt: new Date(),
      technique: args.technique,
      pass: args.pass,
      stage: args.stage,
      includeSourceEffect: args.includeSourceEffect,
      allPermutations: args.allPermutations,
      allowFailures: args.allowFailures,
      localLights: args.localLights
    });

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFileAtomic(outputPath, result.bytes);
    console.log(JSON.stringify({
      output: path.relative(projectRoot, outputPath),
      permutationCount: result.info.permutationCount,
      uniqueBodyCount: result.info.uniqueBodyCount,
      sourcePermutationCount: result.info.sourcePermutationCount,
      sourceUniqueBodyCount: result.info.sourceUniqueBodyCount,
      reflectedBodyCount: result.info.effectReflection?.bodyCount ?? 0,
      translatedShaderCount: result.info.translatedShaderCount,
      excludedShaderCount: result.info.excludedShaderCount,
      failedShaderCount: result.info.failedShaderCount,
      failedBodyCount: result.info.failedBodyCount,
      completeRasterPassCount: result.info.completeRasterPassCount,
      incompleteRasterPassCount: result.info.incompleteRasterPassCount,
      availableShaderCount: result.info.availableShaderCount,
      translator: result.info.translator
    }, null, 2));
    return;
  }

  console.warn(
    "Using the legacy native/debug CEWG diagnostic path; this path does not "
    + "claim source-complete portable reflection."
  );
  const effectRes = await CjsHlslFormat.readFile(inputPath, { emit: "raw" });
  if (!effectRes.IsGood()) {
    throw effectRes.loadError || new Error("Tr2EffectRes failed to load input");
  }

  await mkdir(args.workDir, { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });

  const variants = buildExportVariants(effectRes, args);
  const bodyMap = new Map();
  const stageMap = new Map();
  const shaderMap = new Map();

  for (const variant of variants) {
    if (bodyMap.has(variant.bodyKey)) continue;

    const shader = effectRes.GetShader(toShaderOptions(variant.options));
    if (!shader) {
      bodyMap.set(variant.bodyKey, {
        key: variant.bodyKey,
        bodyOffset: variant.bodyOffset,
        bodySize: variant.bodySize,
        firstVariantKey: variant.key,
        error: "Tr2EffectRes.GetShader returned null",
        manifest: null,
        stages: []
      });
      continue;
    }

    const effectDescription = shader.GetEffectDescription();
    const manifest = HlslEffectBindingManifest.fromEffectDescription(effectDescription);
    const stageCollection = collectStages(effectDescription, args);
    const stages = stageCollection.stages;
    let manifestJson = manifest.toJSON();
    const droppedManifestResources = new Set();
    if (args.stubLightResources)
    {
      for (const name of LIGHT_STUB_RESOURCE_NAMES) droppedManifestResources.add(name);
    }
    if (droppedManifestResources.size) manifestJson = stripResourcesFromManifest(manifestJson, droppedManifestResources);
    const body = {
      key: variant.bodyKey,
      bodyOffset: variant.bodyOffset,
      bodySize: variant.bodySize,
      firstVariantKey: variant.key,
      error: stageCollection.errors.length ? stageCollection.errors.join("; ") : null,
      manifest: manifestJson,
      stages: []
    };

    for (const stage of stages) {
      const shaderKey = `dxbc_${hashBytes(stage.bytecode.bytes)}`;
      const stageKey = `${variant.bodyKey}.${stage.key}`;
      const stageRecord = {
        key: stageKey,
        bodyKey: variant.bodyKey,
        localKey: stage.key,
        techniqueName: stage.techniqueName,
        passIndex: stage.passIndex,
        stageType: stage.stageType,
        stageName: stage.stageName,
        shaderHandle: stage.shaderHandle,
        shaderSize: stage.bytecode.shaderSize,
        stringTableOffset: stage.bytecode.stringTableOffset,
        shaderKey,
        contract: buildStageContract(stage)
      };
      stageMap.set(stageKey, stageRecord);
      body.stages.push(stageKey);

      if (!shaderMap.has(shaderKey)) {
        shaderMap.set(shaderKey, {
          key: shaderKey,
          firstStageKey: stageKey,
          firstBodyKey: variant.bodyKey,
          stageName: stage.stageName,
          shaderSize: stage.bytecode.shaderSize,
          stringTableOffset: stage.bytecode.stringTableOffset,
          bytes: stage.bytecode.bytes,
          isDxbc: isDxbc(stage.bytecode.bytes),
          dxbcPath: null,
          glslPath: null,
          hlsl2webgl: null,
          source: null,
          contracts: []
        });
      }

      shaderMap.get(shaderKey).contracts.push({
        stageKey,
        techniqueName: stage.techniqueName,
        passIndex: stage.passIndex,
        stageName: stage.stageName,
        contract: stageRecord.contract
      });
    }

    bodyMap.set(variant.bodyKey, body);
  }

  if (useNative) {
    for (const shaderRecord of shaderMap.values()) {
      const stageBase = [
        safeName(path.basename(inputPath)),
        safeName(shaderRecord.key.slice(0, 21)),
        safeName(shaderRecord.stageName)
      ].join(".");
      const dxbcPath = path.join(args.workDir, `${stageBase}.dxbc`);
      const glslPath = path.join(args.workDir, `${stageBase}.${args.language}.glsl`);

      await writeFile(dxbcPath, shaderRecord.bytes);
      shaderRecord.dxbcPath = path.relative(projectRoot, dxbcPath);
      shaderRecord.glslPath = path.relative(projectRoot, glslPath);

      if (!shaderRecord.isDxbc) {
        shaderRecord.hlsl2webgl = {
          ok: false,
          skipped: true,
          reason: "stage bytecode is not DXBC"
        };
      } else {
        shaderRecord.hlsl2webgl = await runHlsl2Webgl(toolPath, dxbcPath, glslPath, args);
        if (shaderRecord.hlsl2webgl.ok) {
          shaderRecord.source = normalizeWebgl2StageSource(await readFile(glslPath, "utf8"), shaderRecord);
          const sourceIssue = validateStageSourceShape(shaderRecord);
          if (sourceIssue) {
            shaderRecord.hlsl2webgl = {
              ...shaderRecord.hlsl2webgl,
              ok: false,
              validationError: sourceIssue
            };
            shaderRecord.source = null;
          }
        }
      }
    }
  } else {
    await translateWithJsEmitter(shaderMap, stageMap, args, inputPath);
  }

  const bodies = Array.from(bodyMap.values());
  const stages = Array.from(stageMap.values());
  const translatedShaders = Array.from(shaderMap.values()).map((shaderRecord) => {
    const { bytes, emit, ...jsonRecord } = shaderRecord;
    jsonRecord.primaryContract = mergeShaderContracts(jsonRecord.contracts);
    return jsonRecord;
  });
  const excludedShaders = translatedShaders.filter((shaderRecord) => shaderRecord.excluded);
  const failedShaders = translatedShaders.filter(
    (shaderRecord) => !shaderRecord.hlsl2webgl?.ok && !shaderRecord.excluded
  );
  const failedBodies = bodies.filter((body) => body.error);
  const rasterCompleteness = inspectCewgRasterCompleteness(stages, translatedShaders);
  const availableShaderCount = translatedShaders.filter(
    (shaderRecord) => shaderRecord.hlsl2webgl?.ok && shaderRecord.source
  ).length;
  const selection = {
    technique: args.technique,
    pass: Number.isInteger(args.pass) ? args.pass : null,
    stage: args.stage
  };
  const sourceIdentity = {
    filePath: path.relative(projectRoot, inputPath),
    logicalPath: args.sourceLogicalPath,
    game: args.sourceGame,
    client: args.sourceClient,
    build: args.sourceBuild,
    byteLength: sourceBytes.byteLength,
    md5: createHash("md5").update(sourceBytes).digest("hex"),
    sha256: createHash("sha256").update(sourceBytes).digest("hex")
  };
  const info = {
    format: "CEWG",
    formatVersion: 1,
    packageKind: args.allPermutations ? "tr2-effect-webgl-permutations" : "tr2-effect-webgl",
    generatedAt: new Date().toISOString(),
    sourcePath: path.relative(projectRoot, inputPath),
    sourceByteLength: sourceIdentity.byteLength,
    sourceMd5: sourceIdentity.md5,
    sourceSha256: sourceIdentity.sha256,
    sourceIdentity,
    translator: useNative ? "hlsl2webgl" : "dxbc-js-emitter",
    hlsl2webglPath: toolPath ? path.relative(projectRoot, toolPath) : null,
    language: args.language,
    flags: args.flags,
    selection,
    permutationMode: args.allPermutations ? "all" : "selected",
    permutationCount: variants.length,
    uniqueBodyCount: bodies.length,
    bodyStageCount: stages.length,
    uniqueShaderCount: translatedShaders.length,
    translatedShaderCount: translatedShaders.length - failedShaders.length - excludedShaders.length,
    excludedShaderCount: excludedShaders.length,
    failedShaderCount: failedShaders.length,
    failedBodyCount: failedBodies.length,
    expectedRasterPassCount: rasterCompleteness.expectedPassCount,
    completeRasterPassCount: rasterCompleteness.completePassCount,
    incompleteRasterPassCount: rasterCompleteness.incompletePasses.length,
    availableShaderCount,
    allowFailures: args.allowFailures
  };

  const metadata = {
    generatedAt: info.generatedAt,
    sourcePath: info.sourcePath,
    effectResource: effectRes.toJSON(),
    permutations: effectRes.GetPermutationDescription(),
    variants,
    bodies: bodies.map((body) => ({
      key: body.key,
      bodyOffset: body.bodyOffset,
      bodySize: body.bodySize,
      firstVariantKey: body.firstVariantKey,
      error: body.error,
      manifest: body.manifest
    }))
  };

  const glslSet = {
    format: "CEWG_GLSL_SET",
    formatVersion: 1,
    language: args.language,
    permutationMode: info.permutationMode,
    selection,
    variants: variants.map((variant) => ({
      key: variant.key,
      permutationIndex: variant.permutationIndex,
      bodyKey: variant.bodyKey
    })),
    bodies: bodies.map((body) => ({
      key: body.key,
      error: body.error,
      stages: body.stages
    })),
    stages,
    shaders: translatedShaders
  };

  const chunks = [
    ["INFO", info],
    ["META", metadata],
    ["GLSL", glslSet]
  ];
  if (args.includeSourceEffect) {
    chunks.push(["TR2E", sourceBytes]);
  }

  const integrity = inspectCewgPackageIntegrity(info, metadata, glslSet);
  const hardIntegrityErrors = integrity.errors.filter((error) => !isCewgDiagnosticIntegrityError(error));

  if (hardIntegrityErrors.length) {
    throw new Error([
      "CEWG target graph is invalid; output was not written.",
      formatCewgIntegrityErrors(hardIntegrityErrors),
      "Structural package errors cannot be bypassed with --allow-failures."
    ].filter(Boolean).join(" "));
  }

  const strictFailure = failedShaders.length
    || excludedShaders.length
    || failedBodies.length
    || rasterCompleteness.incompletePasses.length
    || !availableShaderCount
    || integrity.errors.length;
  if (strictFailure && !args.allowFailures) {
    const details = formatIncompleteCewgPasses(rasterCompleteness.incompletePasses);
    throw new Error([
      "CEWG target is incomplete; output was not written.",
      `${failedShaders.length} failed shader(s), ${excludedShaders.length} excluded shader(s), ` +
        `${failedBodies.length} failed body/bodies, ${rasterCompleteness.incompletePasses.length} incomplete raster pass(es), ` +
        `${availableShaderCount} available shader(s).`,
      details,
      formatCewgIntegrityErrors(integrity.errors),
      "Pass --allow-failures only when a partial diagnostic package is intentional."
    ].filter(Boolean).join(" "));
  }

  await writeFileAtomic(outputPath, CjsWebglFormat.build(chunks));

  const summary = {
    output: path.relative(projectRoot, outputPath),
    permutationCount: info.permutationCount,
    uniqueBodyCount: info.uniqueBodyCount,
    bodyStageCount: info.bodyStageCount,
    uniqueShaderCount: info.uniqueShaderCount,
    translatedShaderCount: info.translatedShaderCount,
    excludedShaderCount: info.excludedShaderCount,
    failedShaderCount: info.failedShaderCount,
    failedBodyCount: info.failedBodyCount,
    expectedRasterPassCount: info.expectedRasterPassCount,
    completeRasterPassCount: info.completeRasterPassCount,
    incompleteRasterPassCount: info.incompleteRasterPassCount,
    availableShaderCount: info.availableShaderCount,
    translator: info.translator,
    hlsl2webglPath: info.hlsl2webglPath
  };
  console.log(JSON.stringify(summary, null, 2));

}

function requiresLegacyDiagnosticPath(args, useNative)
{
  // Only the native hlsl2webgl tool reaches this path now. Everything else that
  // used to force it goes through the shared packager: both local-light
  // lowerings, dropping the lights entirely, and the Detail3Map drop that the
  // detail-map merge supersedes. Ten --debug-packed-light-* paints were deleted
  // with the lighting bring-up they served.
  //
  // hlsl2webgl is a comparison harness — a second DXBC-to-GLSL translator used
  // to check the JS emitter's output. Its executable is not in this repository
  // and the build script the error message names does not exist, so --native
  // cannot currently succeed. Retiring it would delete this path and roughly a
  // third of this file.
  return useNative
    || args.language !== "es300"
    || args.flags !== null;
}

function sameFilePath(left, right) {
  const normalize = (value) => process.platform === "win32" ? value.toLowerCase() : value;
  return normalize(path.resolve(left)) === normalize(path.resolve(right));
}

/**
 * Translates every unique shader with the pure-JS DXBC emitter.
 *
 * Pixel and compute stages emit first (pair-independent, deduped by DXBC
 * hash). Vertex stages are then re-keyed per paired pixel stage's varying set
 * so the pair-aware zero-fill (`pairVaryings`) can differ between passes
 * sharing bytecode. Compute stages are never paired or re-keyed — they are
 * standalone "map-style" fragment programs (thread id derived from
 * `gl_FragCoord`, UAV writes lowered to `out` render targets), carrying the
 * emitter's `computeFragment` host contract on success. Stages the WebGL2
 * target cannot
 * support (real compute features — shared memory, barriers, atomics, raw/
 * structured/typed UAV reads) are recorded as `excluded` kill-list entries
 * rather than failures.
 *
 * @param {Map<string, object>} shaderMap Unique shader records keyed by shader key.
 * @param {Map<string, object>} stageMap Stage records keyed by stage key.
 * @param {object} args Parsed options.
 * @param {string} inputPath Source effect path (used for artifact names).
 */
async function translateWithJsEmitter(shaderMap, stageMap, args, inputPath) {
  const emitInto = async (record, pairVaryings) => {
    const stageBase = [
      safeName(path.basename(inputPath)),
      safeName(record.key.slice(0, 40)),
      safeName(record.stageName)
    ].join(".");
    const dxbcPath = path.join(args.workDir, `${stageBase}.dxbc`);
    const glslPath = path.join(args.workDir, `${stageBase}.${args.language}.glsl`);
    await writeFile(dxbcPath, record.bytes);
    record.dxbcPath = path.relative(projectRoot, dxbcPath);
    record.glslPath = path.relative(projectRoot, glslPath);

    if (!record.isDxbc) {
      record.hlsl2webgl = { ok: false, skipped: true, reason: "stage bytecode is not DXBC" };
      return;
    }
    try {
      const stubResourceRegisterList = args.stubLightResources
        ? resolveStubLightRegisters(record)
        : [];
      const result = CjsWebglFormat.emitGlsl(record.bytes, {
        source: record.key,
        pairVaryings: pairVaryings && pairVaryings.length ? pairVaryings : undefined,
        ...(stubResourceRegisterList.length ? { stubResourceRegisters: stubResourceRegisterList } : {})
      });
      record.emit = result;
      // The packed-light fixups are applied on the shared emission path now; this
      // branch cannot reach them anyway, since the light flags no longer route
      // here. Only the debug paints remain local to this path.
      record.source = applyPackedLightDebugPaint(result.source, record, args);
      record.bindings = result.bindings;
      record.stageInputs = result.inputs;
      record.stageOutputs = result.outputs;
      record.emitWarnings = result.warnings;
      record.translator = "dxbc-js-emitter";
      record.hlsl2webgl = { ok: true, mode: "js-emitter" };
      if (result.stageName === "compute") {
        // Map-style compute shaders are standalone fragment programs (no
        // paired vertex stage, no varying contract) — carry the emitter's
        // computeFragment host contract (thread group, dispatch-origin
        // uniform, per-output UAV slice routing) so downstream packaging/
        // validation can pair them with a fixed fullscreen-triangle vertex
        // shader and attach the right render-target layers.
        record.computeFragment = result.computeFragment;
      }
      const sourceIssue = validateStageSourceShape(record);
      if (sourceIssue) {
        record.hlsl2webgl = { ok: false, validationError: sourceIssue };
        record.source = null;
      } else {
        await writeFile(glslPath, record.source);
      }
    } catch (error) {
      const message = error?.message || String(error);
      record.hlsl2webgl = { ok: false, error: message, details: error?.details || null };
      if (/not supported|No GLSL lowering|unimplementable/i.test(message)) {
        record.excluded = {
          reason: message,
          ...(error?.details?.opcodeName ? { opcodeName: error.details.opcodeName } : {}),
          ...(error?.details?.dimensionName ? { dimensionName: error.details.dimensionName } : {})
        };
      }
    }
  };

  for (const record of shaderMap.values()) {
    if (record.stageName !== "vertex") {
      await emitInto(record, null);
    }
  }

  const pixelVaryingsByPass = new Map();
  for (const stage of stageMap.values()) {
    if (stage.stageName !== "pixel") continue;
    const record = shaderMap.get(stage.shaderKey);
    if (!record?.emit) continue;
    pixelVaryingsByPass.set(
      `${stage.bodyKey}|${stage.techniqueName}|${stage.passIndex}`,
      record.emit.inputs
        .filter((input) => typeof input.name === "string" && input.name.startsWith("vs_r"))
        .map((input) => input.register)
        .sort((a, b) => a - b)
    );
  }

  const vertexBaseRecords = new Map();
  for (const record of [...shaderMap.values()]) {
    if (record.stageName === "vertex") {
      vertexBaseRecords.set(record.key, record);
      shaderMap.delete(record.key);
    }
  }

  for (const stage of stageMap.values()) {
    if (stage.stageName !== "vertex") continue;
    const base = vertexBaseRecords.get(stage.shaderKey);
    if (!base) continue;
    const varyings = pixelVaryingsByPass.get(`${stage.bodyKey}|${stage.techniqueName}|${stage.passIndex}`) || [];
    const newKey = varyings.length ? `${stage.shaderKey}_pv${varyings.join("-")}` : stage.shaderKey;

    if (!shaderMap.has(newKey)) {
      shaderMap.set(newKey, {
        ...base,
        key: newKey,
        firstStageKey: stage.key,
        firstBodyKey: stage.bodyKey,
        contracts: [],
        pairVaryings: varyings
      });
    }
    const record = shaderMap.get(newKey);
    const contract = base.contracts.find((entry) => entry.stageKey === stage.key);
    if (contract) record.contracts.push(contract);
    stage.shaderKey = newKey;
  }

  for (const record of shaderMap.values()) {
    if (record.stageName === "vertex") {
      await emitInto(record, record.pairVaryings);
    }
  }
}

// The packed local-light GLSL fixups moved to
// src/formats/webgl/core/glsl/packedLightFixups.js and are applied on the shared
// emission path, so every caller gets them rather than only this file's legacy
// diagnostic branch. They were dead here once the light flags routed through the
// library, and a second copy is how the two drift apart.

// The packed local-light debug paints were removed. Ten `--debug-packed-light-*`
// flags painted fragment output magenta, green, yellow and so on to trace the
// tiled-light linked-list traversal while it was being brought up. The lighting
// works and fits the texture budget now, so the scaffolding has served its
// purpose; it was also the only remaining reason most builds reached the legacy
// diagnostic path.

function cloneJson(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

/**
 * Converts a Map keyed by register index to JSON-safe records.
 *
 * @param {Map<number, object>} map Source map.
 * @returns {object[]} Register records.
 */
function mapToJson(map) {
  if (!(map instanceof Map)) return [];
  return Array.from(map.entries()).map(([registerIndex, value]) => ({
    registerIndex,
    ...cloneJson(value)
  }));
}

/**
 * Builds a truthful shader-stage contract from Carbon metadata.
 *
 * This is intentionally independent from GLSL success. A shader that fails
 * HLSLcc still reports the vertex layout, buffers, resources, and packing
 * shape it would require if translated correctly.
 *
 * @param {object} stage Collected stage metadata.
 * @returns {object} Stage contract.
 */
function buildStageContract(stage) {
  const pipelineInputs = cloneJson(stage.pipelineInputs || []);
  const inputSemantics = pipelineInputs.map((input) => ({
    semantic: `${input.usageName || `USAGE_${input.usage}`}${input.usageIndex ? input.usageIndex : ""}`,
    usage: input.usage,
    usageName: input.usageName,
    usageIndex: input.usageIndex,
    registerIndex: input.registerIndex,
    usedMask: input.usedMask,
    type: input.type,
    dimension: input.dimension
  }));

  const inputNames = new Set(inputSemantics.map((input) => input.usageName));
  const hasNormal = inputNames.has("NORMAL");
  const hasTangent = inputNames.has("TANGENT");
  const hasBinormal = inputNames.has("BINORMAL") || inputNames.has("BITANGENT");
  const hasBlendIndices = inputNames.has("BLENDINDICES") || inputNames.has("BLENDINDICE");

  let tangentContract = "none";
  if (hasNormal && hasTangent && hasBinormal) {
    tangentContract = "split_tbn";
  } else if (!hasNormal && hasTangent) {
    tangentContract = "packed_tangent_or_tangent_only";
  } else if (hasNormal || hasTangent || hasBinormal) {
    tangentContract = "partial_tbn";
  }

  const resources = cloneJson(stage.resources || []);
  const samplers = cloneJson(stage.samplers || []);
  const uavs = cloneJson(stage.uavs || []);
  const constants = cloneJson(stage.constants || []);
  const resourceNames = resources.map((entry) => entry.name).filter(Boolean);

  return {
    stageName: stage.stageName,
    stageType: stage.stageType,
    vertex: stage.stageName === "vertex" ? {
      inputs: inputSemantics,
      tangentContract,
      requiresSplitTbn: tangentContract === "split_tbn",
      requiresPackedTangent: tangentContract === "packed_tangent_or_tangent_only",
      requiresSkinning: hasBlendIndices || resourceNames.includes("BoneTransforms"),
      hasBlendIndices
    } : null,
    texturePacking: classifyTexturePacking(resourceNames),
    constantBuffers: (stage.registers || [])
      .filter((entry) => entry.registerType === 0)
      .map((entry) => ({
        registerIndex: entry.registerIndex,
        registerSpace: entry.registerSpace,
        registerCount: entry.registerCount,
        arrayCount: entry.arrayCount,
        dynamic: Boolean(entry.dynamic)
      })),
    resources,
    samplers,
    uavs,
    constants
  };
}

/**
 * Classifies texture naming convention for a stage.
 *
 * @param {string[]} names Resource names.
 * @returns {string} Texture packing classification.
 */
function classifyTexturePacking(names) {
  const set = new Set(names);
  if (set.has("NoMap") || set.has("PmdgMap") || set.has("ArMap")) return "packed_textures";
  if (
    set.has("NormalMap") ||
    set.has("RoughnessMap") ||
    set.has("MaterialMap") ||
    set.has("AlbedoMap") ||
    set.has("AoMap") ||
    set.has("PaintMaskMap")
  ) {
    return "unpacked_textures";
  }
  return "unknown";
}

/**
 * Merges per-stage contracts for a shared shader bytecode record.
 *
 * @param {object[]} contracts Stage contract records.
 * @returns {object|null} Primary shader contract summary.
 */
function mergeShaderContracts(contracts) {
  if (!contracts?.length) return null;
  const first = contracts[0]?.contract || null;
  if (!first) return null;
  return {
    stageName: first.stageName,
    stageType: first.stageType,
    vertex: first.vertex ? cloneJson(first.vertex) : null,
    texturePacking: first.texturePacking,
    constantBuffers: cloneJson(first.constantBuffers || []),
    resourceNames: (first.resources || []).map((entry) => entry.name).filter(Boolean),
    samplerNames: (first.samplers || []).map((entry) => entry.name).filter(Boolean),
    sharedByStageCount: contracts.length
  };
}

/**
 * Applies WebGL2 runtime ABI normalizations to translated GLSL.
 *
 * @param {string} source HLSLcc GLSL source.
 * @param {object} shaderRecord CEWG shader record.
 * @returns {string} Normalized WebGL2 source.
 */
function normalizeWebgl2StageSource(source, shaderRecord) {
  let out = lowerWebgl2SkinningAbi(source);
  out = normalizeBitangentInputAlias(out, shaderRecord);
  return out;
}

/**
 * Normalizes HLSLcc's BINORMAL spelling to Carbon metadata's BITANGENT.
 *
 * Carbon/Trinity metadata reports the split-TBN input as BITANGENT, while
 * HLSLcc can emit the GLSL symbol as in_BINORMALn. Runtime adapters commonly
 * map vertex inputs from metadata, so leaving the alias in GLSL creates an
 * unbound attribute.
 *
 * @param {string} source GLSL source.
 * @param {object} shaderRecord CEWG shader record.
 * @returns {string} Source with BINORMAL input aliases rewritten.
 */
function normalizeBitangentInputAlias(source, shaderRecord) {
  if (shaderRecord?.stageName !== "vertex") return source;

  const hasBitangentMetadata = (shaderRecord.contracts || []).some((entry) =>
    (entry.contract?.vertex?.inputs || []).some((input) => input.usageName === "BITANGENT")
  );
  if (!hasBitangentMetadata || !source.includes("in_BINORMAL")) return source;

  return source.replace(/\bin_BINORMAL(\d+)\b/g, "in_BITANGENT$1");
}

/**
 * Catches impossible stage/source pairings before packaging.
 *
 * @param {object} shaderRecord CEWG shader record.
 * @returns {string|null} Validation message, or null.
 */
function validateStageSourceShape(shaderRecord) {
  const source = shaderRecord?.source || "";
  if (!source) return null;

  const hasVertexOutput = /\bgl_Position\b/.test(source);
  const hasVertexInterface = /\bin\s+(?:lowp|mediump|highp)?\s*\w+\s+attr\d+\b/.test(source) ||
    /\bout\s+(?:lowp|mediump|highp)?\s*\w+\s+vs_TEXCOORD\d+\b/.test(source) ||
    /\bin_[A-Z]+[0-9]+\b/.test(source);
  const hasFragmentOutput = /\bout\s+(?:lowp|mediump|highp)?\s*vec4\s+SV_Target\d+\b/.test(source) ||
    /\bgl_FragColor\b/.test(source);

  if (shaderRecord.stageName === "vertex" && !hasVertexOutput) {
    return "vertex stage source does not write gl_Position";
  }

  if (shaderRecord.stageName === "pixel" && (hasVertexOutput || hasVertexInterface) && !hasFragmentOutput) {
    return "pixel stage source looks like vertex GLSL";
  }

  if (shaderRecord.stageName === "compute" && !/\bcewgUav\d+(_s\d+)?\b/.test(source)) {
    return "compute stage source does not write any cewgUav output";
  }

  return null;
}

/**
 * Lowers Carbon's DX11 BoneTransforms structured resource to the current WebGL
 * uniform ABI, where the per-object cb3 buffer appends JointMat at cb3[26..199].
 *
 * @param {string} source HLSLcc GLSL source.
 * @returns {string} WebGL2-compatible GLSL source.
 */
function lowerWebgl2SkinningAbi(source) {
  if (!source.includes("readonly buffer t0") || !source.includes("t0_buf[")) {
    return source;
  }

  let out = source;
  out = out.replace(/#ifdef GL_ARB_shader_storage_buffer_object\s*\n#extension GL_ARB_shader_storage_buffer_object : enable\s*\n#endif\s*\n/g, "");
  out = out.replace(/#ifdef GL_ARB_shader_image_load_store\s*\n#extension GL_ARB_shader_image_load_store : enable\s*\n#endif\s*\n/g, "");
  out = out.replace(/\s*struct\s+t0_type\s*\{\s*uint\s*\[\s*1\s*\]\s+value\s*;\s*\};\s*/g, "\n");
  out = out.replace(/\s*layout\s*\(\s*std430\s*,\s*binding\s*=\s*0\s*\)\s*readonly\s+buffer\s+t0\s*\{\s*t0_type\s+t0_buf\s*\[\s*\]\s*;\s*\};\s*/g, "\n");
  out = out.replace(
    /layout\s*\(\s*std140\s*\)\s*uniform\s+ConstantBuffer3\s*\{\s*vec4\s+data\s*\[\s*(\d+)\s*\]\s*;\s*\}\s*cb3\s*;/g,
    (match, size) => `layout(std140) uniform ConstantBuffer3 {\n\tvec4 data[${Math.max(Number(size), 200)}];\n} cb3;`
  );
  out = out.replace(
    /\bin\s+(?:(lowp|mediump|highp)\s+)?(?:uvec|ivec)([234])\s+(in_BLENDINDICES\d+)\s*;/g,
    (match, precision = "highp", size, name) => `in ${precision} vec${size} ${name};`
  );

  out = out.replace(
    /(\w+)\s*=\s*int\s*\(\s*in_BLENDINDICES0\.x\s*\)\s*\+\s*floatBitsToInt\s*\(\s*cb3\.data\s*\[\s*26\s*\]\.x\s*\)\s*;/g,
    "$1 = int(in_BLENDINDICES0.x);"
  );
  out = out.replace(
    /(\w+(?:\.[xyzw]{1,4})?)\s*=\s*((?:i?vec\d|uvec\d)\s*\(\s*in_BLENDINDICES0\.[xyzw]{1,4}\s*\))\s*\+\s*floatBitsToInt\s*\(\s*cb3\.data\s*\[\s*26\s*\]\.[xyzw]{1,4}\s*\)\s*;/g,
    "$1 = $2;"
  );

  out = out.replace(
    /vec4\s*\(([^;\n]*t0_buf[^;\n]*)\)/g,
    (match, body) => lowerStructuredBoneLoad(match, body)
  );

  if (out !== source) {
    out = out.replace("#version 300 es\n", "#version 300 es\n// CEWG: BoneTransforms lowered to cb3 JointMat rows.\n");
  }

  return out;
}

/**
 * Lowers one HLSLcc t0 structured-buffer vec4 row load.
 *
 * @param {string} match Full matched expression.
 * @param {string} body Matched vec4 body.
 * @returns {string} Replacement expression.
 */
function lowerStructuredBoneLoad(match, body) {
  const loads = [];
  const componentRegex = /t0_buf\s*\[\s*([^\]]+)\s*\]\.value\s*\[\s*\(\s*(\d+)\s*>>\s*2\s*\)\s*\+\s*(\d+)\s*\]/g;
  let componentMatch;

  while ((componentMatch = componentRegex.exec(body))) {
    loads.push({
      indexExpr: componentMatch[1],
      byteOffset: Number(componentMatch[2]),
      component: Number(componentMatch[3])
    });
  }

  if (loads.length !== 4) return match;

  const indexExpr = loads[0].indexExpr;
  const byteOffset = loads[0].byteOffset;
  if (!loads.every((load) => load.indexExpr === indexExpr && load.byteOffset === byteOffset)) {
    return match;
  }

  const row = Math.floor(byteOffset / 16);
  if (row < 0 || row > 2) return match;

  const swizzle = loads.map((load) => "xyzw"[load.component]).join("");
  if (swizzle.length !== 4 || swizzle.includes("undefined")) return match;

  const rowExpr = `cb3.data[26 + (${indexExpr.trim()}) * 3 + ${row}]`;
  return swizzle === "xyzw" ? rowExpr : `${rowExpr}.${swizzle}`;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
