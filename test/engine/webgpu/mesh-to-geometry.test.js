// The chain this exercises did not connect at all before 2026-09-02: a mesh
// area produced a batch whose declaration no shader could match and whose draw
// arguments were null, and no code turned a decoded mesh into device geometry.
//
// It is deliberately an integration test over the real classes. Every one of
// the three defects it covers passed its own unit tests while the chain stayed
// broken, because each half was correct in a vocabulary the other half did not
// speak.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Tr2MeshBase,
  Tr2MeshArea,
  TriRenderBatchAccumulator,
  Tr2PerObjectData,
  Tr2VertexDefinition
} from "../../../npm/dist/trinity/core/index.js";
import { TriBatchType } from "../../../npm/dist/global/consts/graphics/index.js";
import { WebgpuGeometryOptions } from "../../../npm/dist/engine/webgpu/index.js";
import { FixtureEffect } from "../../support/fixtureEffect.js";

/** A hull's declaration, in the producer's vocabulary. */
const DECL = [
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
  { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3, offset: 12 },
  { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2, offset: 24 }
];

const MESH = {
  decl: DECL,
  vertex: {
    position: [ 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0 ],
    normal: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
    texcoord0: [ 0, 0, 1, 0, 1, 1, 0, 1 ]
  },
  // Two areas: a four-triangle hull and a two-triangle decal strip after it.
  indices: [ { faces: [ 0, 1, 2, 0, 2, 3, 0, 1, 3, 1, 2, 3, 0, 1, 2, 0, 2, 3 ] } ]
};

const LOD = {
  ib: { size: 36, stride: 2 },
  areas: [ { firstElement: 0, elementCount: 4 }, { firstElement: 4, elementCount: 2 } ]
};

/** A geometry resource of the shape Tr2MeshBase asks for. */
const GEOMETRY = {
  GetMeshVertexElements: () => DECL,
  GetMeshLod: () => LOD
};

/** The shader's declared vertex inputs, in Carbon usage codes. */
const INPUTS = [
  { usage: 0, usageIndex: 0, registerIndex: 0 },
  { usage: 2, usageIndex: 0, registerIndex: 1 },
  { usage: 5, usageIndex: 0, registerIndex: 2 }
];

function meshWithAreas()
{
  const mesh = new Tr2MeshBase();
  mesh.GetGeometryResource = () => GEOMETRY;

  for (const [ index, count ] of [ [ 0, 1 ], [ 1, 1 ] ])
  {
    const area = new Tr2MeshArea();
    area.SetMaterial(FixtureEffect({ id: `fx${index}` }));
    area.SetIndex(index);
    area.SetCount(count);
    mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, area);
  }

  return mesh;
}

function batchesOf(mesh)
{
  const accumulator = new TriRenderBatchAccumulator();

  mesh.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_OPAQUE, new Tr2PerObjectData());

  return accumulator.GetBatches();
}

test("a mesh area produces draw arguments, where it produced none", () =>
{
  const [ hull, decalStrip ] = batchesOf(meshWithAreas());

  assert.equal(hull.indexCountPerInstance, 12);
  assert.equal(hull.startIndexLocation, 0);

  // The second area starts at triangle 4, so index 12 - the conversion that
  // makes this an integration test rather than two unit tests.
  assert.equal(decalStrip.indexCountPerInstance, 6);
  assert.equal(decalStrip.startIndexLocation, 12);
});

test("the interned declaration matches the shader that will draw it", () =>
{
  const [ hull ] = batchesOf(meshWithAreas());
  const elements = Tr2VertexDefinition.getElements(hull.vertexDeclaration);
  const plan = Tr2VertexDefinition.resolveBindingPlan(elements, INPUTS);

  assert.equal(plan.complete, true, "every shader input is supplied by the mesh");
  assert.equal(plan.unmatched, 0);
});

test("that same declaration realizes into a device geometry request", () =>
{
  const [ hull ] = batchesOf(meshWithAreas());
  const elements = Tr2VertexDefinition.getElements(hull.vertexDeclaration);
  const plan = Tr2VertexDefinition.resolveBindingPlan(elements, INPUTS).entries;

  const request = WebgpuGeometryOptions(MESH, plan, { label: "hull" });
  const [ buffer ] = request.vertexBuffers;

  assert.equal(buffer.layout.arrayStride, 32);
  assert.deepEqual(buffer.layout.attributes.map(a => a.shaderLocation), [ 0, 1, 2 ]);
  assert.deepEqual(buffer.layout.attributes.map(a => a.format), [ "float32x3", "float32x3", "float32x2" ]);
  // Location 1 is NORMAL at offset 12; location 2 is TEXCOORD at offset 24.
  assert.deepEqual(buffer.layout.attributes.map(a => a.offset), [ 0, 12, 24 ]);

  // The device's two hard rules on the pairing of buffer and layout.
  assert.equal(buffer.layout.arrayStride % 4, 0);
  assert.equal(buffer.data.byteLength % buffer.layout.arrayStride, 0);
});

test("the draw arguments address the index buffer that is actually built", () =>
{
  const [ hull, decalStrip ] = batchesOf(meshWithAreas());
  const elements = Tr2VertexDefinition.getElements(hull.vertexDeclaration);
  const plan = Tr2VertexDefinition.resolveBindingPlan(elements, INPUTS).entries;
  const request = WebgpuGeometryOptions(MESH, plan);

  const indexCount = request.indexBuffer.data.byteLength / 2;

  assert.equal(indexCount, 18);
  assert(
    decalStrip.startIndexLocation + decalStrip.indexCountPerInstance <= indexCount,
    "an area's draw must fall inside the index buffer"
  );
});
