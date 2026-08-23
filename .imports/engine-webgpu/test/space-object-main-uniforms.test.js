import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EVE_SPACE_OBJECT_MAIN_BUFFER_SIZES,
  buildEveSpaceObjectMainUniformData as buildUniformData
} from "../harness/webgpu/spaceObjectMainUniforms.js";
import { createQuadV5MainBindingValues } from "../harness/webgpu/quadV5Fixture.js";

const MATERIAL_NAMES = Object.freeze([
  "GeneralGlowColor",
  "Mtl1DiffuseColor",
  "Mtl2DiffuseColor",
  "Mtl3DiffuseColor",
  "Mtl4DiffuseColor",
  "Mtl1FresnelColor",
  "Mtl2FresnelColor",
  "Mtl3FresnelColor",
  "Mtl4FresnelColor"
]);

function matrix(first)
{
  return Float32Array.from({ length: 16 }, (_, index) => first + index);
}

function uniformBinding(registerIndex, minBindingSize, scoped = false)
{
  const visibility = registerIndex === 1 || registerIndex === 3 ? "vertex" : "fragment";
  const identity = `uniform-buffer:0:${registerIndex}`;
  return {
    sourceTruth: "wgsl-layout",
    resourceKind: "uniform-buffer",
    registerSpace: 0,
    registerIndex,
    group: 0,
    binding: registerIndex,
    visibility: [ visibility ],
    dynamic: false,
    ...(scoped ? { identity, scopeIdentity: `${identity}@${visibility}` } : {}),
    layout: {
      buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize }
    }
  };
}

// The material layout is now the caller's to supply, with no fallback to the
// package's analysis chunk. These are the same constants packageRecord() would
// have reflected, stated where a fixture states its own.
const MATERIAL_LAYOUT = Object.freeze({
  size: 160,
  constants: MATERIAL_NAMES.map((name, index) => ({
    name,
    offset: 16 + index * 16,
    size: 16,
    type: 0,
    dimension: 4,
    elements: 0
  }))
});


function buildEveSpaceObjectMainUniformData(record, values, options = {})
{
  return buildUniformData(record, values, { materialLayout: MATERIAL_LAYOUT, ...options });
}


function packageRecord(scoped = false)
{
  const constants = MATERIAL_NAMES.map((name, index) => ({
    name,
    offset: 16 + index * 16,
    size: 16,
    type: 0,
    dimension: 4,
    elements: 0
  }));
  return {
    analysis: {
      stages: [ {
        techniqueName: "Main",
        passIndex: 0,
        stageName: "pixel",
        bindings: [ {
          kind: "constantBuffer",
          registerSpace: 0,
          registerIndex: 0,
          carbon: {
            hasLocalConstants: true,
            constantValueSize: 160,
            constants
          }
        } ]
      } ]
    },
    pipeline: {
      techniqueName: "Main",
      passIndex: 0,
      bindGroups: [ {
        group: 0,
        bindings: [
          uniformBinding(0, 160, scoped),
          uniformBinding(1, 656, scoped),
          uniformBinding(2, 352, scoped),
          uniformBinding(3, 128, scoped),
          uniformBinding(4, 208, scoped)
        ]
      } ]
    }
  };
}

function bindingValues()
{
  return {
    material: Object.fromEntries(MATERIAL_NAMES.map((name, index) => [
      name,
      [ index + 0.25, index + 0.5, index + 0.75, index + 1 ]
    ])),
    perFrameVS: {
      ViewInverseTransposeMat: matrix(1),
      ViewProjectionMat: matrix(101),
      ViewProjectionLast: matrix(201),
      Sun: { DirWorld: [ 301, 302, 303 ] }
    },
    perFramePS: {
      TargetResolution: [ 4, 8 ],
      ShadowQuality: 7,
      SceneMipLodBias: 1.5,
      GammaBrightness: 2,
      FrameIndex: 9,
      FroxelFogData: {
        FogColor: [ 0.1, 0.2, 0.3 ],
        planets: [ 11, 12, 13, 14, 15, 16, 17, 18 ]
      }
    },
    perObjectVS: {
      worldTransform: matrix(401),
      worldTransformLast: matrix(501),
      invWorldTransform: matrix(601),
      shipData: [ 1, 2, 3, 4 ],
      boneOffsets: [ 5, 6, 7, 0xffffffff ]
    },
    perObjectPS: {
      worldTransform: matrix(701),
      worldTransformLast: matrix(801),
      invWorldTransform: matrix(901),
      shipData: [ 8, 9, 10, 11 ],
      customMaskClamps: [ 12, 13, 14, 15 ]
    }
  };
}

