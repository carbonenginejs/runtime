import assert from "node:assert/strict";
import test from "node:test";
import { CjsWebgpuPackage } from "../src/index.js";
import { buildBodySetPipelines } from "../src/core/bodySetPipelines.js";

const SHA = Object.freeze({
  mainA: "1".repeat(64),
  mainB: "2".repeat(64),
  shadow: "3".repeat(64)
});

function binding(overrides = {})
{
  return {
    identity: "uniform-buffer:0:0",
    scopeIdentity: "uniform-buffer:0:0@vertex",
    resourceKind: "uniform-buffer",
    generatedSymbol: "cb0",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding: 0,
    visibility: [ "vertex" ],
    type: "uniform",
    buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 16 },
    ...overrides
  };
}

function shader(passKey, stageName, code)
{
  const metadata = { vertex: { stage: "vertex", stageType: 0 }, pixel: { stage: "fragment", stageType: 1 } };
  return {
    key: `${passKey}.${stageName}`,
    stageName,
    stage: metadata[stageName].stage,
    stageType: metadata[stageName].stageType,
    entryPoint: "main",
    code,
    sourceMap: []
  };
}

function unit(passKey, sha256, vertexCode, pixelCode)
{
  return {
    sha256,
    passKey,
    unitKey: `unit-${sha256.slice(0, 4)}`,
    wgslSetVersion: 3,
    shaders: [ shader(passKey, "vertex", vertexCode), shader(passKey, "pixel", pixelCode) ],
    layouts: [ {
      key: passKey,
      techniqueName: passKey.split(".")[0],
      passIndex: 0,
      bindGroups: [ { group: 0, bindings: [ binding() ] } ]
    } ],
    resourceTransforms: null
  };
}

/**
 * Two permutations share one body; two bodies share the Shadow unit and differ
 * on Main. That is the sharing shape a real uber-shader has, in miniature.
 *
 * @param {object} [overrides] Body overrides.
 * @returns {CjsWebgpuPackage} Package with a fake backend body source.
 */
function bodySetPackage(overrides = {})
{
  const bodies = overrides.bodies ?? [
    {
      bodyKey: "body0",
      status: "translated",
      passes: [
        unit("Main.pass0", SHA.mainA, "// vertex A", "// pixel A"),
        unit("Shadow.pass0", SHA.shadow, "// shadow vertex", "// shadow pixel")
      ]
    },
    {
      bodyKey: "body0",
      status: "translated",
      passes: [
        unit("Main.pass0", SHA.mainA, "// vertex A", "// pixel A"),
        unit("Shadow.pass0", SHA.shadow, "// shadow vertex", "// shadow pixel")
      ]
    },
    {
      bodyKey: "body1",
      status: "translated",
      passes: [
        unit("Main.pass0", SHA.mainB, "// vertex A", "// pixel B"),
        unit("Shadow.pass0", SHA.shadow, "// shadow vertex", "// shadow pixel")
      ]
    }
  ];

  const pkg = CjsWebgpuPackage.from({
    sourcePath: "res:/test/effect.dx11/quad.sm_hi",
    wgsl: { format: "CJS_WGSL_SET", formatVersion: 3, shaders: [], layouts: [] }
  });
  return Object.create(pkg, {
    backendBodySource: {
      value: Object.freeze({
        sourcePath: "res:/test/effect.dx11/quad.sm_hi",
        bodyCount: new Set(bodies.map((body) => body.bodyKey)).size,
        unitCount: overrides.unitCount ?? 3,
        permutationCount: bodies.length,
        ResolveBody(index)
        {
          const body = bodies[index];
          return Object.freeze({
            permutationIndex: index,
            bodyKey: body.bodyKey,
            status: body.status,
            error: body.error ?? null,
            passes: Object.freeze(body.passes)
          });
        }
      })
    }
  });
}

test("body-set preparation caches one pipeline per translation-unit identity", () =>
{
  const prepare = buildBodySetPipelines(bodySetPackage());

  assert.equal(prepare.format, "CJS_WEBGPU_PREPARE_MATRIX");
  assert.equal(prepare.formatVersion, 1);
  assert.equal(prepare.sourceFormat, "CJS_WGSL_BODY_SET");

  // Three permutations x two passes = six occurrences, three unique units.
  assert.equal(prepare.coveredOccurrences, 6);
  assert.equal(prepare.uniquePipelines, 3);
  assert.equal(prepare.uniqueRenderPipelines, 3);
  assert.equal(prepare.uniqueComputePipelines, 0);
  assert.deepEqual(
    prepare.pipelines.map((entry) => entry.sha256).sort(),
    [ SHA.mainA, SHA.mainB, SHA.shadow ].sort()
  );

  const mainA = prepare.pipelines.find((entry) => entry.sha256 === SHA.mainA);
  assert.equal(mainA.passKey, "Main.pass0");
  assert.equal(mainA.occurrences, 2);
  assert.equal(mainA.bodyCount, 1);
  assert.equal(mainA.pipelineKind, "render");
  assert.equal(mainA.pipeline.techniqueName, "Main");
  assert.equal(mainA.pipeline.passIndex, 0);

  const shadow = prepare.pipelines.find((entry) => entry.sha256 === SHA.shadow);
  assert.equal(shadow.occurrences, 3);
  assert.equal(shadow.bodyCount, 2);
});

