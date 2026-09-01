import assert from "node:assert/strict";
import { test } from "node:test";

import { WebgpuVertexFormat, WebgpuVertexBufferLayout } from "../../../npm/dist/engine/webgpu/index.js";
import { VertexElementType } from "../../../npm/dist/resource/geometry/index.js";

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
