import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
  GetGlobalEffectOptions,
  ModifyGlobalEffectOptions,
  Tr2EffectConstant,
  Tr2EffectDescription,
  Tr2EffectLibrary,
  Tr2EffectParameterAnnotation,
  Tr2EffectRes,
  Tr2EffectResource,
  Tr2EffectStageInput,
  Tr2EffectTechnique,
  Tr2Pass,
  Tr2SamplerSetup,
  Tr2Shader
} from "../npm/dist/resource/shader/index.js";

function createPortableReflection(permutationIndex)
{
  return {
    format: "CJS_EFFECT_BODY_REFLECTION",
    formatVersion: 1,
    mode: "single-body",
    keyScope: "body-local",
    coverage: {
      bodies: "single",
      reflection: "complete",
      sourcePrograms: "complete",
      constantDefaults: "exact"
    },
    source: {
      label: "res:/graphics/effect.dx11/example.sm_depth",
      effectVersion: 15,
      compilerVersion: 1,
      nativeHash: new Uint8Array(32),
      stringTableByteLength: 4,
      byteLength: 1024
    },
    permutationIndex,
    sourceRecord: {
      offset: 64 + permutationIndex * 192,
      byteLength: 192
    },
    effect: {
      annotationGroupCount: 1,
      annotations: [ {
        parameterName: "Tint",
        annotations: [ {
          name: "SasUiVisible",
          type: Tr2EffectParameterAnnotation.Type.BOOL,
          rawValue: 1
        } ]
      } ],
      techniqueCount: 1,
      techniques: [ {
        key: "technique0",
        name: "Main",
        passCount: 1,
        libraryCount: 0,
        passes: [ {
          key: "technique0.pass0",
          renderStateCount: 1,
          renderStates: [ {
            state: 7,
            value: 3
          } ],
          stageCount: 2,
          stages: [
            createPortableStage("technique0.pass0.stage0", 0, "vertex"),
            createPortableStage("technique0.pass0.stage1", 1, "pixel")
          ]
        } ],
        libraries: []
      } ]
    }
  };
}

function createPortableStage(key, stageType, stageName)
{
  return {
    key,
    stageType,
    stageName,
    sourceProgram: {
      kind: "stage",
      stageType,
      stageName,
      shaderSize: 4,
      stringTableOffset: 0,
      bytes: new Uint8Array([ stageType, 1, 2, 3 ])
    },
    input: {
      constantDefaults: {
        declaredByteLength: 4,
        bytes: new Uint8Array([ 0, 0, 128, 63 ])
      },
      constantCount: 1,
      constants: [ {
        name: "Tint",
        offset: 0,
        size: 4,
        type: 0,
        dimension: 1,
        elements: 1,
        isSRGB: false,
        isAutoregister: false
      } ],
      resourceCount: 1,
      resources: [ {
        registerIndex: 0,
        name: "AlbedoMap",
        type: 2,
        arrayElements: 1,
        isSRGB: true,
        isAutoregister: false
      } ],
      uavCount: 0,
      uavs: [],
      samplerCount: 1,
      samplers: [ {
        registerIndex: 0,
        name: "AlbedoMap",
        isDynamic: true,
        descriptor: {
          comparison: false,
          minFilter: 1,
          magFilter: 1,
          mipFilter: 1,
          addressU: 1,
          addressV: 1,
          addressW: 1,
          mipLODBiasRaw: 0,
          maxAnisotropy: 1,
          comparisonFunc: 0,
          borderColorRaw: [ 0, 0, 0, 0 ],
          minLODRaw: 0,
          maxLODRaw: 0x7f800000
        }
      } ],
      annotationCount: 0,
      annotations: [],
      signature: {
        pipelineInputCount: 0,
        pipelineInputs: [],
        registerCount: 2,
        registers: [
          {
            registerType: 32,
            registerIndex: 0,
            arrayCount: 1,
            registerCount: 1,
            registerSpace: 0
          },
          {
            registerType: 1,
            registerIndex: 0,
            arrayCount: 1,
            registerCount: 1,
            registerSpace: 0
          }
        ],
        staticSamplerCount: 0,
        staticSamplers: [],
        threadGroupSize: {
          x: 0,
          y: 0,
          z: 0
        }
      }
    }
  };
}