function floatAt(data, byteOffset)
{
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getFloat32(byteOffset, true);
}

function uintAt(data, byteOffset)
{
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(byteOffset, true);
}

test("space-object Main serializer emits full Carbon buffers at canonical identities", () =>
{
  const result = buildEveSpaceObjectMainUniformData(packageRecord(), bindingValues());
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(EVE_SPACE_OBJECT_MAIN_BUFFER_SIZES, {
    perFrameVS: 736,
    perFramePS: 1888,
    perObjectVS: 464,
    perObjectPS: 464
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(result).map(([ identity, data ]) => [ identity, data.byteLength ])),
    {
      "uniform-buffer:0:0": 160,
      "uniform-buffer:0:1": 736,
      "uniform-buffer:0:2": 1888,
      "uniform-buffer:0:3": 464,
      "uniform-buffer:0:4": 464
    }
  );

  assert.equal(floatAt(result["uniform-buffer:0:0"], 16), 0.25);
  assert.equal(floatAt(result["uniform-buffer:0:0"], 144), 8.25);
  assert.equal(floatAt(result["uniform-buffer:0:1"], 64), 101);
  assert.equal(floatAt(result["uniform-buffer:0:1"], 448), 201);
  assert.equal(floatAt(result["uniform-buffer:0:1"], 640), 301);
  assert.equal(floatAt(result["uniform-buffer:0:2"], 272), 4);
  assert.equal(uintAt(result["uniform-buffer:0:2"], 316), 7);
  assert.equal(floatAt(result["uniform-buffer:0:2"], 340), 1.5);
  assert.equal(floatAt(result["uniform-buffer:0:2"], 348), 2);
  assert.equal(uintAt(result["uniform-buffer:0:2"], 352), 9);
  assert.equal(floatAt(result["uniform-buffer:0:2"], 1856), 11);
  assert.equal(floatAt(result["uniform-buffer:0:3"], 128), 601);
  assert.equal(floatAt(result["uniform-buffer:0:3"], 192), 1);
  assert.equal(uintAt(result["uniform-buffer:0:3"], 428), 0xffffffff);
  assert.equal(floatAt(result["uniform-buffer:0:4"], 192), 8);
  assert.equal(floatAt(result["uniform-buffer:0:4"], 416), 12);
});

