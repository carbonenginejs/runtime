import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2VertexDefinition } from "../../npm/dist/trinity/core/index.js";

const Usage = Tr2VertexDefinition.UsageCode;

// A mesh element list as a decoded payload supplies it, and a shader's declared
// pipeline inputs as Tr2EffectStageInput.signature.pipelineInputs supplies them.
function meshElements()
{
  return [
    { usage: Usage.POSITION, usageIndex: 0, type: "FLOAT3", offset: 0, stream: 0 },
    { usage: Usage.NORMAL, usageIndex: 0, type: "FLOAT3", offset: 12, stream: 0 },
    { usage: Usage.TEXCOORD, usageIndex: 0, type: "FLOAT2", offset: 24, stream: 0 },
    { usage: Usage.TEXCOORD, usageIndex: 1, type: "FLOAT2", offset: 32, stream: 0 }
  ];
}

function input(usage, usageIndex, extra = {})
{
  return { usage, usageIndex, registerIndex: usageIndex, type: "FLOAT4", ...extra };
}

test("matching is by semantic and index only, never type or offset", () =>
{
  const elements = meshElements();

  // A float3 POSITION0 in the mesh satisfies a float4 POSITION0 in the shader.
  const matched = Tr2VertexDefinition.findElement(elements, input(Usage.POSITION, 0));
  assert.equal(matched.type, "FLOAT3", "the mesh element wins; the hardware converts");

  assert.equal(Tr2VertexDefinition.findElement(elements, input(Usage.TEXCOORD, 1)).offset, 32,
    "the usage INDEX distinguishes TEXCOORD0 from TEXCOORD1");
  assert.equal(Tr2VertexDefinition.findElement(elements, input(Usage.TEXCOORD, 5)), null);
});

test("the plan follows the shader's inputs, not the mesh's elements", () =>
{
  const plan = Tr2VertexDefinition.resolveBindingPlan(meshElements(), [
    input(Usage.POSITION, 0),
    input(Usage.TEXCOORD, 0)
  ]);

  assert.equal(plan.entries.length, 2, "NORMAL and TEXCOORD1 are in the mesh but unread");
  assert.deepEqual(plan.entries.map(entry => entry.usage), [ Usage.POSITION, Usage.TEXCOORD ]);
  assert.ok(plan.complete);
  assert.equal(plan.unmatched, 0);
});

test("an input the mesh cannot supply is reported, not resolved", () =>
{
  const plan = Tr2VertexDefinition.resolveBindingPlan(meshElements(), [
    input(Usage.POSITION, 0),
    input(Usage.BLENDWEIGHTS, 0, { type: "FLOAT4" }),
    input(Usage.BLENDINDICES, 0, { type: "UINT" })
  ]);

  assert.equal(plan.unmatched, 2);
  assert.equal(plan.complete, false);

  const weights = plan.entries[1];
  assert.equal(weights.element, null, "no element; the engine supplies its own fallback");
  assert.equal(weights.fallbackType, "FLOAT4", "carrying the shader's declared type");
  assert.equal(plan.entries[2].fallbackType, "UINT",
    "Carbon picks the fabricated format from the input's scalar type");
});

test("BLENDINDICES precedes BLENDWEIGHTS, as Carbon declares them", () =>
{
  assert.equal(Usage.BLENDINDICES, 6);
  assert.equal(Usage.BLENDWEIGHTS, 7);
});

test("interning is by the full element list, not by semantics alone", () =>
{
  const first = Tr2VertexDefinition.getHandle(meshElements());

  assert.equal(Tr2VertexDefinition.getHandle(meshElements()), first,
    "an equal declaration interns to the same handle");

  // Same semantics, different packing: a different input layout, so a different
  // handle. This is why the intern key is stricter than the match key.
  const repacked = meshElements();
  repacked[1].offset = 16;
  assert.notEqual(Tr2VertexDefinition.getHandle(repacked), first);

  const restreamed = meshElements();
  restreamed[0].stream = 1;
  assert.notEqual(Tr2VertexDefinition.getHandle(restreamed), first);

  assert.deepEqual(Tr2VertexDefinition.getElements(first), meshElements(),
    "a handle resolves back to what it was interned from");
  assert.equal(Tr2VertexDefinition.getElements(9999), null);
});