function createEffectPackage()
{
  const axes = [ {
    index: 0,
    name: "QUALITY",
    options: [ "LOW", "HIGH" ],
    defaultOption: 0,
    description: "quality tier",
    type: 0
  } ];
  return {
    permutationGraph: {
      format: "CJS_EFFECT_PERMUTATION_GRAPH",
      formatVersion: 1,
      coverage: {
        permutations: "complete",
        bodies: "identity-only",
        reflection: "absent"
      },
      axes,
      variants: [
        {
          permutationIndex: 0,
          optionIndices: [ 0 ],
          bodyKey: "body0",
          sourceRecord: {
            offset: 64,
            byteLength: 192
          }
        },
        {
          permutationIndex: 1,
          optionIndices: [ 1 ],
          bodyKey: "body1",
          sourceRecord: {
            offset: 256,
            byteLength: 192
          }
        }
      ],
      bodies: [
        {
          key: "body0",
          byteLength: 192,
          sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        },
        {
          key: "body1",
          byteLength: 192,
          sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        }
      ],
    },
    GetPortableEffectReflection(index)
    {
      return createPortableReflection(index);
    }
  };
}

function createTwoAxisEffectPackage()
{
  const axes = [
    {
      index: 0,
      name: "QUALITY",
      options: [ "LOW", "HIGH" ],
      defaultOption: 0,
      description: "quality tier",
      type: 0
    },
    {
      index: 1,
      name: "MODE",
      options: [ "A", "B" ],
      defaultOption: 0,
      description: "render mode",
      type: 0
    }
  ];
  return {
    permutationGraph: {
      format: "CJS_EFFECT_PERMUTATION_GRAPH",
      formatVersion: 1,
      coverage: {
        permutations: "complete",
        bodies: "identity-only",
        reflection: "absent"
      },
      axes,
      variants: Array.from({ length: 4 }, (_, permutationIndex) => ({
        permutationIndex,
        optionIndices: [
          permutationIndex % 2,
          Math.floor(permutationIndex / 2)
        ],
        bodyKey: `body${permutationIndex}`,
        sourceRecord: {
          offset: 64 + permutationIndex * 192,
          byteLength: 192
        }
      })),
      bodies: Array.from({ length: 4 }, (_, index) => ({
        key: `body${index}`,
        byteLength: 192,
        sha256: String(index + 1).repeat(64)
      }))
    },
    GetPortableEffectReflection(index)
    {
      return createPortableReflection(index);
    }
  };
}

test("Tr2EffectRes selects and caches canonical portable shader reflection", () =>
{
  const resource = new Tr2EffectRes();
  resource.SetPayload(createEffectPackage());

  const shader = resource.GetShader([ {
    name: "QUALITY",
    value: "HIGH"
  } ]);

  assert.ok(shader instanceof Tr2Shader);
  assert.equal(shader, resource.GetShaderByIndex(1));
  assert.equal(shader.GetTechniqueIndex("Main"), 0);
  assert.equal(shader.GetPassCount(0), 1);
  assert.equal(shader.GetConstant("Tint").size, 4);
  assert.equal(shader.GetResource("AlbedoMap").isSRGB, true);
  assert.equal(
    shader.GetParameterAnnotations("Tint")[0].boolValue,
    true
  );

  const pass = shader.effect.techniques[0].passes[0];
  const vertex = pass.stageInputs[0];
  assert.deepEqual(pass.renderStateValues, [ { state: 7, value: 3 } ]);
  assert.equal(pass.shaderTypeMask, 3);
  assert.equal(shader.effect.techniques[0].shaderTypeMask, 3);
  assert.deepEqual([ ...vertex.constantValues ], [ 0, 0, 128, 63 ]);
  assert.deepEqual([ ...vertex.sourceProgram.bytes ], [ 0, 1, 2, 3 ]);
  assert.equal(vertex.resources.get(0).name, "AlbedoMap");
  assert.equal(vertex.samplers.get(0).isDynamic, true);
  assert.equal(shader.GetSortValue(), 0);
});

