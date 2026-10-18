// EveEllipseSet builds each ellipse as a closed screen-space ribbon - two vertices per segment point, six indices
// per segment - uploads it through the AL buffers and draws it in the transparent and picking passes
// (EveEllipseSet.cpp:87-100, 189-198, 231-349, 351-489), on the stub backend with a real effect, accumulator and
// context.
import assert from "node:assert/strict";
import test from "node:test";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { Tr2PickType } from "../../npm/dist/global/consts/graphics/tr2PickType.js";
import { Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import {
  EveChildUpdateParams, EveEllipseDefinition, EveEllipseSet, EveUpdateContext, Tr2Effect, Tr2EffectStateManager, Tr2Lod,
  TriSettingsRegistrar, Tr2RenderContext_GetMainThreadRenderContext
} from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";
import { TriRenderBatchAccumulator } from "../../npm/dist/trinity/core/batch/TriRenderBatch/TriRenderBatchAccumulator.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2Renderer } from "../../npm/dist/trinity/core/Tr2Renderer.js";

const FLOATS = 7;

function setup(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  const sets = [];
  t.after(() =>
  {
    for (const set of sets) set.Destroy();
    context.SetRenderContextAL(prior);
  });
  const make = () =>
  {
    const set = new EveEllipseSet();
    sets.push(set);
    return set;
  };
  return { context, make };
}

/** The floats or words a buffer holds, read back through the stub's own storage. */
function uploaded(buffer, context, Type, count)
{
  const mapping = buffer.MapForWriting(context);
  return Array.from(new Type(mapping.data.buffer, mapping.data.byteOffset, count));
}

/** The batches GetBatches commits, recorded by a spy that calls through to a real accumulator. */
function batchesOf(set, type, withData = true)
{
  const accumulator = new TriRenderBatchAccumulator().SetTriPoolAllocator(makePerObjectStore());
  const committed = [];
  const commit = accumulator.Commit.bind(accumulator);
  accumulator.Commit = (batch) =>
  {
    committed.push(batch);
    return commit(batch);
  };
  const data = withData ? set.GetPerObjectData(accumulator) : null;
  set.GetBatches(accumulator, type, data);
  return committed;
}

/** The batches GetPickingBatches commits for a pick of the given types. */
function pickingBatchesOf(set, pickTypes)
{
  const accumulator = new TriRenderBatchAccumulator().SetTriPoolAllocator(makePerObjectStore());
  const committed = [];
  const commit = accumulator.Commit.bind(accumulator);
  accumulator.Commit = (batch) =>
  {
    committed.push(batch);
    return commit(batch);
  };
  set.GetPickingBatches(accumulator, pickTypes, set.GetPerObjectData(accumulator));
  return committed;
}

function near(actual, expected, label, epsilon = 1e-5)
{
  assert.equal(actual.length, expected.length, `${label}: length`);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon, `${label}[${index}]: ${actual[index]} vs ${expected[index]}`);
  }
}

/** One ellipse in the XZ plane: semi-major 4 along X, semi-minor 2 along Z, centred at (1, 2, 3), 16 segments. */
function flatEllipseSet(make)
{
  const set = make();
  set.ribbonSegmentCount = 16;
  assert.equal(set.AddEllipse([ 1, 2, 3 ], 4, 2, [ 0, 1, 0 ], 0), true);
  set.UpdateSyncronous(new EveUpdateContext(), new EveChildUpdateParams());
  return set;
}

test("the ellipse vertex is Carbon's 28-byte EllipseVertex record, aliased on the set", () =>
{
  assert.equal(EveEllipseSet.EllipseVertex.byteSize, 28, "static_assert, EveEllipseSet.cpp:23");
  assert.equal(EveEllipseSet.EllipseVertex.floatCount, FLOATS);
  assert.equal(CjsSchema.getClassName(EveEllipseSet.EllipseVertex), "EveEllipseSetEllipseVertex");
  const vertex = new EveEllipseSet.EllipseVertex();
  assert.equal(vertex.centerPos.length, 3);
  assert.equal(vertex.tangentSide.length, 4);
});