test("space-object Main serializer transposes logical matrices exactly once", () =>
{
  const values = bindingValues();
  Object.assign(values.perFrameVS, {
    ViewMat: matrix(301),
    ProjectionMat: matrix(401),
    ShadowViewMat: matrix(501),
    ShadowViewProjectionMat: matrix(601),
    EnvMapRotationMat: matrix(701),
    ViewLast: matrix(801),
    ProjLast: matrix(901)
  });
  Object.assign(values.perFramePS, {
    ViewInverseTransposeMat: matrix(1001),
    ViewMat: matrix(1101),
    EnvMapRotationMat: matrix(1201),
    ProjectionInverseMat: matrix(3001)
  });
  values.perObjectVS.worldTransform = [
    0, 2, 0, 0,
    -3, 0, 0, 0,
    0, 0, 4, 0,
    10, 20, 30, 1
  ];
  values.perFramePS.ShadowMatrixVal = [
    matrix(1001),
    matrix(1101),
    ...Array.from({ length: 14 }, () => matrix(0))
  ];
  values.perObjectVS.customMaskMatrix = [matrix(1201), matrix(1301)];

  const result = buildEveSpaceObjectMainUniformData(packageRecord(), values);
  const perFrameVS = result["uniform-buffer:0:1"];
  const perFramePS = result["uniform-buffer:0:2"];
  const perObjectVS = result["uniform-buffer:0:3"];
  const perObjectPS = result["uniform-buffer:0:4"];

  assert.deepEqual(
    Array.from({ length: 16 }, (_, index) => floatAt(perObjectVS, index * 4)),
    [0, -3, 0, 10, 2, 0, 0, 20, 0, 0, 4, 30, 0, 0, 0, 1]
  );
  assert.deepEqual(
    Array.from({ length: 16 }, (_, index) => floatAt(perFrameVS, 64 + index * 4)),
    [101, 105, 109, 113, 102, 106, 110, 114, 103, 107, 111, 115, 104, 108, 112, 116]
  );
  assert.deepEqual(
    Array.from({ length: 32 }, (_, index) => floatAt(perFramePS, 448 + index * 4)),
    [
      1001, 1005, 1009, 1013, 1002, 1006, 1010, 1014,
      1003, 1007, 1011, 1015, 1004, 1008, 1012, 1016,
      1101, 1105, 1109, 1113, 1102, 1106, 1110, 1114,
      1103, 1107, 1111, 1115, 1104, 1108, 1112, 1116
    ]
  );
  assert.deepEqual(
    Array.from({ length: 32 }, (_, index) => floatAt(perObjectVS, 256 + index * 4)),
    [ ...matrix(1201), ...matrix(1301) ]
  );
  for (const [ data, byteOffset, source, label ] of [
    [ perFrameVS, 0, values.perFrameVS.ViewInverseTransposeMat, "perFrameVS.ViewInverseTransposeMat" ],
    [ perFrameVS, 64, values.perFrameVS.ViewProjectionMat, "perFrameVS.ViewProjectionMat" ],
    [ perFrameVS, 128, values.perFrameVS.ViewMat, "perFrameVS.ViewMat" ],
    [ perFrameVS, 192, values.perFrameVS.ProjectionMat, "perFrameVS.ProjectionMat" ],
    [ perFrameVS, 256, values.perFrameVS.ShadowViewMat, "perFrameVS.ShadowViewMat" ],
    [ perFrameVS, 320, values.perFrameVS.ShadowViewProjectionMat, "perFrameVS.ShadowViewProjectionMat" ],
    [ perFrameVS, 384, values.perFrameVS.EnvMapRotationMat, "perFrameVS.EnvMapRotationMat" ],
    [ perFrameVS, 448, values.perFrameVS.ViewProjectionLast, "perFrameVS.ViewProjectionLast" ],
    [ perFrameVS, 512, values.perFrameVS.ViewLast, "perFrameVS.ViewLast" ],
    [ perFrameVS, 576, values.perFrameVS.ProjLast, "perFrameVS.ProjLast" ],
    [ perFramePS, 0, values.perFramePS.ViewInverseTransposeMat, "perFramePS.ViewInverseTransposeMat" ],
    [ perFramePS, 64, values.perFramePS.ViewMat, "perFramePS.ViewMat" ],
    [ perFramePS, 128, values.perFramePS.EnvMapRotationMat, "perFramePS.EnvMapRotationMat" ],
    [ perFramePS, 1488, values.perFramePS.ProjectionInverseMat, "perFramePS.ProjectionInverseMat" ],
    [ perObjectVS, 0, values.perObjectVS.worldTransform, "perObjectVS.worldTransform" ],
    [ perObjectVS, 64, values.perObjectVS.worldTransformLast, "perObjectVS.worldTransformLast" ],
    [ perObjectVS, 128, values.perObjectVS.invWorldTransform, "perObjectVS.invWorldTransform" ],
    [ perObjectPS, 0, values.perObjectPS.worldTransform, "perObjectPS.worldTransform" ],
    [ perObjectPS, 64, values.perObjectPS.worldTransformLast, "perObjectPS.worldTransformLast" ],
    [ perObjectPS, 128, values.perObjectPS.invWorldTransform, "perObjectPS.invWorldTransform" ]
  ])
  {
    const expected = Array.from({ length: 16 }, (_, index) =>
      source[(index % 4) * 4 + Math.floor(index / 4)]);
    assert.deepEqual(
      Array.from({ length: 16 }, (_, index) => floatAt(data, byteOffset + index * 4)),
      expected,
      label
    );
  }
});

test("space-object Main serializer emits exact v2 stage-scoped identities", () =>
{
  const record = packageRecord(true);
  record.pipeline.bindGroups[0].bindings.push({
    sourceTruth: "wgsl-layout",
    resourceKind: "sampled-resource",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@vertex",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding: 5,
    visibility: [ "vertex" ],
    dynamic: false,
    layout: {
      buffer: { type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 48 }
    }
  });
  const result = buildEveSpaceObjectMainUniformData(record, bindingValues());
  assert.deepEqual(Object.keys(result), [
    "uniform-buffer:0:0@fragment",
    "uniform-buffer:0:1@vertex",
    "uniform-buffer:0:2@fragment",
    "uniform-buffer:0:3@vertex",
    "uniform-buffer:0:4@fragment"
  ]);
  assert.equal(floatAt(result["uniform-buffer:0:0@fragment"], 16), 0.25);
  assert.equal(floatAt(result["uniform-buffer:0:1@vertex"], 64), 101);
  assert.equal(floatAt(result["uniform-buffer:0:2@fragment"], 272), 4);
  assert.equal(floatAt(result["uniform-buffer:0:3@vertex"], 128), 601);
  assert.equal(floatAt(result["uniform-buffer:0:4@fragment"], 416), 12);
});

