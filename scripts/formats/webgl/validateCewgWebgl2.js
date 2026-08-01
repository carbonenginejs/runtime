import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readGlslEffectContainer } from "../../../src/formats/webgl/core/readGlslEffectContainer.js";
import { inspectGlslEffectContainer } from "../../../src/formats/webgl/core/inspectGlslEffectContainer.js";
import {
  isCewgComputeFragmentContract,
  inspectGlslContainerIntegrity,
  inspectCewgRasterCompleteness
} from "./cewgCompleteness.js";
import { writeFileAtomic } from "./atomicWrite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const defaultPackage = path.join(projectRoot, "artifacts", "quadv5.webgl.cewg");
const defaultOutput = path.join(projectRoot, "artifacts", "quadv5.webgl.validation.json");
const defaultMarkdown = path.join(projectRoot, "artifacts", "quadv5.webgl.validation.md");

/**
 * Fixed fullscreen-triangle vertex shader paired with every map-style
 * "compute-as-fragment" program (shader records with a `computeFragment`
 * host contract)
 * for compile/link validation — these shaders have no real vertex stage.
 */
const COMPUTE_FRAGMENT_VERTEX_SOURCE = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

/**
 * Parses command-line arguments.
 *
 * @param {string[]} argv Command-line arguments.
 * @returns {object} Parsed options.
 */
function parseArgs(argv) {
  const args = {
    input: defaultPackage,
    output: defaultOutput,
    markdown: defaultMarkdown,
    keepBrowserOpen: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out" && argv[i + 1]) args.output = path.resolve(argv[++i]);
    else if (arg === "--md" && argv[i + 1]) args.markdown = path.resolve(argv[++i]);
    else if (arg === "--keep-browser-open") args.keepBrowserOpen = true;
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
    "Usage: node scripts/validateCewgWebgl2.js [package.cewg] [options]",
    "",
    "Options:",
    "  --out <path>              Output JSON path.",
    "  --md <path>               Output markdown summary path.",
    "  --keep-browser-open       Keep Chromium open after validation."
  ].join("\n"));
}

/**
 * Loads Playwright with a clearer setup error.
 *
 * @returns {Promise<object>} Playwright module.
 */
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    error.message = [
      "Playwright is required for real WebGL2 validation.",
      "Install it with: npm.cmd install --save-dev playwright",
      "Then install a browser with: npm.cmd exec playwright install chromium",
      "",
      error.message
    ].join("\n");
    throw error;
  }
}

/**
 * Builds linkable vertex/pixel program records from a decoded container.
 *
 * @param {{stages:object[], shaders:object[]}} decoded Decoded container graph.
 * @returns {object[]} Program records.
 */
function packagePrograms(decoded) {
  return [...allPermutationPrograms(decoded), ...computeFragmentPrograms(decoded)];
}

/**
 * Builds standalone programs for map-style compute-as-fragment shaders
 * (with a valid `computeFragment` host contract), pairing each with the fixed fullscreen-triangle
 * vertex shader since they have no real paired vertex stage.
 *
 * @param {object} glsl GLSL stage set.
 * @returns {object[]} Program records.
 */
function computeFragmentPrograms(glsl) {
  const programs = [];
  const shaderMap = new Map(glsl.shaders.map((shader) => [shader.key, shader]));

  for (const stage of glsl.stages || []) {
    if (stage.stageName !== "compute") continue;
    const shader = shaderMap.get(stage.shaderKey);
    if (!isCewgComputeFragmentContract(shader?.computeFragment)
      || !shader?.hlsl2webgl?.ok
      || !shader.source) continue;
    programs.push({
      programKind: "compute-fragment",
      bodyKey: stage.bodyKey,
      techniqueName: stage.techniqueName,
      passIndex: stage.passIndex,
      vertexStageKey: "cewg_fixed_vs",
      pixelStageKey: stage.key,
      vertexShaderKey: "cewg_fixed_vs",
      pixelShaderKey: stage.shaderKey,
      vertexSource: COMPUTE_FRAGMENT_VERTEX_SOURCE,
      pixelSource: shader.source,
      vertexInputs: [],
      computeFragment: shader.computeFragment
    });
  }

  return programs;
}

/**
 * Builds programs from the all-permutation CEWG graph.
 *
 * @param {object} glsl GLSL stage set.
 * @returns {object[]} Program records.
 */
