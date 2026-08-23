import assert from "node:assert/strict";
import test from "node:test";

import { buildMatrixPipelines } from "../src/core/matrixPipelines.js";

function matrixVariant()
{
  return {
    id: "variant-a",
    passKey: "Main.pass0",
    techniqueName: "Main",
    passIndex: 0,
    occurrences: 2,
    exampleBodyIndex: 0,
    exampleOptions: [ { name: "QUALITY", value: "LOW" } ],
    status: "ready",
    stageDigests: [
      { stageName: "vertex", digest: "vertex-a" },
      { stageName: "pixel", digest: "pixel-a" }
    ],
    wgsl: {
      format: "CJS_WGSL_SET",
      formatVersion: 2,
      shaders: [
        {
          key: "Main.pass0.vertex",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "vertex",
          stage: "vertex",
          stageType: 0,
          entryPoint: "main",
          code: "@vertex fn main() -> @builtin(position) vec4<f32> { return vec4<f32>(); }",
          sourceMap: []
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          stage: "fragment",
          stageType: 1,
          entryPoint: "main",
          code: "@fragment fn main() -> @location(0) vec4<f32> { return vec4<f32>(); }",
          sourceMap: []
        }
      ],
      layouts: [ {
        key: "Main.pass0",
        techniqueName: "Main",
        passIndex: 0,
        bindGroups: []
      } ]
    }
  };
}

function stageVariant(digest, key, stage, code)
{
  return {
    digest,
    keys: [ key ],
    occurrences: 2,
    frontEnd: "qualified",
    stage: key.split(".").at(-1),
    wgsl: "emitted",
    independentShader: { stage, entryPoint: "main", code }
  };
}

function emptyBackend(sourcePath)
{
  return {
    sourcePath,
    expectedBodies: 2,
    offsetRecords: 2,
    offsetCountMatch: true,
    offsetIndicesMatch: true,
    resolvedBodies: 2,
    failedBodies: 0,
    stages: {
      occurrences: 0,
      frontEndQualifiedOccurrences: 0,
      frontEndFailedOccurrences: 0,
      emittedWgslOccurrences: 0,
      unsupportedWgslOccurrences: 0,
      uniquePrograms: 0,
      uniqueFrontEndQualifiedPrograms: 0,
      uniqueFrontEndFailedPrograms: 0,
      uniqueEmittedWgslPrograms: 0,
      uniqueUnsupportedWgslPrograms: 0
    },
    passes: {
      occurrences: 0,
      readyOccurrences: 0,
      unsupportedOccurrences: 0,
      failedOccurrences: 0,
      uniqueVariants: 0,
      uniqueReadyVariants: 0,
      uniqueUnsupportedVariants: 0,
      uniqueFailedVariants: 0
    },
    stageVariants: [],
    passVariants: [],
    bodyResults: Array.from({ length: 2 }, (_, bodyIndex) => ({
      bodyIndex,
      status: "qualified",
      passes: []
    }))
  };
}

function qualifiedMatrix()
{
  const ready = matrixVariant();
  const dx11 = emptyBackend("dx11.sm_lo");
  dx11.stageVariants = [
    stageVariant("vertex-a", "Main.pass0.vertex", "vertex", ready.wgsl.shaders[0].code),
    stageVariant("pixel-a", "Main.pass0.pixel", "fragment", ready.wgsl.shaders[1].code)
  ];
  dx11.stages = {
    occurrences: 4,
    frontEndQualifiedOccurrences: 4,
    frontEndFailedOccurrences: 0,
    emittedWgslOccurrences: 4,
    unsupportedWgslOccurrences: 0,
    uniquePrograms: 2,
    uniqueFrontEndQualifiedPrograms: 2,
    uniqueFrontEndFailedPrograms: 0,
    uniqueEmittedWgslPrograms: 2,
    uniqueUnsupportedWgslPrograms: 0
  };
  dx11.passVariants = [ ready ];
  dx11.passes = {
    occurrences: 2,
    readyOccurrences: 2,
    unsupportedOccurrences: 0,
    failedOccurrences: 0,
    uniqueVariants: 1,
    uniqueReadyVariants: 1,
    uniqueUnsupportedVariants: 0,
    uniqueFailedVariants: 0
  };
  dx11.bodyResults = Array.from({ length: 2 }, (_, bodyIndex) => ({
    bodyIndex,
    status: "qualified",
    passes: [ { passKey: ready.passKey, variantId: ready.id, status: ready.status } ]
  }));
  return {
    format: "CJS_WEBGPU_EFFECT_MATRIX",
    formatVersion: 1,
    status: "qualified",
    comparison: { axesMatch: true, activeTopologyMatch: true },
    backends: {
      dx11,
      dx12: emptyBackend("dx12.sm_lo")
    }
  };
}