test("space-object Main serializer accepts package objects and the QuadV5 semantic fixture", () =>
{
  const record = packageRecord();
  const packageObject = {
    analysis: record.analysis,
    GetPipeline(techniqueName, passIndex)
    {
      return techniqueName === "Main" && passIndex === 0 ? record.pipeline : null;
    }
  };
  const result = buildEveSpaceObjectMainUniformData(
    packageObject,
    createQuadV5MainBindingValues(4, 4)
  );
  assert.equal(floatAt(result["uniform-buffer:0:0"], 16), Math.fround(0.08));
  assert.equal(floatAt(result["uniform-buffer:0:1"], 56), 5);
  assert.equal(floatAt(result["uniform-buffer:0:1"], 64), 1);
  assert.equal(floatAt(result["uniform-buffer:0:1"], 640 + 8), Math.fround(0.9027735));
  assert.equal(floatAt(result["uniform-buffer:0:2"], 272), 4);
  assert.equal(floatAt(result["uniform-buffer:0:2"], 348), 2);
  assert.equal(floatAt(result["uniform-buffer:0:4"], 196), 1);
});

test("space-object Main serializer fails closed on reflected material drift", () =>
{
  const missing = bindingValues();
  delete missing.material.Mtl4FresnelColor;
  assert.throws(
    () => buildEveSpaceObjectMainUniformData(packageRecord(), missing),
    /material\.Mtl4FresnelColor is required/u
  );

  // Overlap is caught in the layout, which is now where the offsets come from.
  const overlap = {
    size: MATERIAL_LAYOUT.size,
    constants: MATERIAL_LAYOUT.constants.map((constant, index) =>
      index === 1 ? { ...constant, offset: 16 } : constant)
  };
  assert.throws(
    () => buildUniformData(packageRecord(), bindingValues(), { materialLayout: overlap }),
    /overlaps another constant/u
  );
});

test("space-object Main serializer rejects incomplete semantics and ABI expansion", () =>
{
  const incomplete = bindingValues();
  delete incomplete.perFrameVS.ViewProjectionMat;
  assert.throws(
    () => buildEveSpaceObjectMainUniformData(packageRecord(), incomplete),
    /perFrameVS\.ViewProjectionMat is required/u
  );

  const wrongType = bindingValues();
  wrongType.perObjectVS.boneOffsets = [ 1, 2, 3, "4" ];
  assert.throws(
    () => buildEveSpaceObjectMainUniformData(packageRecord(), wrongType),
    /boneOffsets\[3\] must be a uint32/u
  );

  const overflow = bindingValues();
  overflow.material.GeneralGlowColor[0] = Number.MAX_VALUE;
  assert.throws(
    () => buildEveSpaceObjectMainUniformData(packageRecord(), overflow),
    /GeneralGlowColor\[0\] must be a finite float32/u
  );

  const nonCanonical = packageRecord();
  delete nonCanonical.pipeline.bindGroups[0].bindings[1].layout.buffer.hasDynamicOffset;
  assert.throws(
    () => buildEveSpaceObjectMainUniformData(nonCanonical, bindingValues()),
    /uniform-buffer:0:1 is not canonical/u
  );

  const expanded = packageRecord();
  expanded.pipeline.bindGroups[0].bindings[2].layout.buffer.minBindingSize = 1892;
  assert.throws(
    () => buildEveSpaceObjectMainUniformData(expanded, bindingValues()),
    /perFramePS ABI is 1888 bytes but package requires at least 1892/u
  );

  const inconsistentIdentity = packageRecord(true);
  inconsistentIdentity.pipeline.bindGroups[0].bindings[1].identity = "uniform-buffer:0:99";
  assert.throws(
    () => buildEveSpaceObjectMainUniformData(inconsistentIdentity, bindingValues()),
    /uniform-buffer:0:1 has an inconsistent D3D identity/u
  );

  const inconsistentScope = packageRecord(true);
  inconsistentScope.pipeline.bindGroups[0].bindings[1].scopeIdentity = "uniform-buffer:0:1@fragment";
  assert.throws(
    () => buildEveSpaceObjectMainUniformData(inconsistentScope, bindingValues()),
    /uniform-buffer:0:1 is not canonical/u
  );
});

test("space-object Main uniform data requires a caller-supplied material layout", () =>
{
  // The analysis-chunk fallback that used to answer this is gone. It was a
  // format record standing in for shader reflection, and a second engine must
  // not reproduce it, so its absence is asserted rather than assumed.
  assert.throws(
    () => buildUniformData(packageRecord(), bindingValues()),
    /options\.materialLayout is required/u
  );
});
