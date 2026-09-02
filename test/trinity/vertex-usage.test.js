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

test("a packed tangent IS a tangent", () =>
{
  // Carbon maps both packed usages onto TANGENT and lets the four-component
  // type carry the difference (Tr2VertexDefinitionUtilities.cpp:363-368). It
  // has no packed usage code because it needs none.
  //
  // This matters because there are dedicated shader variants: the quad*v5
  // family declares TANGENT0 as a float4 with no NORMAL or BITANGENT at all,
  // while unpacked_quad*v5 declares all three separately. Dropping the element
  // leaves a packed mesh with no tangent frame and that input bound to nothing.
  assert.equal(CarbonUsageFromCmf("PackedTangent"), TANGENT);
  assert.equal(CarbonUsageFromCmf("PackedTangentLegacy"), TANGENT);
});

test("a usage this does not know still has no counterpart", () =>
{
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

test("a packed tangent survives translation, carrying its four components", () =>
{
  const elements = CarbonVertexElements([
    { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
    { usage: "PackedTangent", usageIndex: 0, type: "Int16Norm", elementCount: 4, offset: 12 }
  ]);

  assert.equal(elements.length, 2);
  assert.equal(elements[1].usage, TANGENT);
  // The type is what tells a packed frame from an unpacked one, so it must not
  // be rewritten on the way through.
  assert.equal(elements[1].elementCount, 4);
  assert.equal(elements[1].type, "Int16Norm");
});

test("an element this does not know is dropped, not passed through", () =>
{
  // A passed-through CMF byte would collide with a different Carbon usage and
  // bind silently, which is worse than not binding.
  const elements = CarbonVertexElements([
    { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
    { usage: "Nonsense", usageIndex: 0, type: "Float32", elementCount: 2, offset: 12 }
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

test("a packed tangent channel is a tangent channel", () =>
{
  assert.deepEqual(CarbonUsageFromChannel("packedTangent"), { usage: TANGENT, usageIndex: 0 });
  assert.deepEqual(CarbonUsageFromChannel("packedTangentLegacy"), { usage: TANGENT, usageIndex: 0 });
  assert.equal(CarbonUsageFromChannel(""), null);
});

test("translating the same declaration twice returns the SAME array", () =>
{
  // Not an optimisation detail - a correctness-adjacent invariant.
  // Tr2VertexDefinition.getHandle memoises on the element array's IDENTITY, and
  // its linear intern scan is only affordable because of that memo. A fresh
  // array per call defeats it, and every batch of every mesh rescans the whole
  // intern table element by element. Invisible at a few meshes; quadratic per
  // frame at the several hundred a real scene carries.
  const decl = [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ];

  assert.equal(CarbonVertexElements(decl), CarbonVertexElements(decl));
});

test("the memo is keyed per declaration, not shared across meshes", () =>
{
  const one = [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ];
  const two = [ { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ];

  assert.notEqual(CarbonVertexElements(one), CarbonVertexElements(two));
  assert.equal(CarbonVertexElements(two)[0].usage, 2);
});

test("interning a translated declaration twice yields one handle and one entry", () =>
{
  const decl = [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 4242 } ];

  const first = Tr2VertexDefinition.getHandle(CarbonVertexElements(decl));
  const second = Tr2VertexDefinition.getHandle(CarbonVertexElements(decl));

  assert.equal(first, second);
});