test("Tr2Shader owns portable reflection construction", () =>
{
  const portable = createPortableReflection(0);
  assert.equal(Tr2Shader.isPortableReflection(portable), true);

  const shader = Tr2Shader.fromPortable(portable);
  assert.ok(shader instanceof Tr2Shader);
  assert.equal(shader.GetTechniqueIndex("Main"), 0);
});

test("shader components construct independently from JSON and reflection", () =>
{
  const constant = Tr2EffectConstant.from({
    name: "ManualValue",
    offset: 4,
    size: 4,
    type: Tr2EffectConstant.Type.FLOAT,
    dimension: 1,
    elements: 1
  });
  assert.ok(constant instanceof Tr2EffectConstant);
  assert.equal(constant.name, "ManualValue");

  const portable = createPortableReflection(0);
  const portablePass = portable.effect.techniques[0].passes[0];
  const portableStage = portablePass.stages[0];
  const stage = Tr2EffectStageInput.fromPortable(portableStage);
  const pass = Tr2Pass.fromPortable(portablePass);
  const effect = Tr2EffectDescription.fromPortable(portable.effect);

  assert.ok(stage instanceof Tr2EffectStageInput);
  assert.ok(stage.constants[0] instanceof Tr2EffectConstant);
  assert.ok(stage.samplers.get(0) instanceof Tr2SamplerSetup);
  assert.ok(pass instanceof Tr2Pass);
  assert.equal(pass.stageInputs.length, 6);
  assert.equal(pass.stageInputs[0].stageType, 0);
  assert.ok(effect instanceof Tr2EffectDescription);
  assert.equal(effect.techniques[0].name, "Main");
});

test("Tr2Shader.from recursively hydrates canonical JSON component identity", () =>
{
  const source = Tr2Shader.fromPortable(createPortableReflection(0));
  const input = createPortableStage(
    "technique0.pass0.stage0",
    0,
    "vertex"
  ).input;
  const library = Tr2EffectLibrary.fromPortable({
    payloadSize: 8,
    sourceProgram: {
      kind: "library",
      shaderSize: 4,
      stringTableOffset: 0,
      bytes: new Uint8Array([ 1, 2, 3, 4 ])
    },
    exportCount: 0,
    exports: [],
    hitGroupName: "",
    globalInput: input,
    localInput: input
  });
  const values = source.GetValues();
  values.effect.techniques[0].libraries = [ library.GetValues() ];

  const shader = Tr2Shader.from(values);
  const effect = shader.effect;
  const technique = effect.techniques[0];
  const pass = technique.passes[0];
  const stage = pass.stageInputs[0];
  const hydratedLibrary = technique.libraries[0];

  assert.ok(effect instanceof Tr2EffectDescription);
  assert.ok(technique instanceof Tr2EffectTechnique);
  assert.ok(pass instanceof Tr2Pass);
  assert.ok(stage instanceof Tr2EffectStageInput);
  assert.ok(stage.resources instanceof Map);
  assert.deepEqual([ ...stage.resources.keys() ], [ 0 ]);
  assert.ok(stage.resources.get(0) instanceof Tr2EffectResource);
  assert.ok(stage.samplers.get(0) instanceof Tr2SamplerSetup);
  assert.equal(stage.samplers.get(0).hasName, true);
  assert.ok(
    effect.annotations.get("Tint")[0]
      instanceof Tr2EffectParameterAnnotation
  );
  assert.ok(hydratedLibrary instanceof Tr2EffectLibrary);
  assert.ok(hydratedLibrary.globalInput instanceof Tr2EffectStageInput);
  assert.ok(hydratedLibrary.localInput instanceof Tr2EffectStageInput);
});

test("Tr2Shader.from preserves authored canonical sort values", () =>
{
  const shader = Tr2Shader.from({
    sortValue: 123,
    effect: {
      annotations: {},
      techniques: []
    }
  });
  assert.equal(shader.sortValue, 123);
});