test("a Y normal falls back to the Z reference axis, and the rotation turns the major axis within the plane", () =>
{
  // cpp:33-42: |n x Y|^2 < 1e-3 crosses with Z (|n.X| < |n.Z| is false at 0 < 0).
  const basisU = new Float32Array(3), basisV = new Float32Array(3), n = new Float32Array(3);
  EveEllipseSet.buildOrbitPlaneBasisPython([ 0, 5, 0 ], basisU, basisV, n);
  near(n, [ 0, 1, 0 ], "n is the normalised plane normal");
  near(basisU, [ 1, 0, 0 ], "basisU = n x Z");
  near(basisV, [ 0, 0, 1 ], "basisV = basisU x n");

  // A Z normal crosses with Y: basisU = Z x Y = -X, basisV = -X x Z = Y. Ninety degrees takes the major axis onto
  // basisV, and the minor axis is outU x n.
  const spec = new EveEllipseDefinition();
  spec.planeNormal.set([ 0, 0, 1 ]);
  spec.rotationDegrees = 90;
  const outU = new Float32Array(3), outV = new Float32Array(3);
  EveEllipseSet.buildOrbitEllipseAxes(spec, outU, outV);
  near(outU, [ 0, 1, 0 ], "major axis");
  near(outV, [ 1, 0, 0 ], "minor axis");
});

test("UpdateSyncronous builds two vertices per segment point and a wrapping six-index strip per segment", (t) =>
{
  const { context, make } = setup(t);
  const set = flatEllipseSet(make);

  assert.equal(set._geometryDirty, false, "a successful rebuild clears the dirty flag");
  assert.equal(set._indexCount, 96, "ellipses * 6 * segments");
  assert.equal(set._vertexBuffer.GetDesc().count, 32, "ellipses * 2 * segments");
  assert.equal(set._vertexBuffer.GetDesc().stride, 28);
  assert.equal(set._indexBuffer.GetDesc().stride, 4);

  const vertices = uploaded(set._vertexBuffer, context, Float32Array, 32 * FLOATS);
  // Segment 0 (angle 0): the point is centre + 4 * X, the tangent +Z; left edge then right edge.
  near(vertices.slice(0, 7), [ 5, 2, 3, 0, 0, 1, -1 ], "segment 0 left");
  near(vertices.slice(7, 14), [ 5, 2, 3, 0, 0, 1, 1 ], "segment 0 right");
  // Segment 4 (a quarter turn): centre + 2 * Z, tangent -X.
  near(vertices.slice(8 * FLOATS, 8 * FLOATS + 7), [ 1, 2, 5, -1, 0, 0, -1 ], "segment 4 left");
  // Segment 2 (an eighth turn): the tangent is (-4 sin, 0, 2 cos) normalised.
  const s = Math.sin(Math.PI / 4), c = Math.cos(Math.PI / 4), length = Math.hypot(4 * s, 2 * c);
  near(vertices.slice(4 * FLOATS, 4 * FLOATS + 7), [ 1 + 4 * c, 2, 3 + 2 * s, -4 * s / length, 0, 2 * c / length, -1 ], "segment 2 left");

  const indices = uploaded(set._indexBuffer, context, Uint32Array, 96);
  assert.deepEqual(indices.slice(0, 6), [ 0, 2, 1, 1, 2, 3 ], "curLeft, nextLeft, curRight, curRight, nextLeft, nextRight");
  assert.deepEqual(indices.slice(90, 96), [ 30, 0, 31, 31, 0, 1 ], "the last segment wraps to the first");

  // The local sphere grows from the zero sphere over every point (BoundingSphereUpdate, BoundingSphere.cpp:33-47).
  const sphere = vec4.create();
  assert.equal(set.GetBoundingSphere(sphere), true);
  for (let index = 0; index < 32; index++)
  {
    const point = vertices.slice(index * FLOATS, index * FLOATS + 3);
    assert.ok(Math.hypot(point[0] - sphere[0], point[1] - sphere[1], point[2] - sphere[2]) <= sphere[3] + 1e-3, `covers vertex ${index}`);
  }
});

