import assert from "node:assert/strict";
import { test } from "node:test";

import { WebgpuVertexFormat, WebgpuVertexBufferLayout } from "../../../npm/dist/trinityal/webgpu/index.js";
import { VertexElementType } from "../../../npm/dist/resource/geometry/index.js";
import { resolveBindingPlan } from "../../../npm/dist/trinityal/index.js";
import { Tr2VertexDefinition } from "../../../npm/dist/trinity/core/index.js";

/** A declaration element. */
const element = (type, elementCount, offset = 0) => ({ type, elementCount, offset });

test("a 32-bit format exists at every width, and one component takes no suffix", () =>
{
  assert.equal(WebgpuVertexFormat(element("Float32", 1)), "float32");
  assert.equal(WebgpuVertexFormat(element("Float32", 2)), "float32x2");
  assert.equal(WebgpuVertexFormat(element("Float32", 3)), "float32x3");
  assert.equal(WebgpuVertexFormat(element("Float32", 4)), "float32x4");
});

test("normalization changes the format, not the storage", () =>
{
  // The same two bytes; what differs is whether the shader sees 65535 or 1.0.
  assert.equal(WebgpuVertexFormat(element("UInt16", 2)), "uint16x2");
  assert.equal(WebgpuVertexFormat(element("UInt16Norm", 2)), "unorm16x2");
  assert.equal(WebgpuVertexFormat(element("Int8", 4)), "sint8x4");
  assert.equal(WebgpuVertexFormat(element("Int8Norm", 4)), "snorm8x4");
});

test("float16 has no normalized spelling because it is already a float", () =>
{
  assert.equal(WebgpuVertexFormat(element("Float16", 2)), "float16x2");
  assert.equal(WebgpuVertexFormat(element("Float16", 4)), "float16x4");
});

test("a three-component narrow element is refused rather than widened", () =>
{
  // The trap this exists to prevent: widening to x4 steps four components
  // through a buffer packed at three, and every vertex after the first is read
  // from the wrong offset. That draws a shape, so nothing reports it.
  assert.throws(() => WebgpuVertexFormat(element("Float16", 3)), /no 3-component "float16"/);
  assert.throws(() => WebgpuVertexFormat(element("UInt8Norm", 3)), /no 3-component "unorm8"/);
});

test("a one-component narrow element is refused too", () =>
{
  assert.throws(() => WebgpuVertexFormat(element("Int16", 1)), /no 1-component "sint16"/);
});

test("an unknown element type names itself in the failure", () =>
{
  assert.throws(() => WebgpuVertexFormat(element("PackedTangent", 4)), /Unsupported vertex element type/);
});

test("an unusable element count is refused before a format is chosen", () =>
{
  assert.throws(() => WebgpuVertexFormat(element("Float32", 0)), /unusable element count/);
  assert.throws(() => WebgpuVertexFormat(element("Float32", 5)), /unusable element count/);
});

test("the decomposition reports storage facts, not a format name", () =>
{
  assert.deepEqual(
    VertexElementType(element("Int16Norm", 2)),
    { base: "sint", bits: 16, count: 2, normalized: true, bytes: 4 }
  );
});

test("a layout takes its locations from the binding plan, not from the decl order", () =>
{
  const plan = [
    { registerIndex: 3, element: element("Float32", 3, 12) },
    { registerIndex: 0, element: element("Float32", 3, 0) }
  ];

  const layout = WebgpuVertexBufferLayout(64, plan);

  assert.equal(layout.arrayStride, 64);
  assert.equal(layout.stepMode, "vertex");
  // Sorted by location, which is what the device validator requires.
  assert.deepEqual(layout.attributes.map(a => a.shaderLocation), [ 0, 3 ]);
  assert.deepEqual(layout.attributes.map(a => a.offset), [ 0, 12 ]);
});

test("an unmatched shader input contributes no attribute", () =>
{
  // resolveBindingPlan emits an entry per shader INPUT, so an input the mesh
  // does not supply arrives with a null element. Inventing an attribute for it
  // would bind whatever bytes happen to sit at offset zero.
  const layout = WebgpuVertexBufferLayout(16, [
    { registerIndex: 0, element: element("Float32", 3) },
    { registerIndex: 1, element: null, fallbackType: "FLOAT" }
  ]);

  assert.equal(layout.attributes.length, 1);
  assert.equal(layout.attributes[0].shaderLocation, 0);
});

test("an empty binding plan is a layout with no attributes, not a throw", () =>
{
  assert.deepEqual(WebgpuVertexBufferLayout(0, null), { arrayStride: 0, stepMode: "vertex", attributes: [] });
});

test("Carbon DataType names carry their own count and resolve to the same formats", () =>
{
  // Tr2VertexDefinition items (the blitter's screen quad, sprite pools) carry
  // Carbon's DataType names (Tr2VertexDefinition.h:30-120), not the payload's.
  const carbon = type => ({ type, offset: 0 });
  assert.equal(WebgpuVertexFormat(carbon("FLOAT32_4")), "float32x4");
  assert.equal(WebgpuVertexFormat(carbon("FLOAT32_1")), "float32");
  assert.equal(WebgpuVertexFormat(carbon("FLOAT16_2")), "float16x2");
  assert.equal(WebgpuVertexFormat(carbon("UBYTE_4_NORM")), "unorm8x4");
  assert.equal(WebgpuVertexFormat(carbon("SHORT_2")), "sint16x2");
  assert.equal(WebgpuVertexFormat(carbon("UINT32_3")), "uint32x3");
  assert.deepEqual(VertexElementType(carbon("FLOAT16_4")),
    { base: "float", bits: 16, count: 4, normalized: false, bytes: 8 });
});