test("portable component readers retain source-exact adapted metadata", () =>
{
  const annotation = Tr2EffectParameterAnnotation.fromPortable({
    name: "NegativeZero",
    type: Tr2EffectParameterAnnotation.Type.FLOAT,
    rawValue: 0x80000000
  });
  assert.equal(annotation.rawValue, 0x80000000);
  assert.equal(Object.is(annotation.floatValue, -0), true);

  const sampler = Tr2SamplerSetup.fromPortable({
    name: null,
    isDynamic: false,
    descriptor: {
      comparison: false
    }
  });
  assert.equal(sampler.hasName, false);
  assert.equal(sampler.name, "");

  const input = createPortableStage(
    "technique0.pass0.stage0",
    0,
    "vertex"
  ).input;
  const library = Tr2EffectLibrary.fromPortable({
    payloadSize: 8,
    sourceProgram: {
      kind: "library",
      shaderSize: 4,
      stringTableOffset: 0,
      bytes: new Uint8Array([ 1, 2, 3, 4 ])
    },
    exportCount: 2,
    exports: [
      { type: 0, name: "RayGeneration" },
      { type: 2, name: "ClosestHit" }
    ],
    hitGroupName: "HitGroup",
    globalInput: input,
    localInput: input
  });
  assert.equal(library.rayGenName, "RayGeneration");
  assert.equal(library.closestHitName, "ClosestHit");
});

test("portable reflection enforces Carbon stage slots and valid annotation keys", () =>
{
  const portable = createPortableReflection(0);
  portable.effect.annotations[0].parameterName = "";
  const shader = Tr2Shader.fromPortable(portable);
  assert.equal(shader.effect.annotations.has(""), true);
  assert.equal(
    shader.effect.techniques[0].passes[0].stageInputs.length,
    6
  );

  portable.effect.techniques[0].passes[0].stages[0].stageType = 6;
  assert.throws(
    () => Tr2Shader.fromPortable(portable),
    /stage type is invalid or duplicated/
  );
});

test("Tr2Shader sort values remain uint32 when the pass-count bit is set", () =>
{
  const shader = Tr2Shader.fromPortable(createPortableReflection(0));
  const technique = shader.effect.techniques[0];
  const pass = technique.passes[0];
  pass.stageInputs[0].shader = 1;
  pass.stageInputs[1].shader = 2;
  pass.renderStates = 3;
  technique.passes.push(new Tr2Pass());

  shader.ProcessEffect();

  assert.equal(
    shader.GetSortValue(),
    ((2 << 30) | (2 << 20) | (1 << 10) | 3) >>> 0
  );
  assert.equal(shader.GetSortValue() >= 0, true);
});

test("Tr2EffectRes applies global options before local options", () =>
{
  const resource = new Tr2EffectRes();
  resource.SetPayload(createEffectPackage());

  ModifyGlobalEffectOptions([ {
    name: "QUALITY",
    value: "LOW"
  } ]);
  try
  {
    const shader = resource.GetShader([ {
      name: "QUALITY",
      value: "HIGH"
    } ]);
    assert.equal(shader, resource.GetShaderByIndex(0));
    assert.deepEqual(GetGlobalEffectOptions(), [ {
      name: "QUALITY",
      value: "LOW"
    } ]);
  }
  finally
  {
    ModifyGlobalEffectOptions([ {
      name: "QUALITY",
      value: ""
    } ]);
  }
});

test("Tr2EffectRes uses Carbon local option scan and count semantics", () =>
{
  const resource = new Tr2EffectRes();
  resource.SetPayload(createEffectPackage());
  const byIndex = index => resource.GetShaderByIndex(index);

  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "HIGH" },
    { name: "QUALITY", value: "LOW" }
  ]), byIndex(0));
  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "INVALID" },
    { name: "QUALITY", value: "HIGH" }
  ]), byIndex(1));
  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "HIGH" },
    { name: "QUALITY", value: "INVALID" }
  ]), byIndex(1));
  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "HIGH" },
    { name: "QUALITY", value: "LOW" }
  ], 1), byIndex(1));

  ModifyGlobalEffectOptions([ {
    name: "QUALITY",
    value: "INVALID"
  } ]);
  try
  {
    assert.equal(resource.GetShader([ {
      name: "QUALITY",
      value: "HIGH"
    } ]), byIndex(0));
  }
  finally
  {
    ModifyGlobalEffectOptions([ {
      name: "QUALITY",
      value: ""
    } ]);
  }
});

