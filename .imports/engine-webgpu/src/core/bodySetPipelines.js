import { CjsWebgpuPackage } from "../CjsWebgpuPackage.js";

/**
 * Realize every translated body of an all-body package as pipeline
 * descriptors, cached by translation-unit identity.
 *
 * Descriptors are built directly from `unit.shaders` and `unit.layouts[0]`,
 * never through the ANLS-driven stage list. That list names the selected body
 * only, and its `(techniqueName, passIndex, stageName)` match has no body
 * discriminator - in a real all-body package `Main.pass0.vertex` names 120
 * distinct units at once, so a flat lookup is genuinely ambiguous rather than
 * merely awkward. Feeding one unit at a time through the existing canonical
 * path sidesteps that structurally and reuses the layout algebra unchanged.
 *
 * `unit.layouts` being exactly one element matches the engine's existing
 * single-canonical-layout rule for free.
 *
 * The output is the same `CJS_WEBGPU_PREPARE_MATRIX` document the permutation
 * matrix already produces, so the browser gate prepares it with no new browser
 * code. Nothing here names a WebGPU type.
 */

const RENDER_STAGE_NAMES = Object.freeze([ "vertex", "pixel" ]);

function fail(message)
{
  throw new Error(`CJS WebGPU body set: ${message}`);
}

function passKindOf(shaders, label)
{
  const stageNames = new Set(shaders.map((shader) => shader?.stageName));
  if (stageNames.size === 1 && stageNames.has("compute")) return "compute";
  if (stageNames.size === RENDER_STAGE_NAMES.length
    && RENDER_STAGE_NAMES.every((stageName) => stageNames.has(stageName)))
  {
    return "render";
  }
  fail(`${label} does not reference exactly compute or vertex+pixel`);
}

function unitAnalysis(pass, shaders)
{
  const [ techniqueName, passPart ] = splitPassKey(pass.passKey);
  const passIndex = Number.parseInt(passPart, 10);
  return {
    passes: [ { techniqueName, passIndex, renderStates: 0, states: [] } ],
    stages: shaders.map((shader) => ({
      key: shader.key,
      techniqueName,
      passIndex,
      stageName: shader.stageName,
      stageType: shader.stageType,
      ...(shader.threadGroupSize ? { threadGroupSize: shader.threadGroupSize } : {}),
      bindings: []
    }))
  };
}

function splitPassKey(passKey)
{
  const match = /^(?<technique>.+)\.pass(?<index>\d+)$/u.exec(String(passKey ?? ""));
  if (!match) fail(`pass key ${passKey || "<empty>"} is not <technique>.pass<index>`);
  return [ match.groups.technique, match.groups.index ];
}

function shaderModuleKey(shader)
{
  return `${shader.stage}\u0000${shader.entryPoint}\u0000`
    + `${JSON.stringify(shader.threadGroupSize ?? null)}\u0000${shader.code}`;
}

/**
 * Build deduplicated prepare records for every translated body of a package.
 *
 * @param {CjsWebgpuPackage} pkg Package carrying a backend body source.
 * @param {object} [options] Coverage options.
 * @param {number} [options.permutationCount] Permutation indices to resolve.
 * @returns {object} Prepare document plus body-set coverage.
 */