test("the segment count clamps to 16-512, the axes to 1e-4, and a second ellipse indexes from its own base", (t) =>
{
  const { context, make } = setup(t);
  const set = make();
  set.ribbonSegmentCount = 4;
  set.AddEllipse([ 0, 0, 0 ], 0, -1, [ 0, 1, 0 ], 0);
  set.AddEllipse([ 0, 0, 0 ], 1, 1, [ 0, 1, 0 ], 0);
  set.UpdateSyncronous(new EveUpdateContext(), new EveChildUpdateParams());
  assert.equal(set._indexCount, 2 * 6 * 16, "4 segments clamp up to 16");
  const vertices = uploaded(set._vertexBuffer, context, Float32Array, FLOATS);
  near(vertices.slice(0, 3), [ 1e-4, 0, 0 ], "semi-major clamps to 1e-4", 1e-9);
  const indices = uploaded(set._indexBuffer, context, Uint32Array, 2 * 6 * 16);
  assert.deepEqual(indices.slice(96, 102), [ 32, 34, 33, 33, 34, 35 ], "the second ellipse starts at vertex 32");

  set.ribbonSegmentCount = 1000;
  set.OnModified();
  set.UpdateSyncronous(new EveUpdateContext(), new EveChildUpdateParams());
  assert.equal(set._indexCount, 2 * 6 * 512, "1000 segments clamp down to 512");
});

test("geometry rebuilds only while displayed and dirty; an emptied set drops its buffers", (t) =>
{
  const { make } = setup(t);
  const set = flatEllipseSet(make);
  const ellipse = set.ellipses[0];

  ellipse.semiMajor = 8;
  ellipse.OnModified();
  assert.equal(set._geometryDirty, true, "an edited definition flags its set");
  set.display = false;
  set.UpdateSyncronous(new EveUpdateContext(), new EveChildUpdateParams());
  assert.equal(set._geometryDirty, true, "a hidden set does not rebuild");
  set.display = true;
  const vertexBuffer = set._vertexBuffer.TrinityALImpl_GetObject();
  set.UpdateSyncronous(new EveUpdateContext(), new EveChildUpdateParams());
  assert.equal(set._geometryDirty, false);
  assert.equal(set._vertexBuffer.TrinityALImpl_GetObject(), vertexBuffer, "a buffer large enough is reused");

  set.ClearEllipses();
  assert.equal(set._geometryDirty, true);
  ellipse.OnModified();
  set.UpdateSyncronous(new EveUpdateContext(), new EveChildUpdateParams());
  assert.equal(set._indexCount, 0);
  assert.equal(set._vertexBuffer.IsValid(), false, "no ellipses, no vertex buffer");
  assert.equal(set._indexBuffer.IsValid(), false, "no ellipses, no index buffer");
  assert.equal(set._geometryDirty, false);
});

test("ReleaseResources drops the buffers and declaration, and the next update prepares and rebuilds them", (t) =>
{
  const { make } = setup(t);
  const set = flatEllipseSet(make);
  assert.notEqual(set._vertexDeclHandle, Tr2EffectStateManager.Unknown, "the constructor prepared the declaration");

  set.ReleaseResources(0);
  assert.equal(set._vertexBuffer.IsValid(), false);
  assert.equal(set._indexBuffer.IsValid(), false);
  assert.equal(set._vertexDeclHandle, Tr2EffectStateManager.Unknown);
  assert.equal(set._indexCount, 0);
  assert.equal(set._geometryDirty, true);

  set.UpdateSyncronous(new EveUpdateContext(), new EveChildUpdateParams());
  assert.notEqual(set._vertexDeclHandle, Tr2EffectStateManager.Unknown);
  assert.equal(set._indexCount, 96);
});

