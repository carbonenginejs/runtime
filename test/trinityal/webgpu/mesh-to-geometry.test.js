// The chain this exercises did not connect at all before 2026-09-02: a mesh
// area produced a batch whose declaration no shader could match and whose draw
// arguments were null, and no code turned a decoded mesh into device geometry.
//
// It is deliberately an integration test over the real classes. Each of the
// defects it covers passed its own unit tests while the chain stayed
// broken, because each half was correct in a vocabulary the other half did not
// speak.
import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2MeshBase, Tr2MeshArea, TriRenderBatchAccumulator, Tr2PerObjectData } from "../../../npm/dist/trinity/core/index.js";
import { resolveBindingPlan } from "../../../npm/dist/trinityal/index.js";
import { Tr2EffectStateManager } from "../../../npm/dist/trinity/shader/index.js";
import { TriBatchType } from "../../../npm/dist/global/consts/graphics/index.js";
import { FixtureEffect } from "../../support/fixtureEffect.js";

/** A hull's declaration, in the producer's vocabulary. */
const DECL = [
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
  { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3, offset: 12 },
  { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2, offset: 24 }
];

const LOD = {
  ib: { size: 36, stride: 2 },
  areas: [ { firstElement: 0, elementCount: 4 }, { firstElement: 4, elementCount: 2 } ]
};

/** A geometry resource of the shape Tr2MeshBase asks for. */
const GEOMETRY = {
  GetMeshVertexElements: () => DECL,
  GetMeshLod__ScreenSize: () => LOD
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
  const elements = Tr2EffectStateManager.getVertexDeclarationElements(hull.vertexDeclaration);
  const plan = resolveBindingPlan(elements, INPUTS);

  assert.equal(plan.complete, true, "every shader input is supplied by the mesh");
  assert.equal(plan.unmatched, 0);
});