export function buildBodySetPipelines(pkg, options = {})
{
  const source = pkg?.backendBodySource;
  if (!source) fail("package carries no backend body set");

  const permutationCount = Number.isInteger(options.permutationCount)
    ? options.permutationCount
    : source.permutationCount;
  if (!Number.isInteger(permutationCount) || permutationCount < 1)
  {
    fail("package declares no permutation count");
  }

  // Keyed by unit sha256, never by unit.key: the key is a per-package ordinal
  // and collides across packages.
  const unitsBySha = new Map();
  const shaderModules = new Map();
  const bodyKeys = new Set();
  const unsupportedBodies = new Map();
  const sharingByPassKey = new Map();
  let uniqueRenderPipelines = 0;
  let uniqueComputePipelines = 0;
  let coveredOccurrences = 0;
  let coveredShaderOccurrences = 0;

  for (let permutationIndex = 0; permutationIndex < permutationCount; permutationIndex += 1)
  {
    const body = source.ResolveBody(permutationIndex);
    bodyKeys.add(body.bodyKey);

    // An unsupported body is a result, not a crash and not a silent skip.
    if (body.status !== "translated")
    {
      if (!unsupportedBodies.has(body.bodyKey))
      {
        unsupportedBodies.set(body.bodyKey, {
          bodyKey: body.bodyKey,
          status: body.status,
          error: body.error,
          permutationCount: 0
        });
      }
      unsupportedBodies.get(body.bodyKey).permutationCount += 1;
      continue;
    }

    for (const pass of body.passes)
    {
      coveredOccurrences += 1;
      if (!sharingByPassKey.has(pass.passKey))
      {
        sharingByPassKey.set(pass.passKey, { permutationPasses: 0, bodies: new Set(), units: new Set() });
      }
      const sharing = sharingByPassKey.get(pass.passKey);
      sharing.permutationPasses += 1;
      sharing.bodies.add(body.bodyKey);
      sharing.units.add(pass.sha256);

      const cached = unitsBySha.get(pass.sha256);
      if (cached)
      {
        cached.occurrences += 1;
        cached.bodyKeys.add(body.bodyKey);
        coveredShaderOccurrences += cached.pipeline.shaderModules.length;
        continue;
      }

      if (!Array.isArray(pass.layouts) || pass.layouts.length !== 1)
      {
        fail(`${pass.passKey} unit ${pass.unitKey} must carry exactly one canonical layout`);
      }
      const shaders = Array.isArray(pass.shaders) ? pass.shaders : [];
      if (!shaders.length) fail(`${pass.passKey} unit ${pass.unitKey} carries no WGSL`);
      const pipelineKind = passKindOf(shaders, `${pass.passKey} unit ${pass.unitKey}`);

      // Never reassign the producer's group/binding: the emitted WGSL
      // references them by number.
      const unitPackage = CjsWebgpuPackage.from({
        sourcePath: `${source.sourcePath}#${pass.unitKey}`,
        analysis: unitAnalysis(pass, shaders),
        wgsl: {
          format: "CJS_WGSL_SET",
          formatVersion: pass.wgslSetVersion,
          shaders,
          layouts: pass.layouts
        }
      });
      const [ techniqueName, passPart ] = splitPassKey(pass.passKey);
      const pipeline = unitPackage.GetPipeline(techniqueName, Number.parseInt(passPart, 10));
      if (!pipeline?.HasCompleteWgsl())
      {
        fail(`${pass.passKey} unit ${pass.unitKey} did not produce a complete engine pipeline`);
      }

      for (const shader of shaders)
      {
        const key = shaderModuleKey(shader);
        if (!shaderModules.has(key))
        {
          shaderModules.set(key, {
            id: `${pass.sha256.slice(0, 12)}:${shader.stageName}`,
            stage: shader.stage,
            entryPoint: shader.entryPoint,
            code: shader.code,
            ...(shader.threadGroupSize ? { threadGroupSize: shader.threadGroupSize } : {}),
            occurrences: 0,
            sources: []
          });
        }
        const module = shaderModules.get(key);
        module.occurrences += 1;
        module.sources.push({ passKey: pass.passKey, unitKey: pass.unitKey, sha256: pass.sha256 });
      }
      coveredShaderOccurrences += shaders.length;

      if (pipelineKind === "compute") uniqueComputePipelines += 1;
      else uniqueRenderPipelines += 1;

      unitsBySha.set(pass.sha256, {
        id: `${pass.passKey}@${pass.sha256.slice(0, 12)}`,
        passKey: pass.passKey,
        unitKey: pass.unitKey,
        sha256: pass.sha256,
        pipelineKind,
        pipeline: pipeline.ToJSON(),
        occurrences: 1,
        bodyKeys: new Set([ body.bodyKey ]),
        // Render states are deliberately not realized here. The body set
        // carries none - a translation unit is stage bytecode, semantic
        // bindings and layouts - so states must come from portable reflection,
        // and an engine that read them from a unit would be reading a value
        // that does not exist.
        states: []
      });
    }
  }

  const units = Array.from(unitsBySha.values());
  // Two ratios, because they answer different questions: the body ratio is how
  // much the stored package saves, and the permutation ratio is how much a
  // runtime cache saves when it realizes per permutation.
  const sharing = Object.fromEntries(Array.from(sharingByPassKey, ([ passKey, entry ]) => [ passKey, {
    permutationPasses: entry.permutationPasses,
    bodyPasses: entry.bodies.size,
    units: entry.units.size,
    bodyRatio: Math.round((entry.bodies.size / entry.units.size) * 100) / 100,
    permutationRatio: Math.round((entry.permutationPasses / entry.units.size) * 100) / 100
  } ]));

  return {
    format: "CJS_WEBGPU_PREPARE_MATRIX",
    formatVersion: 1,
    sourceFormat: "CJS_WGSL_BODY_SET",
    sourcePath: source.sourcePath,
    uniqueShaderModules: shaderModules.size,
    coveredShaderOccurrences,
    shaderModules: Array.from(shaderModules.values()),
    uniquePipelines: units.length,
    uniqueRenderPipelines,
    uniqueComputePipelines,
    coveredOccurrences,
    pipelines: units.map(({ bodyKeys: keys, ...rest }) => ({ ...rest, bodyCount: keys.size })),
    bodySet: {
      permutationCount,
      uniqueBodies: bodyKeys.size,
      declaredBodies: source.bodyCount,
      declaredUnits: source.unitCount,
      unsupportedBodies: Array.from(unsupportedBodies.values()),
      sharing
    }
  };
}