test("Tr2EffectRes uses first-axis-least-significant mixed radix", () =>
{
  const resource = new Tr2EffectRes();
  resource.SetPayload(createTwoAxisEffectPackage());

  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "HIGH" },
    { name: "MODE", value: "B" }
  ]), resource.GetShaderByIndex(3));
  assert.equal(resource.GetShader([
    { name: "MODE", value: "B" }
  ]), resource.GetShaderByIndex(2));
});

test("Tr2Shader lookups match Carbon pass-stage traversal", () =>
{
  const shader = Tr2Shader.fromPortable(createPortableReflection(0));
  const technique = shader.effect.techniques[0];
  const pass = technique.passes[0];
  pass.stageInputs[0].uavs.set(3, Tr2EffectResource.from({
    name: "Collision"
  }));
  pass.stageInputs[1].resources.set(4, Tr2EffectResource.from({
    name: "Collision"
  }));

  const libraryInput = Tr2EffectStageInput.from({
    constants: [ { name: "LibraryOnly" } ],
    resources: {
      5: { name: "LibraryResource" }
    }
  });
  technique.libraries = [ Tr2EffectLibrary.from({
    globalInput: libraryInput,
    localInput: libraryInput
  }) ];

  assert.equal(shader.GetResource("Collision"), pass.stageInputs[0].uavs.get(3));
  assert.equal(shader.GetConstant("LibraryOnly"), null);
  assert.equal(shader.GetResource("LibraryResource"), null);
  assert.equal(shader.GetTechniqueIndex(""), 0);
  assert.equal(shader.GetTechniqueIndex("Any"), -1);
  assert.equal(shader.GetTechniqueIndex("ANY_TECHNIQUE"), -1);
});

test("Tr2EffectRes reports malformed effect packages as resource payload errors", () =>
{
  const resource = new Tr2EffectRes();
  assert.throws(
    () => resource.SetPayload({ permutationGraph: {} }),
    error => error?.code === "CJS_RESOURCE_PAYLOAD_INVALID"
  );

  const malformedGraph = createEffectPackage();
  malformedGraph.permutationGraph.variants[1] = {
    ...malformedGraph.permutationGraph.variants[1],
    permutationIndex: 0
  };
  assert.throws(
    () => resource.SetPayload(malformedGraph),
    error => error?.code === "CJS_RESOURCE_PAYLOAD_INVALID"
  );

  const malformedReflection = createPortableReflection(0);
  malformedReflection.effect.techniques[0].passes[0].stages.push(
    malformedReflection.effect.techniques[0].passes[0].stages[0]
  );
  malformedReflection.effect.techniques[0].passes[0].stageCount += 1;
  assert.throws(
    () => Tr2Shader.fromPortable(malformedReflection),
    /invalid or duplicated/
  );

  const mismatchedCounts = createPortableReflection(0);
  mismatchedCounts.effect.techniques[0].passes[0]
    .stages[0].input.resourceCount += 1;
  assert.throws(
    () => Tr2Shader.fromPortable(mismatchedCounts),
    /input collections are malformed/
  );
});

test("shader reflection classes register canonical runtime-resource metadata", () =>
{
  new Tr2SamplerSetup();
  assert.equal(
    CjsSchema.getField(Tr2SamplerSetup, "name")?.type.kind,
    "string"
  );
  assert.equal(
    CjsSchema.getField(Tr2SamplerSetup, "isDynamic")?.type.kind,
    "boolean"
  );
  assert.equal(
    CjsSchema.GetConstructor("Tr2Shader"),
    Tr2Shader
  );
  assert.equal(
    CjsSchema.getMethod(Tr2Shader, "GetConstant")?.carbon?.method,
    true
  );
  assert.equal(
    CjsSchema.getMethod(Tr2Shader, "GetConstant")?.impl?.status,
    "implemented"
  );
  assert.equal(
    CjsSchema.getMethod(Tr2Shader, "GetTechniqueIndex")?.impl?.status,
    "adapted"
  );
  assert.match(
    CjsSchema.getMethod(Tr2Shader, "GetTechniqueIndex")?.impl?.reason ?? "",
    /output index/
  );
  assert.equal(
    CjsSchema.getMethod(Tr2Shader, "fromPortable")?.impl?.status,
    "custom"
  );
});
