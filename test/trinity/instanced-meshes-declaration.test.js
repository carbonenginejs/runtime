// EveChildInstancedMeshes::RebuildCachedData (EveChildInstancedMeshes.cpp:702-739):
// the mesh's elements plus the instance inputs at TEXCOORD8-15 on stream 1.
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import { EveChildInstancedMeshes } from "../../npm/dist/trinity/index.js";
import { Tr2EffectStateManager } from "../../npm/dist/trinity/shader/Tr2EffectStateManager.js";

const DECL = [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ];

function geometry()
{
  const resource = new TriGeometryRes();
  resource.SetPayload({ meshes: [ {
    decl: DECL,
    vertex: { position: [ 0, 0, 0, 1, 0, 0, 1, 1, 0 ] },
    indices: [ { faces: [ 0, 1, 2 ] } ],
    areas: [ { firstElement: 0, elementCount: 1 } ]
  } ] });
  return resource;
}

function effect()
{
  return { GetHashValue: () => 1, GetEffectPathName: () => "res:/fx/a.fx", SetOption() {}, IsGood: () => true };
}

test("RebuildCachedData appends Carbon's instance inputs, with the stream-1 ledger restarted at TEXCOORD11 (cpp:712-727)", () =>
{
  const provider = new EveChildInstancedMeshes();
  provider.AddMesh("res:/geo", false, 0, 0, [ { effect: effect(), batchType: 0, areaIndex: 0, areaCount: 1 } ], [ mat4.create() ]);
  const resource = geometry();
  provider.SetGeometryResource(0, resource);
  const mesh = provider.meshes[0];
  assert.equal(mesh.combinedVertexDeclaration, Tr2EffectStateManager.Unknown);

  provider.RebuildCachedData(resource);
  assert.notEqual(mesh.combinedVertexDeclaration, Tr2EffectStateManager.Unknown);

  const elements = Tr2EffectStateManager.getVertexDeclarationElements(mesh.combinedVertexDeclaration);
  const items = elements.items ?? elements;
  assert.equal(items.length, 1 + 8, "the mesh's element, then eight instance inputs");
  const instance = items.slice(1);
  assert.deepEqual(instance.map(item => item.usageIndex), [ 8, 9, 10, 11, 12, 13, 14, 15 ]);
  assert.deepEqual(instance.map(item => item.type), [ "FLOAT32_4", "FLOAT32_4", "FLOAT32_4", "FLOAT32_4", "FLOAT32_4", "FLOAT32_4", "UINT32_1", "UINT32_2" ]);
  // Carbon quirk: m_nextOffset[1] = 0 after TEXCOORD10 (cpp:719).
  assert.deepEqual(instance.map(item => item.offset), [ 0, 16, 32, 0, 16, 32, 48, 52 ]);
  assert.ok(instance.every(item => item.stream === 1 && item.instanceStepRate === 1));
});

test("a mesh whose geometry has no elements keeps UNINITIALIZED_DECLARATION (cpp:710-712)", () =>
{
  const provider = new EveChildInstancedMeshes();
  provider.AddMesh("res:/geo", false, 0, 0, [ { effect: effect(), batchType: 0, areaIndex: 0, areaCount: 1 } ], [ mat4.create() ]);
  const resource = new TriGeometryRes();
  resource.SetPayload({ meshes: [ { areas: [] } ] });
  provider.SetGeometryResource(0, resource);
  provider.RebuildCachedData(resource);
  assert.equal(provider.meshes[0].combinedVertexDeclaration, Tr2EffectStateManager.Unknown);
});