test("GetBatches commits one indexed triangle draw in the transparent and picking passes only", (t) =>
{
  const { make } = setup(t);
  const set = flatEllipseSet(make);
  assert.equal(batchesOf(set, TriBatchType.TRIBATCHTYPE_TRANSPARENT).length, 0, "no effect, no batch");

  set.effect = new Tr2Effect();
  const [ batch ] = batchesOf(set, TriBatchType.TRIBATCHTYPE_TRANSPARENT);
  assert.equal(batch.material, set.effect);
  assert.equal(batch.topology, Topology.TOP_TRIANGLES);
  assert.equal(batch.indexCountPerInstance, 96);
  assert.equal(batch.instanceCount, 1);
  assert.equal(batch.stride[0], 28);
  assert.equal(batch.indexStride, 4);
  assert.equal(batch.vertexStreams[0], set._vertexBuffer);
  assert.equal(batch.indexBuffer, set._indexBuffer);
  assert.equal(batch.vertexDeclaration, set._vertexDeclHandle);
  assert.ok(batch.objectData, "the per-object data rides on the batch");

  assert.equal(batchesOf(set, TriBatchType.TRIBATCHTYPE_PICKING).length, 1, "picking draws with the ribbon effect");
  for (const type of [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_ADDITIVE, TriBatchType.TRIBATCHTYPE_DECAL ])
  {
    assert.equal(batchesOf(set, type).length, 0, `batch type ${type}`);
  }
  assert.equal(batchesOf(set, TriBatchType.TRIBATCHTYPE_TRANSPARENT, false).length, 0, "no per-object data, no batch");
  assert.equal(set.HasTransparentBatches(), true);

  assert.equal(pickingBatchesOf(set, Tr2PickType.PICK_TYPE_PICKING).length, 1);
  assert.equal(pickingBatchesOf(set, Tr2PickType.PICK_TYPE_OPAQUE).length, 0, "only picking geometry is asked for");
  set.enablePicking = false;
  assert.equal(pickingBatchesOf(set, Tr2PickType.PICK_TYPE_PICKING).length, 0, "picking disabled");
  assert.equal(set.GetID(3), set);

  set.display = false;
  assert.equal(batchesOf(set, TriBatchType.TRIBATCHTYPE_TRANSPARENT).length, 0, "hidden");
  assert.equal(set.HasTransparentBatches(), false);
});

test("the batch depth and sort value measure the world sphere centre from the view, plus depthOffset", (t) =>
{
  const { context, make } = setup(t);
  const set = flatEllipseSet(make);
  set.effect = new Tr2Effect();
  set.depthOffset = 2;
  Tr2Renderer.SetViewTransform(mat4.fromTranslation(mat4.create(), [ 0, 0, -40 ]));
  Tr2Renderer.SetProjectionTransform(mat4.perspective(mat4.create(), Math.PI / 3, 1, 1, 100));
  const radius = Tr2Renderer.GetFrustumRadius();
  assert.ok(radius > 0);

  // The world transform is the identity, so the world centre is the local sphere centre.
  const sphere = vec4.create();
  set.GetBoundingSphere(sphere);
  const distance = Math.hypot(sphere[0], sphere[1], sphere[2] - 40);
  assert.ok(Math.abs(set.GetSortValue() - (distance + 2)) < 1e-4, "GetSortValue (cpp:465-471)");

  const [ batch ] = batchesOf(set, TriBatchType.TRIBATCHTYPE_TRANSPARENT);
  const z = Math.min(Math.max((distance + 2) / radius, 0), 1);
  assert.ok(Math.abs(batch.depth - 0xFFFFFFF * (1 - z)) < 64, `depth ${batch.depth} (cpp:404-409)`);

  set.depthOffset = 1e9;
  assert.equal(batchesOf(set, TriBatchType.TRIBATCHTYPE_TRANSPARENT)[0].depth, 0, "beyond the frustum radius clamps to 0");
});

test("the set is visible from its lowest visible LOD with geometry, and then collected as a renderable", (t) =>
{
  const { make } = setup(t);
  const set = make();
  set.Setup(null, null, null, Tr2Lod.TR2_LOD_MEDIUM);
  assert.equal(set.lowestLodVisible, Tr2Lod.TR2_LOD_MEDIUM);

  set.UpdateVisibility(new EveUpdateContext(), mat4.create(), Tr2Lod.TR2_LOD_HIGH);
  assert.equal(set._isVisible, false, "no geometry yet");

  set.AddEllipse([ 0, 0, 0 ], 1, 1, [ 0, 1, 0 ], 0);
  set.UpdateSyncronous(new EveUpdateContext(), new EveChildUpdateParams());
  set.UpdateVisibility(new EveUpdateContext(), mat4.create(), Tr2Lod.TR2_LOD_LOW);
  assert.equal(set._isVisible, false, "below lowestLodVisible");
  const renderables = [];
  set.GetRenderables(renderables);
  assert.deepEqual(renderables, []);

  set.UpdateVisibility(new EveUpdateContext(), mat4.create(), Tr2Lod.TR2_LOD_MEDIUM);
  set.GetRenderables(renderables);
  assert.deepEqual(renderables, [ set ]);

  set.display = false;
  set.UpdateVisibility(new EveUpdateContext(), mat4.create(), Tr2Lod.TR2_LOD_HIGH);
  assert.equal(set._isVisible, false, "hidden");
});