function qualifiedComputeMatrix()
{
  const matrix = qualifiedMatrix();
  const backend = matrix.backends.dx11;
  const code = "@compute @workgroup_size(1) fn main() {}";
  const ready = {
    ...matrixVariant(),
    id: "variant-compute",
    stageDigests: [ { stageName: "compute", digest: "compute-a" } ],
    wgsl: {
      format: "CJS_WGSL_SET",
      formatVersion: 2,
      shaders: [ {
        key: "Main.pass0.compute",
        techniqueName: "Main",
        passIndex: 0,
        stageName: "compute",
        stage: "compute",
        stageType: 2,
        threadGroupSize: [ 1, 1, 1 ],
        entryPoint: "main",
        code,
        sourceMap: []
      } ],
      layouts: [ {
        key: "Main.pass0",
        techniqueName: "Main",
        passIndex: 0,
        bindGroups: []
      } ]
    }
  };
  backend.stageVariants = [
    stageVariant("compute-a", "Main.pass0.compute", "compute", code)
  ];
  backend.stageVariants[0].independentShader.threadGroupSize = { x: 1, y: 1, z: 1 };
  backend.stages = {
    occurrences: 2,
    frontEndQualifiedOccurrences: 2,
    frontEndFailedOccurrences: 0,
    emittedWgslOccurrences: 2,
    unsupportedWgslOccurrences: 0,
    uniquePrograms: 1,
    uniqueFrontEndQualifiedPrograms: 1,
    uniqueFrontEndFailedPrograms: 0,
    uniqueEmittedWgslPrograms: 1,
    uniqueUnsupportedWgslPrograms: 0
  };
  backend.passVariants = [ ready ];
  backend.passes = {
    occurrences: 2,
    readyOccurrences: 2,
    unsupportedOccurrences: 0,
    failedOccurrences: 0,
    uniqueVariants: 1,
    uniqueReadyVariants: 1,
    uniqueUnsupportedVariants: 0,
    uniqueFailedVariants: 0
  };
  backend.bodyResults.forEach((body) =>
  {
    body.passes = [ { passKey: ready.passKey, variantId: ready.id, status: ready.status } ];
  });
  return matrix;
}

test("effect matrix conversion prepares each ready variant once while preserving occurrence coverage", () =>
{
  const result = buildMatrixPipelines(qualifiedMatrix());
  assert.equal(result.uniqueShaderModules, 2);
  assert.equal(result.coveredShaderOccurrences, 4);
  assert.equal(result.uniquePipelines, 1);
  assert.equal(result.uniqueRenderPipelines, 1);
  assert.equal(result.uniqueComputePipelines, 0);
  assert.equal(result.coveredOccurrences, 2);
  assert.equal(result.pipelines[0].id, "dx11:variant-a");
  assert.equal(result.pipelines[0].pipelineKind, "render");
  assert.equal(result.pipelines[0].pipeline.shaderModules.length, 2);

  const legacy = qualifiedMatrix();
  legacy.backends.dx11.passVariants[0].wgsl.formatVersion = 1;
  assert.equal(buildMatrixPipelines(legacy).uniquePipelines, 1);

  const current = qualifiedMatrix();
  current.backends.dx11.passVariants[0].wgsl.formatVersion = 3;
  assert.equal(buildMatrixPipelines(current).uniquePipelines, 1);

  const unsupported = qualifiedMatrix();
  unsupported.backends.dx11.passVariants[0].wgsl.formatVersion = 4;
  assert.throws(() => buildMatrixPipelines(unsupported), /version 1, 2 or 3 CJS_WGSL_SET/u);
});

test("effect matrix conversion validates and skips unsupported geometry pass variants", () =>
{
  const matrix = qualifiedMatrix();
  const backend = matrix.backends.dx11;
  backend.stageVariants.push({
    digest: "geometry-a",
    keys: [ "Main.pass0.geometry" ],
    occurrences: 2,
    frontEnd: "qualified",
    stage: "geometry",
    wgsl: "unsupported",
    independentShader: null,
    reason: "WGSL geometry stages are not supported"
  });
  backend.stages = {
    ...backend.stages,
    occurrences: 6,
    frontEndQualifiedOccurrences: 6,
    emittedWgslOccurrences: 4,
    unsupportedWgslOccurrences: 2,
    uniquePrograms: 3,
    uniqueFrontEndQualifiedPrograms: 3,
    uniqueEmittedWgslPrograms: 2,
    uniqueUnsupportedWgslPrograms: 1
  };
  const unsupported = {
    ...backend.passVariants[0],
    id: "variant-geometry",
    status: "unsupported",
    stageDigests: [
      ...backend.passVariants[0].stageDigests,
      { stageName: "geometry", digest: "geometry-a" }
    ],
    wgsl: null
  };
  backend.passVariants = [ unsupported ];
  backend.passes = {
    ...backend.passes,
    readyOccurrences: 0,
    unsupportedOccurrences: 2,
    uniqueReadyVariants: 0,
    uniqueUnsupportedVariants: 1
  };
  backend.bodyResults.forEach((body) =>
  {
    body.passes = [ {
      passKey: unsupported.passKey,
      variantId: unsupported.id,
      status: unsupported.status
    } ];
  });

  const result = buildMatrixPipelines(matrix);
  assert.equal(result.uniquePipelines, 0);
  assert.equal(result.coveredOccurrences, 0);
  assert.equal(result.uniqueShaderModules, 2);
});

