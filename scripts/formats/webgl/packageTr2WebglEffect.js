import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

// One deep import rather than an index re-export: this is a build script, so it
// may reach package internals, and widening the public surface to satisfy a
// tool would be the wrong trade.
import { CjsWebglFormat } from "../../../src/formats/webgl/index.js";
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

/**
 * Flags that only ever fed the removed native comparison harness.
 *
 * They are still parsed so that passing one produces an explanation instead of
 * "unknown argument" — a stale script or note that uses them should be told what
 * happened, not just that the flag is gone.
 */
const REMOVED_NATIVE_FLAGS = Object.freeze([ "--native", "--tool", "--lang", "--flags", "--work-dir" ]);

/**
 * Flags that only meant something while the output was a chunk package.
 *
 * `--include-source-effect` appended the original Tr2 bytes as a `TR2E` chunk.
 * A Carbon container has no chunk to append them to, and inventing a place to
 * hide them would make our files stop being stock Carbon files. Reported rather
 * than silently accepted: a flag that runs and does nothing is worse than one
 * that stops you.
 */
const REMOVED_CHUNK_FLAGS = Object.freeze([ "--include-source-effect" ]);

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
    sourceGame: null,
    sourceClient: null,
    sourceBuild: null,
    sourceLogicalPath: null,
    technique: null,
    pass: null,
    stage: null,
    removedChunkFlags: [],
    overwrite: false,
    allowFailures: false,
    allPermutations: true,
    // Removed-harness flags seen on the command line, reported together.
    removedNativeFlags: [],
    // How the shared packager lowers a recognised local-light family. The two
    // lowering flags below set this and no longer force the legacy path; the
    // library owns the recognition and the profile constants.
    localLights: "none"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out" && argv[i + 1]) args.output = path.resolve(argv[++i]);
    else if (REMOVED_NATIVE_FLAGS.includes(arg)) {
      args.removedNativeFlags.push(arg);
      // --native took no value; the rest did. Swallow it so it is not mistaken
      // for the input path.
      if (arg !== "--native" && argv[i + 1] && !argv[i + 1].startsWith("--")) i += 1;
    }
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
    else if (REMOVED_CHUNK_FLAGS.includes(arg)) args.removedChunkFlags.push(arg);
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
    "  --source-game <name>      Source game identity (for example Frontier).",
    "  --source-client <name>    Source client identity (for example stillness).",
    "  --source-build <id>       Immutable source build identity.",
    "  --source-logical-path <p> Original res:/ shader path.",
    "  --technique <name>        Restrict to one technique.",
    "  --pass <index>            Restrict to one pass index.",
    "  --stage <name>            Restrict to one stage name.",
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
 * Main CLI entry point.
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);
  // The native hlsl2webgl path is gone. It ran a second DXBC-to-GLSL
  // implementation to compare against the JS emitter, and its executable was
  // never part of this repository, so it could not succeed here. The .cewg
  // baselines and the corpus tests serve that role without needing a Windows
  // binary to exist.
  if (args.removedNativeFlags.length)
  {
    throw new Error(
      `${args.removedNativeFlags.join(", ")} selected the native hlsl2webgl comparison `
      + "harness, which has been removed. Drop them to package with the JS emitter."
    );
  }

  if (args.removedChunkFlags.length)
  {
    throw new Error(
      `${args.removedChunkFlags.join(", ")} appended extra chunks to the old chunk `
      + "package. The output is a Carbon container, which has no chunk to append to. "
      + "Drop them; the source effect is not carried in the output."
    );
  }

  if (sameFilePath(inputPath, outputPath)) {
    throw new Error("CEWG output must not overwrite the source effect file");
  }

  if (!args.overwrite && await pathExists(outputPath)) {
    throw new Error(`CEWG output already exists; pass --overwrite to replace it: ${outputPath}`);
  }

  const sourceBytes = await readFile(inputPath);
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
}

/**
 * Tests whether two paths name the same file, case-insensitively on Windows.
 */
function sameFilePath(left, right) {
  const normalize = (value) => process.platform === "win32" ? value.toLowerCase() : value;
  return normalize(path.resolve(left)) === normalize(path.resolve(right));
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

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