test("body-set preparation dedupes shader modules below unit granularity", () =>
{
  const prepare = buildBodySetPipelines(bodySetPackage());
  // Two Main units share one vertex module and differ only in the pixel one:
  // vertex A, pixel A, pixel B, shadow vertex, shadow pixel.
  assert.equal(prepare.uniqueShaderModules, 5);
  assert.equal(prepare.coveredShaderOccurrences, 12);
  const vertexA = prepare.shaderModules.find((entry) => entry.code === "// vertex A");
  assert.equal(vertexA.occurrences, 2);
  assert.equal(vertexA.stage, "vertex");
  assert.equal(vertexA.entryPoint, "main");
});

test("body-set preparation reports sharing per pass rather than one aggregate", () =>
{
  const { bodySet } = buildBodySetPipelines(bodySetPackage());

  assert.equal(bodySet.permutationCount, 3);
  assert.equal(bodySet.uniqueBodies, 2);
  assert.deepEqual(bodySet.unsupportedBodies, []);

  // A degenerate 1:1 case must be visible rather than hidden by an aggregate.
  assert.deepEqual(bodySet.sharing["Main.pass0"], {
    permutationPasses: 3,
    bodyPasses: 2,
    units: 2,
    bodyRatio: 1,
    permutationRatio: 1.5
  });
  assert.deepEqual(bodySet.sharing["Shadow.pass0"], {
    permutationPasses: 3,
    bodyPasses: 2,
    units: 1,
    bodyRatio: 2,
    permutationRatio: 3
  });
});

test("body-set preparation surfaces an unsupported body without dropping it", () =>
{
  const prepare = buildBodySetPipelines(bodySetPackage({
    bodies: [
      {
        bodyKey: "body9",
        status: "unsupported",
        error: "geometry stage is not supported",
        passes: []
      },
      {
        bodyKey: "body9",
        status: "unsupported",
        error: "geometry stage is not supported",
        passes: []
      },
      {
        bodyKey: "body0",
        status: "translated",
        passes: [ unit("Main.pass0", SHA.mainA, "// vertex A", "// pixel A") ]
      }
    ]
  }));

  assert.equal(prepare.uniquePipelines, 1);
  assert.equal(prepare.bodySet.uniqueBodies, 2);
  assert.deepEqual(prepare.bodySet.unsupportedBodies, [ {
    bodyKey: "body9",
    status: "unsupported",
    error: "geometry stage is not supported",
    permutationCount: 2
  } ]);
});

test("body-set preparation fails closed on unusable units", () =>
{
  assert.throws(
    () => buildBodySetPipelines(CjsWebgpuPackage.from({
      wgsl: { format: "CJS_WGSL_SET", formatVersion: 3, shaders: [], layouts: [] }
    })),
    /carries no backend body set/u
  );

  const twoLayouts = unit("Main.pass0", SHA.mainA, "// v", "// p");
  twoLayouts.layouts = [ twoLayouts.layouts[0], twoLayouts.layouts[0] ];
  assert.throws(
    () => buildBodySetPipelines(bodySetPackage({
      bodies: [ { bodyKey: "body0", status: "translated", passes: [ twoLayouts ] } ]
    })),
    /must carry exactly one canonical layout/u
  );

  const vertexOnly = unit("Main.pass0", SHA.mainA, "// v", "// p");
  vertexOnly.shaders = [ vertexOnly.shaders[0] ];
  assert.throws(
    () => buildBodySetPipelines(bodySetPackage({
      bodies: [ { bodyKey: "body0", status: "translated", passes: [ vertexOnly ] } ]
    })),
    /does not reference exactly compute or vertex\+pixel/u
  );

  const badPassKey = unit("Main.pass0", SHA.mainA, "// v", "// p");
  badPassKey.passKey = "Main";
  assert.throws(
    () => buildBodySetPipelines(bodySetPackage({
      bodies: [ { bodyKey: "body0", status: "translated", passes: [ badPassKey ] } ]
    })),
    /is not <technique>\.pass<index>/u
  );
});

test("body-set preparation preserves the producer's physical binding slots", () =>
{
  const shifted = unit("Main.pass0", SHA.mainA, "// v", "// p");
  shifted.layouts[0].bindGroups = [ {
    group: 2,
    bindings: [ binding({
      group: 2,
      binding: 7,
      identity: "sampled-resource:0:13",
      scopeIdentity: "sampled-resource:0:13@fragment",
      resourceKind: "sampled-resource",
      generatedSymbol: "t13",
      registerIndex: 13,
      visibility: [ "fragment" ],
      type: "texture_2d_array<f32>",
      buffer: null,
      texture: { sampleType: "float", viewDimension: "2d-array" }
    }) ]
  } ];

  const prepare = buildBodySetPipelines(bodySetPackage({
    bodies: [ { bodyKey: "body0", status: "translated", passes: [ shifted ] } ]
  }));
  const group = prepare.pipelines[0].pipeline.bindGroups[0];
  assert.equal(group.group, 2);
  assert.equal(group.bindings[0].group, 2);
  assert.equal(group.bindings[0].binding, 7);
  assert.equal(group.bindings[0].identity, "sampled-resource:0:13");
});

test("body-set preparation carries no render states, because a unit has none", () =>
{
  const prepare = buildBodySetPipelines(bodySetPackage());
  for (const entry of prepare.pipelines)
  {
    assert.deepEqual(entry.states, []);
    assert.deepEqual(entry.pipeline.states, []);
    assert.equal(entry.pipeline.renderStates, 0);
  }
});