test("layout conversion rejects the reported offset32 plus float32x2 in stride32", () =>
{
  const plan = [{ registerIndex: 1, element: element("Float32", 2, 32) }];
  assert.throws(() => WebgpuVertexBufferLayout(32, plan), /offset \(32\).*format size \(8 for float32x2\).*arrayStride \(32\)/);
  assert.equal(WebgpuVertexBufferLayout(40, plan).arrayStride, 40);
});

test("WebGPU layout stride and attribute alignment are checked without a device", () =>
{
  for (const stride of [-4, 2, 6, 3.5, NaN, Infinity])
    assert.throws(() => WebgpuVertexBufferLayout(stride, []), /arrayStride/);
  for (const offset of [-4, 2, 1.5, NaN, Infinity])
    assert.throws(() => WebgpuVertexBufferLayout(16, [{ registerIndex: 0, element: element("Float32", 2, offset) }]), /offset/);
  assert.equal(WebgpuVertexBufferLayout(4, [{ registerIndex: 0, element: element("UInt8", 2, 2) }]).attributes[0].offset, 2);
  assert.throws(() => WebgpuVertexBufferLayout(4, [{ registerIndex: 0, element: element("UInt8", 2, 1) }]), /aligned to 2/);
  assert.equal(WebgpuVertexBufferLayout(0, [{ registerIndex: 0, element: element("Float32", 4) }]).arrayStride, 0, "zero stride is WebGPU's constant stream");
});



/**
 * EveChildInstancedMeshes::RebuildCachedData's combined declaration
 * (EveChildInstancedMeshes.cpp:713-725): the mesh's own items - here one
 * geometry-payload POSITION, as CarbonVertexElements hands them over - then six
 * FLOAT32_4, a UINT32_1 and a UINT32_2 at TEXCOORD8-15 on stream 1 with step
 * rate 1. Carbon resets stream 1's ledger after TEXCOORD10 (:719), so
 * TEXCOORD11-13 restart at offset 0.
 */
function instancedMeshDeclaration(Tr2VertexDefinition)
{
  const elements = new Tr2VertexDefinition();

  elements.items.push({ usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0, stream: 0, instanceStepRate: 0 });
  elements.nextOffset[0] = 12;

  elements.Add("FLOAT32_4", "TEXCOORD", 8, 1, 1);
  elements.Add("FLOAT32_4", "TEXCOORD", 9, 1, 1);
  elements.Add("FLOAT32_4", "TEXCOORD", 10, 1, 1);
  elements.nextOffset[1] = 0;
  elements.Add("FLOAT32_4", "TEXCOORD", 11, 1, 1);
  elements.Add("FLOAT32_4", "TEXCOORD", 12, 1, 1);
  elements.Add("FLOAT32_4", "TEXCOORD", 13, 1, 1);
  elements.Add("UINT32_1", "TEXCOORD", 14, 1, 1);
  elements.Add("UINT32_2", "TEXCOORD", 15, 1, 1);

  return elements;
}

/** The vertex stage's inputs for that declaration, each at its own register. */
const INSTANCED_MESH_INPUTS = [
  { usage: 0, usageIndex: 0, registerIndex: 0 },
  ...[ 8, 9, 10, 11, 12, 13, 14, 15 ].map((usageIndex, index) => ({ usage: 5, usageIndex, registerIndex: index + 1 }))
];

test("Carbon's UINT32 members are WebGPU's uint32 formats", () =>
{
  // dx11 maps them to DXGI_FORMAT_R32_UINT / R32G32_UINT (Tr2VertexLayoutALDx11.cpp:25-76).
  assert.equal(WebgpuVertexFormat({ type: "UINT32_1", offset: 0 }), "uint32");
  assert.equal(WebgpuVertexFormat({ type: "UINT32_2", offset: 0 }), "uint32x2");
  assert.deepEqual(VertexElementType({ type: "UINT32_2" }), { base: "uint", bits: 32, count: 2, normalized: false, bytes: 8 });
});

test("the instanced-mesh declaration builds a per-vertex stream 0 and a per-instance stream 1", () =>
{
  const plan = resolveBindingPlan(instancedMeshDeclaration(Tr2VertexDefinition), INSTANCED_MESH_INPUTS);
  const stream = index => plan.entries.filter(entry => entry.element.stream === index);

  assert.equal(plan.complete, true);

  assert.deepEqual(WebgpuVertexBufferLayout(12, stream(0)), {
    arrayStride: 12, stepMode: "vertex", attributes: [ { shaderLocation: 0, offset: 0, format: "float32x3" } ]
  });

  // The stride is the packer's; 60 is the ledger's extent and a multiple of 4.
  assert.deepEqual(WebgpuVertexBufferLayout(60, stream(1)), {
    arrayStride: 60,
    stepMode: "instance",
    attributes: [
      { shaderLocation: 1, offset: 0, format: "float32x4" },
      { shaderLocation: 2, offset: 16, format: "float32x4" },
      { shaderLocation: 3, offset: 32, format: "float32x4" },
      { shaderLocation: 4, offset: 0, format: "float32x4" },
      { shaderLocation: 5, offset: 16, format: "float32x4" },
      { shaderLocation: 6, offset: 32, format: "float32x4" },
      { shaderLocation: 7, offset: 48, format: "uint32" },
      { shaderLocation: 8, offset: 52, format: "uint32x2" }
    ]
  });
});