test("effect matrix conversion accepts one-stage compute-ready variants", () =>
{
  const result = buildMatrixPipelines(qualifiedComputeMatrix());
  assert.equal(result.uniqueShaderModules, 1);
  assert.equal(result.coveredShaderOccurrences, 2);
  assert.equal(result.uniquePipelines, 1);
  assert.equal(result.uniqueRenderPipelines, 0);
  assert.equal(result.uniqueComputePipelines, 1);
  assert.equal(result.coveredOccurrences, 2);
  assert.equal(result.pipelines[0].pipelineKind, "compute");
  assert.deepEqual(
    result.pipelines[0].pipeline.shaderModules.map((entry) => entry.stageName),
    [ "compute" ]
  );
  assert.deepEqual(result.shaderModules[0].threadGroupSize, [ 1, 1, 1 ]);
});

test("effect matrix conversion globally deduplicates self-paired compute pipelines", () =>
{
  const matrix = qualifiedComputeMatrix();
  matrix.backends.dx12 = structuredClone(matrix.backends.dx11);
  matrix.backends.dx12.sourcePath = "dx11-self-pair.sm_lo";

  const result = buildMatrixPipelines(matrix);
  assert.equal(result.uniqueShaderModules, 1);
  assert.equal(result.coveredShaderOccurrences, 4);
  assert.equal(result.uniquePipelines, 1);
  assert.equal(result.uniqueRenderPipelines, 0);
  assert.equal(result.uniqueComputePipelines, 1);
  assert.equal(result.coveredOccurrences, 4);
  assert.equal(result.pipelines[0].occurrences, 4);
  assert.deepEqual(result.pipelines[0].sources, [
    {
      backend: "dx11",
      sourcePath: "dx11.sm_lo",
      variantId: "variant-compute",
      passKey: "Main.pass0",
      occurrences: 2,
      exampleBodyIndex: 0,
      exampleOptions: [ { name: "QUALITY", value: "LOW" } ]
    },
    {
      backend: "dx12",
      sourcePath: "dx11-self-pair.sm_lo",
      variantId: "variant-compute",
      passKey: "Main.pass0",
      occurrences: 2,
      exampleBodyIndex: 0,
      exampleOptions: [ { name: "QUALITY", value: "LOW" } ]
    }
  ]);
});

test("effect matrix conversion rejects malformed ready records", () =>
{
  assert.throws(() => buildMatrixPipelines({}), /version 1/u);

  const failed = qualifiedMatrix();
  failed.status = "failed";
  assert.throws(() => buildMatrixPipelines(failed), /not exhaustively qualified/u);

  const badCount = qualifiedMatrix();
  badCount.backends.dx11.stageVariants[0].occurrences = 0;
  assert.throws(() => buildMatrixPipelines(badCount), /positive integer/u);

  const wrongKey = qualifiedMatrix();
  wrongKey.backends.dx11.passVariants[0].wgsl.shaders[1].key = "Main.pass0.vertex";
  assert.throws(() => buildMatrixPipelines(wrongKey), /inconsistent WGSL provenance/u);

  const truncated = qualifiedMatrix();
  truncated.backends.dx11.bodyResults.pop();
  assert.throws(() => buildMatrixPipelines(truncated), /body-result coverage is incomplete/u);

  const mismatchedStage = qualifiedMatrix();
  mismatchedStage.backends.dx11.passVariants[0].stageDigests[0].stageName = "geometry";
  assert.throws(() => buildMatrixPipelines(mismatchedStage), /invalid qualified stage references/u);

  const mismatchedCode = qualifiedMatrix();
  mismatchedCode.backends.dx11.passVariants[0].wgsl.shaders[0].code += "\n";
  assert.throws(() => buildMatrixPipelines(mismatchedCode), /does not match its qualified vertex stage/u);

  const mixedCompute = qualifiedComputeMatrix();
  mixedCompute.backends.dx11.passVariants[0].stageDigests.push({
    stageName: "vertex",
    digest: "compute-a"
  });
  assert.throws(() => buildMatrixPipelines(mixedCompute), /invalid qualified stage references/u);

  const mismatchedWorkgroup = qualifiedComputeMatrix();
  mismatchedWorkgroup.backends.dx11.passVariants[0].wgsl.shaders[0].threadGroupSize = [ 2, 1, 1 ];
  assert.throws(
    () => buildMatrixPipelines(mismatchedWorkgroup),
    /does not match its qualified compute stage/u
  );

  const failedPass = qualifiedMatrix();
  failedPass.backends.dx11.passVariants[0].status = "failed";
  assert.throws(() => buildMatrixPipelines(failedPass), /invalid pass status/u);
});
