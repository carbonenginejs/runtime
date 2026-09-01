import assert from "node:assert/strict";
import { test } from "node:test";

import { WebgpuGeometryOptions } from "../../../npm/dist/engine/webgpu/index.js";
import { PackLodGeometry } from "../../../npm/dist/resource/geometry/index.js";
import { Tr2VertexDefinition } from "../../../npm/dist/trinity/core/index.js";
import { CarbonVertexElements } from "../../../npm/dist/trinity/core/index.js";

/**
 * The declaration a real EVE hull decodes to: all Float32, stride 64. Confirmed
 * against the decoded GR2 assets, whose channel widths are identical across
 * every hull inspected.
 */
const HULL_DECL = [
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
  { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3, offset: 12 },
  { usage: "Tangent", usageIndex: 0, type: "Float32", elementCount: 4, offset: 24 },
  { usage: "Binormal", usageIndex: 0, type: "Float32", elementCount: 4, offset: 40 },
  { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2, offset: 56 }
];

/** Two triangles' worth of channels over four vertices. */
const CHANNELS = {
  position: [ 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0 ],
  normal: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
  tangent: [ 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1 ],
  binormal: [ 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1 ],
  texcoord0: [ 0, 0, 1, 0, 1, 1, 0, 1 ]
};

const MESH = {
  decl: HULL_DECL,
  vertex: CHANNELS,
  indices: [ { faces: [ 0, 1, 2, 0, 2, 3 ] } ]
};

/** The shader inputs a hull's vertex stage declares, in Carbon usage codes. */
const HULL_INPUTS = [
  { usage: 0, usageIndex: 0, registerIndex: 0 },
  { usage: 2, usageIndex: 0, registerIndex: 3 },
  { usage: 5, usageIndex: 0, registerIndex: 2 }
];

/** A binding plan over the translated declaration. */
function planFor(elements, inputs = HULL_INPUTS)
{
  return Tr2VertexDefinition.resolveBindingPlan(CarbonVertexElements(elements), inputs).entries;
}

test("a real hull declaration packs to the stride its layout already used", () =>
{
  // The hardcoded QuadV5 fixture layout is arrayStride 64. A decoded hull
  // arrives at the same number without being told to.
  const packed = PackLodGeometry(MESH);

  assert.equal(packed.vertex.stride, 64);
  assert.equal(packed.vertex.count, 4);
  assert.equal(packed.vertex.bytes.byteLength, 256);
});

test("a tight stride is widened to something a device will accept", () =>
{
  // Three bytes per vertex: correct for a file, rejected by every device.
  const packed = PackLodGeometry({
    decl: [ { usage: "Color", usageIndex: 0, type: "UInt8Norm", elementCount: 3, offset: 0 } ],
    vertex: { color0: [ 255, 0, 0, 0, 255, 0 ] }
  });

  assert.equal(packed.vertex.stride, 4);
  assert.equal(packed.vertex.count, 2);
  // Widening adds a gap after the last component; the offsets are untouched, so
  // the declaration still describes the result.
  assert.deepEqual([ ...packed.vertex.bytes.subarray(0, 3) ], [ 255, 0, 0 ]);
  assert.deepEqual([ ...packed.vertex.bytes.subarray(4, 7) ], [ 0, 255, 0 ]);
});

test("index width follows the index values", () =>
{
  assert.equal(PackLodGeometry(MESH).index.format, "uint16");
  assert.equal(
    PackLodGeometry({ ...MESH, indices: [ { faces: [ 0, 1, 70000 ] } ] }).index.format,
    "uint32"
  );
});

test("an unindexed mesh omits the index buffer rather than sending an empty one", () =>
{
  const request = WebgpuGeometryOptions({ decl: HULL_DECL, vertex: CHANNELS }, planFor(HULL_DECL));

  assert.equal(Object.hasOwn(request, "indexBuffer"), false);
});

test("the request is shaped as CreateGeometry takes it", () =>
{
  const request = WebgpuGeometryOptions(MESH, planFor(HULL_DECL), { label: "hull" });

  assert.deepEqual(Object.keys(request).sort(), [ "indexBuffer", "label", "vertexBuffers" ]);
  assert.equal(request.vertexBuffers.length, 1);
  assert.equal(request.vertexBuffers[0].slot, 0);
  assert.equal(request.indexBuffer.format, "uint16");
  // The device requires byteLength to divide evenly by the stride.
  assert.equal(request.vertexBuffers[0].data.byteLength % request.vertexBuffers[0].layout.arrayStride, 0);
});

test("locations come from the shader, and unread elements contribute nothing", () =>
{
  const request = WebgpuGeometryOptions(MESH, planFor(HULL_DECL));
  const { attributes } = request.vertexBuffers[0].layout;

  // Three inputs, three attributes - Tangent and Binormal are in the mesh and
  // not in the shader, so they occupy stride but no location.
  assert.deepEqual(attributes.map(a => a.shaderLocation), [ 0, 2, 3 ]);
  // Location 2 is TEXCOORD at offset 56; location 3 is NORMAL at offset 12.
  assert.deepEqual(attributes.map(a => a.offset), [ 0, 56, 12 ]);
  assert.deepEqual(attributes.map(a => a.format), [ "float32x3", "float32x2", "float32x3" ]);
});

test("an untranslated declaration is refused with the reason", () =>
{
  // The failure this message exists for: string usages match no numeric input,
  // every plan entry arrives empty, and the layout would be attribute-free.
  const entries = Tr2VertexDefinition.resolveBindingPlan(HULL_DECL, HULL_INPUTS).entries;

  assert.throws(
    () => WebgpuGeometryOptions(MESH, entries),
    /CarbonVertexElements before resolving the binding plan/
  );
});

test("a mesh with no declaration says so rather than packing nothing", () =>
{
  assert.throws(() => PackLodGeometry({ vertex: CHANNELS }), /no vertex declaration/);
});

test("a LOD's own channels win over the mesh's", () =>
{
  const mesh = {
    decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
    vertex: { position: [ 0, 0, 0 ] },
    lods: [ { vertex: { position: [ 0, 0, 0, 1, 1, 1 ] } } ]
  };

  assert.equal(PackLodGeometry(mesh, 0).vertex.count, 2);
});