function allPermutationPrograms(glsl) {
  const shaderMap = new Map(glsl.shaders.map((shader) => [shader.key, shader]));
  const groups = new Map();

  for (const stage of glsl.stages || []) {
    const shader = shaderMap.get(stage.shaderKey);
    if (!shader?.hlsl2webgl?.ok || !shader.source) continue;

    const key = `${stage.bodyKey} ${stage.techniqueName} ${stage.passIndex}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        bodyKey: stage.bodyKey,
        techniqueName: stage.techniqueName,
        passIndex: stage.passIndex,
        stages: {}
      };
      groups.set(key, group);
    }
    group.stages[stage.stageName] = {
      stageKey: stage.key,
      shaderKey: stage.shaderKey,
      source: shader.source,
      stageInputs: shader.stageInputs || []
    };
  }

  return Array.from(groups.values())
    .filter((entry) => entry.stages.vertex && entry.stages.pixel)
    .map((entry) => ({
      programKind: "raster",
      bodyKey: entry.bodyKey,
      techniqueName: entry.techniqueName,
      passIndex: entry.passIndex,
      vertexStageKey: entry.stages.vertex.stageKey,
      pixelStageKey: entry.stages.pixel.stageKey,
      vertexShaderKey: entry.stages.vertex.shaderKey,
      pixelShaderKey: entry.stages.pixel.shaderKey,
      vertexSource: entry.stages.vertex.source,
      pixelSource: entry.stages.pixel.source,
      vertexInputs: entry.stages.vertex.stageInputs,
      computeFragment: null
    }));
}

/**
 * Runs WebGL2 compile/link validation in Chromium.
 *
 * @param {object} playwright Playwright module.
 * @param {object[]} programs Program payloads.
 * @param {boolean} keepBrowserOpen Whether to keep Chromium open.
 * @returns {Promise<object>} Validation result.
 */
async function validateInBrowser(playwright, programs, keepBrowserOpen) {
  const browser = await playwright.chromium.launch({ headless: !keepBrowserOpen });
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><canvas id=\"c\" width=\"8\" height=\"8\"></canvas>");
    return await page.evaluate((payload) => {
      const canvas = document.getElementById("c");
      const gl = canvas.getContext("webgl2");
      if (!gl) {
        return {
          webgl2Available: false,
          renderer: null,
          capabilities: null,
          programs: payload.map((program) => ({
            ...program,
            status: "webgl2_unavailable",
            vertex: null,
            pixel: null,
            link: null,
            activeAttributes: [],
            activeUniforms: [],
            activeUniformBlocks: []
          }))
        };
      }

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = debugInfo ? {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      } : {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER)
      };
      const capabilities = {
        maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
        maxColorAttachments: gl.getParameter(gl.MAX_COLOR_ATTACHMENTS)
      };

      function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return {
          shader,
          ok: gl.getShaderParameter(shader, gl.COMPILE_STATUS),
          log: gl.getShaderInfoLog(shader) || ""
        };
      }

      function activeAttributes(program) {
        const count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        const out = [];
        for (let i = 0; i < count; i += 1) {
          const info = gl.getActiveAttrib(program, i);
          out.push({
            name: info.name,
            size: info.size,
            type: info.type,
            location: gl.getAttribLocation(program, info.name)
          });
        }
        return out;
      }

      function activeUniforms(program) {
        const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        const out = [];
        for (let i = 0; i < count; i += 1) {
          const info = gl.getActiveUniform(program, i);
          out.push({
            name: info.name,
            size: info.size,
            type: info.type,
            location: gl.getUniformLocation(program, info.name) ? "active" : null
          });
        }
        return out;
      }

      function activeUniformBlocks(program) {
        const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);
        const out = [];
        for (let i = 0; i < count; i += 1) {
          out.push({
            name: gl.getActiveUniformBlockName(program, i),
            dataSize: gl.getActiveUniformBlockParameter(program, i, gl.UNIFORM_BLOCK_DATA_SIZE),
            activeUniformIndices: Array.from(gl.getActiveUniformBlockParameter(program, i, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES) || [])
          });
        }
        return out;
      }

      const results = [];
      for (const input of payload) {
        const vertex = compile(gl.VERTEX_SHADER, input.vertexSource);
        const pixel = compile(gl.FRAGMENT_SHADER, input.pixelSource);
        const program = gl.createProgram();
        if (vertex.shader) gl.attachShader(program, vertex.shader);
        if (pixel.shader) gl.attachShader(program, pixel.shader);
        gl.linkProgram(program);
        const linkOk = gl.getProgramParameter(program, gl.LINK_STATUS);
        const attributes = linkOk ? activeAttributes(program) : [];
        const expectedAttributeNames = (input.vertexInputs || []).map((entry) => entry.name);
        const activeAttributeNames = new Set(attributes.map((entry) => entry.name));
        const missingAttributes = expectedAttributeNames.filter((name) => !activeAttributeNames.has(name));
        const attributeContract = {
          ok: missingAttributes.length === 0,
          expectedNames: expectedAttributeNames,
          missingNames: missingAttributes
        };
        const outputLimit = Math.min(capabilities.maxDrawBuffers, capabilities.maxColorAttachments);
        const computeOutputs = input.computeFragment?.uavOutputs || [];
        const invalidComputeOutputs = computeOutputs.filter((output) => output.location >= outputLimit);
        const computeContract = {
          ok: invalidComputeOutputs.length === 0,
          outputLimit,
          invalidOutputs: invalidComputeOutputs
        };

        results.push({
          programKind: input.programKind,
          bodyKey: input.bodyKey,
          techniqueName: input.techniqueName,
          passIndex: input.passIndex,
          vertexStageKey: input.vertexStageKey,
          pixelStageKey: input.pixelStageKey,
          vertexShaderKey: input.vertexShaderKey,
          pixelShaderKey: input.pixelShaderKey,
          status: vertex.ok && pixel.ok && linkOk && attributeContract.ok && computeContract.ok ? "passed" : "failed",
          vertex: { ok: vertex.ok, log: vertex.log },
          pixel: { ok: pixel.ok, log: pixel.log },
          link: {
            ok: linkOk,
            log: gl.getProgramInfoLog(program) || ""
          },
          attributeContract,
          computeContract,
          activeAttributes: attributes,
          activeUniforms: linkOk ? activeUniforms(program) : [],
          activeUniformBlocks: linkOk ? activeUniformBlocks(program) : []
        });

        gl.deleteProgram(program);
        if (vertex.shader) gl.deleteShader(vertex.shader);
        if (pixel.shader) gl.deleteShader(pixel.shader);
      }

      return {
        webgl2Available: true,
        renderer,
        capabilities,
        programs: results
      };
    }, programs);
  } finally {
    if (!keepBrowserOpen) await browser.close();
  }
}

/**
 * Creates a markdown validation summary.
 *
 * @param {object} report Validation report.
 * @returns {string} Markdown text.
 */
function markdownReport(report) {
  const lines = [
    "# CEWG WebGL2 Validation",
    "",
    `- Package: \`${report.packagePath}\``,
    `- Container: ${report.container.recordCount} record(s) over `
      + `${report.container.uniqueBodyCount} body(ies)`,
    `- WebGL2 available: ${report.webgl2Available ? "yes" : "no"}`,
    `- Programs: ${report.programCount}`,
    `- Passed: ${report.passedProgramCount}`,
    `- Failed: ${report.failedProgramCount}`,
    `- Expected raster passes: ${report.expectedRasterPassCount}`,
    `- Complete raster passes: ${report.completeRasterPassCount}`,
    `- Incomplete raster passes: ${report.incompleteRasterPassCount}`,
    `- Package integrity errors: ${report.integrityErrorCount}`
  ];

  if (report.renderer) {
    lines.push(`- Renderer: ${report.renderer.vendor || "unknown"} / ${report.renderer.renderer || "unknown"}`);
  }
  if (report.capabilities) {
    lines.push(
      `- Draw buffers / color attachments: ${report.capabilities.maxDrawBuffers} / ` +
        `${report.capabilities.maxColorAttachments}`
    );
  }

  const failures = report.programs.filter((program) => program.status !== "passed");
  if (failures.length) {
    lines.push("", "## Failures");
    for (const program of failures.slice(0, 50)) {
      lines.push(
        "",
        `### ${program.bodyKey} ${program.techniqueName} pass ${program.passIndex}`,
        "",
        `- Vertex: ${program.vertex?.ok ? "ok" : "failed"} \`${program.vertexShaderKey}\``,
        `- Pixel: ${program.pixel?.ok ? "ok" : "failed"} \`${program.pixelShaderKey}\``,
        `- Link: ${program.link?.ok ? "ok" : "failed"}`,
        `- Vertex attribute contract: ${program.attributeContract?.ok ? "ok" : "failed"}`,
        `- Compute output contract: ${program.computeContract?.ok ? "ok" : "failed"}`
      );
      if (program.attributeContract?.missingNames?.length) {
        lines.push(`- Missing active attributes: ${program.attributeContract.missingNames.join(", ")}`);
      }
      if (program.computeContract?.invalidOutputs?.length) {
        lines.push(
          `- Compute outputs beyond WebGL2 limit ${program.computeContract.outputLimit}: ` +
            program.computeContract.invalidOutputs.map((output) => output.glslName).join(", ")
        );
      }
      if (program.vertex?.log) lines.push(`- Vertex log: ${program.vertex.log.replace(/\s+/g, " ").trim()}`);
      if (program.pixel?.log) lines.push(`- Pixel log: ${program.pixel.log.replace(/\s+/g, " ").trim()}`);
      if (program.link?.log) lines.push(`- Link log: ${program.link.log.replace(/\s+/g, " ").trim()}`);
    }
  }

  if (report.incompletePasses.length) {
    lines.push("", "## Incomplete raster passes");
    for (const pass of report.incompletePasses.slice(0, 50)) {
      const missing = pass.missingStages.length ? pass.missingStages.join(", ") : "none";
      const unavailable = pass.unavailableStages.length
        ? pass.unavailableStages.map((stage) => `${stage.stageName}: ${stage.reason}`).join("; ")
        : "none";
      const duplicates = pass.duplicateStages?.length ? pass.duplicateStages.join(", ") : "none";
      lines.push(
        "",
        `### ${pass.bodyKey} ${pass.techniqueName} pass ${pass.passIndex}`,
        "",
        `- Missing stages: ${missing}`,
        `- Unavailable stages: ${unavailable}`,
        `- Duplicate stages: ${duplicates}`
      );
    }
  }

  if (report.integrityErrors.length) {
    lines.push("", "## Package integrity errors");
    for (const error of report.integrityErrors.slice(0, 50)) {
      lines.push("", `- \`${error.code}\`: ${error.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

/**
 * Main CLI entry point.
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packagePath = path.resolve(args.input);
  assertDistinctOutputPaths(packagePath, args.output, args.markdown);
  const packageBytes = await readFile(packagePath);
  // The package is container bytes. There is no chunk-cardinality check to run
  // first: the reader refuses to construct on a malformed container at all,
  // which is what `inspectCewgCoreChunks` was approximating by counting tags.
  const decoded = readGlslEffectContainer(packageBytes, { source: packagePath });
  const summary = inspectGlslEffectContainer(packageBytes, { source: packagePath });

  const programs = packagePrograms(decoded);
  const completeness = inspectCewgRasterCompleteness(decoded.stages, decoded.shaders);
  const integrity = inspectGlslContainerIntegrity(decoded);
  const playwright = await loadPlaywright();
  const validation = await validateInBrowser(playwright, programs, args.keepBrowserOpen);

  const report = {
    generatedAt: new Date().toISOString(),
    packagePath: path.relative(projectRoot, packagePath),
    container: summary,
    webgl2Available: validation.webgl2Available,
    renderer: validation.renderer,
    capabilities: validation.capabilities,
    programCount: validation.programs.length,
    passedProgramCount: validation.programs.filter((entry) => entry.status === "passed").length,
    failedProgramCount: validation.programs.filter((entry) => entry.status !== "passed").length,
    expectedRasterPassCount: completeness.expectedPassCount,
    completeRasterPassCount: completeness.completePassCount,
    incompleteRasterPassCount: completeness.incompletePasses.length,
    incompletePasses: completeness.incompletePasses,
    integrityErrorCount: integrity.errors.length,
    integrityErrors: integrity.errors,
    programs: validation.programs
  };

  await mkdir(path.dirname(args.output), { recursive: true });
  await mkdir(path.dirname(args.markdown), { recursive: true });
  await writeFileAtomic(args.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFileAtomic(args.markdown, markdownReport(report), "utf8");

  console.log(JSON.stringify({
    output: path.relative(projectRoot, args.output),
    markdown: path.relative(projectRoot, args.markdown),
    recordCount: report.container.recordCount,
    uniqueBodyCount: report.container.uniqueBodyCount,
    programCount: report.programCount,
    passedProgramCount: report.passedProgramCount,
    failedProgramCount: report.failedProgramCount,
    expectedRasterPassCount: report.expectedRasterPassCount,
    completeRasterPassCount: report.completeRasterPassCount,
    incompleteRasterPassCount: report.incompleteRasterPassCount,
    integrityErrorCount: report.integrityErrorCount
  }, null, 2));

  if (!report.webgl2Available
    || report.programCount === 0
    || report.failedProgramCount > 0
    || report.incompleteRasterPassCount > 0
    || report.integrityErrorCount > 0) {
    process.exitCode = 1;
  }
}

function assertDistinctOutputPaths(packagePath, outputPath, markdownPath) {
  const normalize = (value) => {
    const resolved = path.resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  const entries = [
    ["package", normalize(packagePath)],
    ["JSON report", normalize(outputPath)],
    ["Markdown report", normalize(markdownPath)]
  ];
  const seen = new Map();
  for (const [label, value] of entries) {
    if (seen.has(value)) {
      throw new Error(`${label} path collides with ${seen.get(value)} path: ${value}`);
    }
    seen.set(value, label);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
