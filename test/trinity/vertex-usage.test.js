import assert from "node:assert/strict";
import { test } from "node:test";

import { CarbonUsageFromChannel, CarbonUsageFromCmf, CarbonVertexElements, Tr2VertexDefinition } from "../../npm/dist/trinity/core/index.js";

const { POSITION, COLOR, NORMAL, TANGENT, BITANGENT, TEXCOORD, BLENDINDICES, BLENDWEIGHTS } =
  Tr2VertexDefinition.UsageCode;

test("every CMF usage Carbon knows translates", () =>
{
  assert.equal(CarbonUsageFromCmf("Position"), POSITION);
  assert.equal(CarbonUsageFromCmf("Color"), COLOR);
  assert.equal(CarbonUsageFromCmf("Normal"), NORMAL);
  assert.equal(CarbonUsageFromCmf("Tangent"), TANGENT);
  assert.equal(CarbonUsageFromCmf("Binormal"), BITANGENT);
  assert.equal(CarbonUsageFromCmf("TexCoord"), TEXCOORD);
  assert.equal(CarbonUsageFromCmf("BoneIndices"), BLENDINDICES);
  assert.equal(CarbonUsageFromCmf("BoneWeights"), BLENDWEIGHTS);
});

test("the two numberings collide, which is why translation is required", () =>
{
  // CMF's own byte for Normal is 1. Carbon's 1 is COLOR. Passing the raw byte
  // through would bind a mesh's normals to the shader's colour input and draw
  // something plausible and wrong.
  const cmfNormalByte = 1;

  assert.equal(cmfNormalByte, COLOR);
  assert.notEqual(CarbonUsageFromCmf("Normal"), cmfNormalByte);
  assert.equal(CarbonUsageFromCmf("Normal"), NORMAL);
});

test("only three usages survive a raw byte passthrough", () =>
{
  // Position, BoneIndices and BoneWeights happen to land on the same number in
  // both vocabularies. Everything else does not, which is exactly why a
  // passthrough looks like it works.
  const cmfOrder = [
    "Position", "Normal", "Tangent", "Binormal",
    "TexCoord", "Color", "BoneIndices", "BoneWeights"
  ];
  const agreeing = cmfOrder.filter((name, cmfByte) => CarbonUsageFromCmf(name) === cmfByte);

  assert.deepEqual(agreeing, [ "Position", "BoneIndices", "BoneWeights" ]);
});

test("packed tangents have no Carbon counterpart", () =>
{
  // A CMF storage optimisation, not a semantic. Carbon has no usage for it.
  assert.equal(CarbonUsageFromCmf("PackedTangent"), null);
  assert.equal(CarbonUsageFromCmf("PackedTangentLegacy"), null);
  assert.equal(CarbonUsageFromCmf("Nonsense"), null);
});

test("translating a declaration keeps order, offsets and types", () =>
{
  const elements = CarbonVertexElements([
    { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
    { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3, offset: 12 }
  ]);

  assert.deepEqual(elements, [
    { usage: POSITION, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
    { usage: NORMAL, usageIndex: 0, type: "Float32", elementCount: 3, offset: 12 }
  ]);
});

test("an element with no counterpart is dropped, not passed through", () =>
{
  const elements = CarbonVertexElements([
    { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
    { usage: "PackedTangent", usageIndex: 0, type: "Int16Norm", elementCount: 4, offset: 12 }
  ]);

  assert.equal(elements.length, 1);
  assert.equal(elements[0].usage, POSITION);
});

test("a translated declaration matches a shader input; an untranslated one does not", () =>
{
  // The end-to-end point. resolveBindingPlan matches on (usage, usageIndex),
  // and a shader's pipeline input carries Carbon's numeric usage.
  const cmfElements = [ { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ];
  const pipelineInputs = [ { usage: NORMAL, usageIndex: 0, registerIndex: 3, type: 0, dimension: 3 } ];

  const untranslated = Tr2VertexDefinition.resolveBindingPlan(cmfElements, pipelineInputs);
  const translated = Tr2VertexDefinition.resolveBindingPlan(CarbonVertexElements(cmfElements), pipelineInputs);

  assert.equal(untranslated.entries[0].element, null);
  assert.equal(untranslated.complete, false);
  assert.notEqual(translated.entries[0].element, null);
  assert.equal(translated.complete, true);
});

test("channel names translate for both readers", () =>
{
  // GR2 emits no declaration at all, only channels, so this is the entry point
  // the EVE path uses. CMF emits the same names, which is why one table serves
  // both.
  assert.deepEqual(CarbonUsageFromChannel("position"), { usage: POSITION, usageIndex: 0 });
  assert.deepEqual(CarbonUsageFromChannel("normal"), { usage: NORMAL, usageIndex: 0 });
  assert.deepEqual(CarbonUsageFromChannel("binormal"), { usage: BITANGENT, usageIndex: 0 });
  assert.deepEqual(CarbonUsageFromChannel("blendIndice"), { usage: BLENDINDICES, usageIndex: 0 });
  assert.deepEqual(CarbonUsageFromChannel("blendWeight"), { usage: BLENDWEIGHTS, usageIndex: 0 });
});

test("a trailing digit is the semantic index, not part of the name", () =>
{
  assert.deepEqual(CarbonUsageFromChannel("texcoord0"), { usage: TEXCOORD, usageIndex: 0 });
  assert.deepEqual(CarbonUsageFromChannel("texcoord1"), { usage: TEXCOORD, usageIndex: 1 });
  // Matching needs both halves: same usage, different input.
  assert.notEqual(
    CarbonUsageFromChannel("texcoord1").usageIndex,
    CarbonUsageFromChannel("texcoord0").usageIndex
  );
});

test("a storage-only channel has no usage", () =>
{
  assert.equal(CarbonUsageFromChannel("packedTangent"), null);
  assert.equal(CarbonUsageFromChannel("packedTangentLegacy"), null);
  assert.equal(CarbonUsageFromChannel(""), null);
});