test("UpdateAsyncronous places the set under its parent, and the bounds and per-object data follow", (t) =>
{
  const { make } = setup(t);
  const set = flatEllipseSet(make);
  set.translation.set([ 10, 0, 0 ]);
  const params = new EveChildUpdateParams();
  // A rotating, scaling parent: a quarter turn about Z, scale 2, then a move to (0, 5, 0).
  mat4.fromRotationTranslationScale(params.localToWorldTransform, quat.setAxisAngle(quat.create(), [ 0, 0, 1 ], Math.PI / 2),
    [ 0, 5, 0 ], [ 2, 2, 2 ]);
  set.UpdateAsyncronous(new EveUpdateContext(), params);

  // Carbon (row-vector): local * parent - the local move first. (10, 0, 0) * 2, turned onto +Y, then + (0, 5, 0).
  near(set.worldTransform.slice(12, 15), [ 0, 25, 0 ], "world translation");
  const transform = mat4.create();
  assert.equal(set.GetLocalToWorldTransform(transform), transform);
  near(transform, set.worldTransform, "GetLocalToWorldTransform");

  const local = vec4.clone(set._boundingSphere);
  const world = vec4.create();
  set.GetBoundingSphere(world);
  near([ world[3] ], [ local[3] * 2 ], "radius scales by the longest basis row");
  near(world.slice(0, 3), [ -2 * local[1], 25 + 2 * local[0], 2 * local[2] ], "centre is TransformCoord'd");

  const accumulator = new TriRenderBatchAccumulator().SetTriPoolAllocator(makePerObjectStore());
  const data = set.GetPerObjectData(accumulator);
  assert.ok(Math.abs(data.vs.GetData()[7] - 25) < 1e-4, "vs WorldMat transposed: translation y at [7]");
  assert.ok(Math.abs(data.ps.GetData()[7] - 25) < 1e-4, "ps WorldMat transposed: translation y at [7]");
  assert.ok(Math.abs(data.vs.GetData()[1] + 2) < 1e-4, "vs WorldMat transposed: basis element _21 at [1]");
});

test("__init__ creates the configured ribbon effect only for a set without one", (t) =>
{
  const { make } = setup(t);
  const prior = EveEllipseSet.ellipseRibbonEffectPath;
  t.after(() =>
  {
    EveEllipseSet.ellipseRibbonEffectPath = prior;
  });

  const setting = TriSettingsRegistrar.getSettings().FindSetting("ellipseRibbonEffectPath");
  assert.equal(setting.owner, EveEllipseSet, "TRI_REGISTER_SETTING( \"ellipseRibbonEffectPath\" ), cpp:67-68");
  assert.equal(setting.carbon, true);

  const unconfigured = make();
  EveEllipseSet.ellipseRibbonEffectPath = "";
  unconfigured.__init__();
  assert.equal(unconfigured.effect, null, "an empty path creates nothing");

  EveEllipseSet.ellipseRibbonEffectPath = "res:/Graphics/Effect/Managed/Space/UI/EllipseRibbon.fx";
  const created = make();
  created.__init__();
  assert.ok(created.effect, "the configured effect is created");
  assert.equal(created.effect.GetEffectPathName(), "res:/Graphics/Effect/Managed/Space/UI/EllipseRibbon.fx");
  assert.equal(created.effect.insideStartUpdate, false, "the update batch is closed");

  const assigned = make();
  const effect = new Tr2Effect();
  assigned.effect = effect;
  assigned.__init__();
  assert.equal(assigned.effect, effect, "an assigned effect is retained");
});

test("__init__ and Destroy rebind and unbind the definitions' dirty callbacks", (t) =>
{
  const { make } = setup(t);
  const set = make();
  const ellipse = new EveEllipseDefinition();
  set.ellipses.push(ellipse);
  set._geometryDirty = false;
  set.__init__();
  ellipse.OnModified();
  assert.equal(set._geometryDirty, true, "a hydrated definition is bound");

  set.Destroy();
  set._geometryDirty = false;
  ellipse.OnModified();
  assert.equal(set._geometryDirty, false, "a destroyed set no longer hears its definitions");
});