test("a mesh with no declaration still yields a plan of unmatched inputs", () =>
{
  const plan = Tr2VertexDefinition.resolveBindingPlan(null, [ input(Usage.POSITION, 0) ]);

  assert.equal(plan.unmatched, 1);
  assert.equal(plan.entries[0].element, null);
  assert.deepEqual(Tr2VertexDefinition.resolveBindingPlan(meshElements(), null).entries, [],
    "a shader with no declared inputs needs nothing bound");
});

test("the authoring half builds items with Carbon's automatic per-stream offsets", () =>
{
  // Carbon Add (Tr2VertexDefinition.h:174-181): offset comes from the
  // stream's ledger and advances by the type's byte size. The sprite-set
  // layout (EveSpriteSet.cpp:18-33) is the worked example: the ledger lands
  // exactly on the 32-byte PoolVertex struct.
  const definition = new Tr2VertexDefinition();
  assert.equal(definition.empty(), true);

  definition.Add("FLOAT32_1", "TEXCOORD", 5);
  definition.Add("FLOAT32_3", "POSITION", 0, 1, 1);
  definition.Add("FLOAT16_4", "TEXCOORD", 0, 1, 1);
  definition.Add("FLOAT16_2", "TEXCOORD", 1, 1, 1);
  definition.Add("UBYTE_4_NORM", "COLOR", 0, 1, 1);
  definition.Add("UBYTE_4_NORM", "COLOR", 1, 1, 1);

  assert.equal(definition.empty(), false);
  assert.deepEqual(definition.items.map(item => item.offset), [ 0, 0, 12, 20, 24, 28 ]);
  assert.deepEqual(definition.nextOffset.slice(0, 2), [ 4, 32 ]);
  assert.equal(definition.items[1].instanceStepRate, 1);
  assert.equal(definition.items[0].stream, 0);

  // Find (h:169-172): first by usage, optionally by index; numeric usage
  // codes resolve through Carbon's UsageCode ordering.
  assert.equal(definition.Find("TEXCOORD").usageIndex, 5);
  assert.equal(definition.Find("TEXCOORD", 1).type, "FLOAT16_2");
  assert.equal(definition.Find(Usage.COLOR, 1).offset, 28);
  assert.equal(definition.Find("NORMAL"), null);

  // The byte arithmetic (h:183-205), from the type NAME.
  assert.equal(Tr2VertexDefinition.dataTypeSizeInMembers("FLOAT16_4"), 4);
  assert.equal(Tr2VertexDefinition.dataTypeSizeInBytes("FLOAT16_4"), 8);
  assert.equal(Tr2VertexDefinition.dataTypeSizeInBytes("UBYTE_4_NORM"), 4);
  assert.equal(Tr2VertexDefinition.dataTypeSizeInBytes("USHORT_2_NORM"), 4);
  assert.equal(Tr2VertexDefinition.dataTypeSizeInBytes("UINT32_3"), 12);

  // The matcher statics accept an instance wherever they took an array.
  const twin = new Tr2VertexDefinition();
  for (const item of definition.items) twin.Add(item.type, item.usage, item.usageIndex, item.stream, item.instanceStepRate);
  assert.equal(Tr2VertexDefinition.isSameDefinition(definition, twin), true);
  assert.equal(Tr2VertexDefinition.getHandle(definition), Tr2VertexDefinition.getHandle(twin));
  assert.equal(Tr2VertexDefinition.findElement(definition, { usage: "COLOR", usageIndex: 1 }).offset, 28);
});
