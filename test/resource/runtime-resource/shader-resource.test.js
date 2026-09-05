import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "#schema";

import { CjsCarbonEffectWriter } from "../../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { CARBON_ANNOTATION_TYPE } from "../../../src/resource/format/carbonEffect/carbonEffectRecords.js";
import { buildSyntheticDescription, str } from "./format/carbonEffectSynthetic.js";

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
} from "../../../src/resource/shader/index.js";

/**
 * These tests import **source**, not `npm/dist`.
 *
 * They previously imported the built mirror, which meant they proved whatever
 * the last build had produced rather than what the tree currently says. A
 * deletion of the code they exercised passed cleanly against a stale `dist`.
 * Testing the published surface deliberately is a different job, and it belongs
 * in a file that says so.
 */

const COMPILER_VERSION = [ 1, 2, 6, 0 ];
const SOURCE_HASH = "0123456789abcdef0123456789abcdef";

/**
 * Builds a container over the given axes, one distinct body per permutation.
 *
 * Bodies differ by name prefix so a test can prove *which* permutation was
 * selected rather than merely that something was returned.
 *
 * @param {Array<object>} axes Permutation axes.
 * @param {Function} [describe] Optional per-body record customization.
 * @returns {Uint8Array} Container bytes.
 */
function buildContainer(axes, describe = null)
{
  const count = axes.reduce((total, axis) => total * axis.options.length, 1);
  const writer = new CjsCarbonEffectWriter({
    compilerVersion: COMPILER_VERSION,
    sourceHash: SOURCE_HASH
  });
  for (const axis of axes) writer.addPermutation(axis);
  for (let index = 0; index < count; index += 1)
  {
    const description = buildSyntheticDescription({ label: `P${index}` });
    writer.addBody(index, describe ? describe(description, index) : description);
  }
  return writer.toBytes();
}

const QUALITY = {
  name: "QUALITY",
  defaultOption: 0,
  description: "Quality level",
  type: 0,
  options: [ "HIGH", "LOW" ]
};

const MODE = {
  name: "MODE",
  defaultOption: 0,
  description: "Mode",
  type: 0,
  options: [ "A", "B" ]
};

function loaded(axes, describe = null)
{
  return new Tr2EffectRes().DoLoad(buildContainer(axes, describe));
}

test("Tr2Shader.from recursively hydrates canonical JSON component identity", () =>
{
  // The round trip that replaces every bespoke JSON path: GetValues out,
  // from() back in, with every nested class reconstructed as its own type.
  const source = loaded([ QUALITY ]).GetShaderByIndex(0);
  const shader = Tr2Shader.from(source.GetValues());

  const effect = shader.effect;
  const technique = effect.techniques[0];
  const pass = technique.passes[0];
  const stage = pass.stageInputs[0];

  assert.ok(effect instanceof Tr2EffectDescription);
  assert.ok(technique instanceof Tr2EffectTechnique);
  assert.ok(pass instanceof Tr2Pass);
  assert.ok(stage instanceof Tr2EffectStageInput);
  assert.ok(stage.constants[0] instanceof Tr2EffectConstant);
  assert.ok(stage.resources instanceof Map);
  assert.ok(stage.resources.get(0) instanceof Tr2EffectResource);
  assert.ok(stage.samplers.get(0) instanceof Tr2SamplerSetup);
  assert.ok(technique.libraries[0] === undefined
    || technique.libraries[0] instanceof Tr2EffectLibrary);
  assert.equal(pass.stageInputs.length, 6);
  assert.equal(pass.stageInputs[0].stageType, 0);
  assert.equal(technique.name, "Main");
});

test("a raytracing library survives the JSON round trip as its own class", () =>
{
  const source = loaded([ QUALITY ]).GetShaderByIndex(0);
  const shader = Tr2Shader.from(source.GetValues());
  const library = shader.effect.techniques[1].libraries[0];

  assert.ok(library instanceof Tr2EffectLibrary);
  assert.ok(library.globalInput instanceof Tr2EffectStageInput);
  assert.ok(library.localInput instanceof Tr2EffectStageInput);
  assert.equal(library.hitGroupName, "HitGroup");
});

test("annotations survive the JSON round trip keyed by parameter", () =>
{
  const source = loaded([ QUALITY ]).GetShaderByIndex(0);
  const shader = Tr2Shader.from(source.GetValues());
  const annotations = shader.effect.annotations.get("P0DiffuseMap");

  assert.ok(annotations[0] instanceof Tr2EffectParameterAnnotation);
  assert.equal(annotations[0].name, "IsHeapView");
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

test("an annotation's raw bits survive values a float cannot round-trip", () =>
{
  // Negative zero is the case that fails if the value is ever reconstructed from
  // the typed member instead of carried as bits.
  const shader = loaded([ QUALITY ], description =>
  {
    description.annotations[0].annotations[0] = {
      name: str("NegativeZero"),
      type: CARBON_ANNOTATION_TYPE.FLOAT,
      stringValue: null,
      rawValue: Uint8Array.of(0, 0, 0, 0x80)
    };
    return description;
  }).GetShaderByIndex(0);

  const annotation = shader.effect.annotations.get("P0DiffuseMap")[0];
  assert.equal(annotation.rawValue, 0x80000000);
  assert.equal(Object.is(annotation.floatValue, -0), true);
});

test("Tr2Shader sort values remain uint32 when the pass-count bit is set", () =>
{
  const shader = loaded([ QUALITY ]).GetShaderByIndex(0);
  const technique = shader.effect.techniques[0];
  const pass = technique.passes[0];
  pass.stageInputs[0].shader = 1;
  pass.stageInputs[1].shader = 2;
  pass.renderStates = 3;
  technique.passes.push(new Tr2Pass());
  technique.passes.push(new Tr2Pass());

  shader.ProcessEffect();

  assert.equal(
    shader.GetSortValue(),
    ((4 & 0x3) << 30 | (2 << 20) | (1 << 10) | 3) >>> 0
  );
  assert.equal(shader.GetSortValue() >= 0, true);
});

test("Tr2EffectRes applies global options before local options", () =>
{
  const resource = loaded([ QUALITY ]);

  ModifyGlobalEffectOptions([ { name: "QUALITY", value: "LOW" } ]);
  try
  {
    const shader = resource.GetShader([ { name: "QUALITY", value: "HIGH" } ]);
    assert.equal(shader, resource.GetShaderByIndex(1));
    assert.deepEqual(GetGlobalEffectOptions(), [
      { name: "QUALITY", value: "LOW" }
    ]);
  }
  finally
  {
    ModifyGlobalEffectOptions([ { name: "QUALITY", value: "" } ]);
  }
});

test("Tr2EffectRes uses Carbon local option scan and count semantics", () =>
{
  const resource = loaded([ QUALITY ]);
  const byIndex = index => resource.GetShaderByIndex(index);

  // Carbon does not break out of the local scan, so the last match wins.
  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "HIGH" },
    { name: "QUALITY", value: "LOW" }
  ]), byIndex(1));
  // An unmatched value leaves the previous selection standing.
  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "LOW" },
    { name: "QUALITY", value: "INVALID" }
  ]), byIndex(1));
  // count bounds how much of the array is scanned.
  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "HIGH" },
    { name: "QUALITY", value: "LOW" }
  ], 1), byIndex(0));

  // A global naming the axis suppresses the local scan even when its own value
  // is invalid, so the authored default stands.
  ModifyGlobalEffectOptions([ { name: "QUALITY", value: "INVALID" } ]);
  try
  {
    assert.equal(
      resource.GetShader([ { name: "QUALITY", value: "LOW" } ]),
      byIndex(0)
    );
  }
  finally
  {
    ModifyGlobalEffectOptions([ { name: "QUALITY", value: "" } ]);
  }
});

test("Tr2EffectRes uses first-axis-least-significant mixed radix", () =>
{
  const resource = loaded([ QUALITY, MODE ]);

  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "LOW" },
    { name: "MODE", value: "B" }
  ]), resource.GetShaderByIndex(3));
  assert.equal(resource.GetShader([
    { name: "MODE", value: "B" }
  ]), resource.GetShaderByIndex(2));
  assert.equal(resource.GetShader([
    { name: "QUALITY", value: "LOW" }
  ]), resource.GetShaderByIndex(1));
});

test("Tr2Shader lookups match Carbon pass-stage traversal", () =>
{
  const shader = loaded([ QUALITY ]).GetShaderByIndex(0);
  const technique = shader.effect.techniques[0];
  const pass = technique.passes[0];
  pass.stageInputs[0].uavs.set(3, Tr2EffectResource.from({ name: "Collision" }));
  pass.stageInputs[1].resources.set(4, Tr2EffectResource.from({
    name: "Collision"
  }));

  const libraryInput = Tr2EffectStageInput.from({
    constants: [ { name: "LibraryOnly" } ],
    resources: { 5: { name: "LibraryResource" } }
  });
  technique.libraries = [ Tr2EffectLibrary.from({
    globalInput: libraryInput,
    localInput: libraryInput
  }) ];

  // A stage's own UAV is found before a later stage's resource of the same name.
  assert.equal(shader.GetResource("Collision"), pass.stageInputs[0].uavs.get(3));
  // Library inputs are not part of pass-stage traversal.
  assert.equal(shader.GetConstant("LibraryOnly"), null);
  assert.equal(shader.GetResource("LibraryResource"), null);
  assert.equal(shader.GetTechniqueIndex(""), 0);
  assert.equal(shader.GetTechniqueIndex("Any"), -1);
});

test("Tr2EffectRes reports a malformed permutation payload", () =>
{
  const resource = new Tr2EffectRes();

  assert.throws(
    () => resource.SetPayload({}),
    error => error?.code === "CJS_RESOURCE_PAYLOAD_INVALID"
  );
  assert.throws(
    () => resource.SetPayload({
      permutations: [ { name: "X", options: [], defaultOption: 0 } ]
    }),
    error => error?.code === "CJS_RESOURCE_PAYLOAD_INVALID"
  );
  assert.throws(
    () => resource.SetPayload({
      permutations: [ { name: "X", options: [ "a" ], defaultOption: 1 } ]
    }),
    error => error?.code === "CJS_RESOURCE_PAYLOAD_INVALID"
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
});

test("stage input sizes its constant buffer from every constant, not from the defaults", () =>
{
  // Carbon: "This has to be done even if the constant isn't set, as the shader
  // may still sample it and expect to get some kind of default (usually zero)."
  // (Tr2Effect.cpp:1799-1800), so every constant participates.
  const stage = Tr2EffectStageInput.from({
    stageType: 1,
    exists: true,
    constants: [
      { name: "A", offset: 0, size: 16, type: 0, dimension: 4, elements: 0 },
      { name: "B", offset: 32, size: 16, type: 0, dimension: 4, elements: 0 }
    ],
    constantValueSize: 16
  });

  assert.equal(stage.GetConstantBufferSize(), 48);
  // The authored default blob is a PREFIX of that buffer, which is why Carbon
  // asserts constantSize >= constantDefaultValueSize rather than treating the
  // two as one number.
  assert.ok(stage.GetConstantBufferSize() >= stage.constantValueSize);
});

test("stage input never reports a buffer smaller than its authored defaults", () =>
{
  // Carbon grows constantValueSize to cover autoregister sampler-index
  // constants (Tr2EffectDescription.cpp:629-632), so the default blob can
  // legitimately reach past the constants this stage declares.
  const stage = Tr2EffectStageInput.from({
    stageType: 1,
    exists: true,
    constants: [ { name: "A", offset: 0, size: 16, type: 0, dimension: 4, elements: 0 } ],
    constantValueSize: 64
  });

  assert.equal(stage.GetConstantBufferSize(), 64);
  assert.equal(Tr2EffectStageInput.createEmpty(1).GetConstantBufferSize(), 0);
});

test("ApplyAllStateForPass hands the pass's two handles to the state manager", () =>
{
  // The dead HlslShader copy of this method reached
  // `renderContext?.m_esm?.ApplyShaderProgram?.()` and short-circuited to
  // nothing while still returning true, so the assertion that matters is that
  // the manager was ACTUALLY CALLED - not that the method returned.
  const calls = [];
  const renderContext = {
    GetEffectStateManager()
    {
      return {
        ApplyShaderProgram(handle)
        {
          calls.push([ "program", handle ]);
          return true;
        },
        ApplyRenderStates(handle)
        {
          calls.push([ "states", handle ]);
          return true;
        }
      };
    }
  };

  const shader = new Tr2Shader();

  shader.effect = {
    techniques: [ { passes: [ { shaderProgram: 11, renderStates: 3 }, { shaderProgram: 12, renderStates: 4 } ] } ]
  };

  assert.equal(shader.ApplyAllStateForPass(0, 1, renderContext), true);
  assert.deepEqual(calls, [ [ "program", 12 ], [ "states", 4 ] ], "Carbon's order: program, then states");

  calls.length = 0;
  assert.equal(shader.ApplyAllStateForPass(0, 9, renderContext), false, "a pass that is not there applies nothing");
  assert.deepEqual(calls, [], "and reaches no state manager at all");
});
