import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { GrannyBoneOffset, Tr2DepthStencil, Tr2DirectInstanceData, Tr2ExpressionTermInfo, Tr2GpuBuffer, Tr2InstancedMesh, Tr2Mesh, Tr2MeshArea, Tr2MeshBase, Tr2PrimaryRenderContext, Tr2RenderContext, Tr2RenderTarget, Tr2RuntimeGpuBuffer, Tr2RuntimeInstanceData, Tr2SwapChain, Tr2VariableStore, Tr2VisibilityResults, TriDevice, TriObserverLocal, TriProjection, TriRect, TriSettings, TriVariable, TriView, TriViewport } from "../npm/dist/trinityCore/index.js";
import { Tr2PresentParameters } from "../npm/dist/ui/index.js";
import { TriBatchType } from "../npm/dist/generated/trinityCore/enums.js";
import { Tr2DebugRenderer } from "../npm/dist/trinityCore/Tr2DebugRenderer.js";
import { Tr2ParticleElementDeclaration } from "../npm/dist/particle/Tr2ParticleElementDeclaration.js";
import { Tr2ParticleSystem } from "../npm/dist/generated/particle/Tr2ParticleSystem.js";
import { Tr2HostBitmap } from "../npm/dist/generated/trinityCore/Tr2HostBitmap.js";
import { Tr2SSAO } from "../npm/dist/generated/trinityCore/Tr2SSAO.js";
import { Tr2BoundingLineSet } from "../npm/dist/trinityCore/Tr2BoundingLineSet.js";
import { Tr2LineSet } from "../npm/dist/trinityCore/Tr2LineSet.js";
import { Tr2LineGraph } from "../npm/dist/trinityCore/Tr2LineGraph.js";
import { Tr2SolidSet } from "../npm/dist/trinityCore/Tr2SolidSet.js";
import { TriRigidOrientation } from "../npm/dist/trinityCore/TriRigidOrientation.js";
import { TriTorque } from "../npm/dist/trinityCore/TriTorque.js";
import { TriLineSet } from "../npm/dist/trinityCore/TriLineSet.js";


const { TermType } = Tr2ExpressionTermInfo;


function assertEquals(actual, expected, message)
{
  if (actual !== expected)
  {
    throw new Error(message || `expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertAlmostEquals(actual, expected, epsilon = 1e-6)
{
  if (Math.abs(actual - expected) > epsilon)
  {
    throw new Error(`expected ${expected}, got ${actual}`);
  }
}

function assertMatrixValues(actual, expected)
{
  assertEquals(actual.length, 16);
  for (let i = 0; i < 16; i++)
  {
    assertAlmostEquals(actual[i], expected[i]);
  }
}

test("generated Trinity value records use source-backed types, defaults, and accessors", () =>
{
  const ssao = new Tr2SSAO();
  assertEquals(ssao.enabled, true);
  assertEquals(ssao.zoomLevel, 5);
  assertEquals(ssao.radius, 6);
  assertEquals(ssao.shadowPower, 2.6);
  assertEquals(ssao.cortaoMipBias, -4);
  assertEquals(CjsSchema.getField(Tr2SSAO, "shadowClamp")?.type.kind, "float32");

  const bitmap = new Tr2HostBitmap();
  assertEquals(bitmap.width, 0);
  assertEquals(bitmap.height, 0);
  assertEquals(bitmap.imageType, Tr2HostBitmap.TextureType.TEX_TYPE_INVALID);
  assertEquals(CjsSchema.getField(Tr2HostBitmap, "format")?.type.kind, "int32");
});

test("Tr2DebugRenderer stores Carbon option, selection, and color state", () =>
{
  const renderer = new Tr2DebugRenderer();
  const owner = { name: "ship" };
  renderer.SetDefaultOptions(["Bounds"]);
  assertEquals(renderer.HasOption({}, "Bounds"), true);
  renderer.SetOptions(owner, ["Volumes", "Normals"]);
  assertEquals(renderer.GetOptions(owner).join(","), "Volumes,Normals");
  assertEquals(renderer.HasOption(owner, "Volumes"), true);
  assertEquals(renderer.HasOption(owner, "Bounds"), false);
  renderer.SetSelectedObjects([[owner, 0]]);
  assertEquals(renderer.IsSelected(owner), true);
  renderer.SetColorForOption("Volumes", [0.25, 0.5, 0.75, 1]);
  assertEquals(renderer.GetColorForOption("Volumes")[2], 0.75);
  assertEquals(renderer.GetColorForOption("Missing"), null);
  renderer.SetOptions(owner, []);
  assertEquals(renderer.GetOptions(owner).length, 0);
});

test("generated primitive sets retain CPU geometry and submission state", () =>
{
  const red = vec4.fromValues(1, 0, 0, 1);
  const green = vec4.fromValues(0, 1, 0, 1);
  const blue = vec4.fromValues(0, 0, 1, 1);
  const white = vec4.fromValues(1, 1, 1, 1);

  const lines = new Tr2LineSet();
  lines.AddLine(vec3.fromValues(0, 0, 0), red, vec3.fromValues(1, 0, 0), green);
  lines.AddPickingTriangle(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 0, 0), vec3.fromValues(0, 1, 0));
  assertEquals(lines.SubmitChanges(), true);
  assertEquals(lines.currentSubmittedLineCount, 1);
  assertEquals(lines.currentSubmittedTriangleCount, 1);
  lines.SetCurrentColor(white);
  assert.deepEqual(Array.from(lines.lines[0].color1), Array.from(white));
  assert.deepEqual(Array.from(lines.lines[0].color2), Array.from(white));
  lines.ClearLines();
  lines.ClearPickingTriangles();
  lines.SubmitChanges();
  assertEquals(lines.currentSubmittedLineCount, 0);
  assertEquals(lines.currentSubmittedTriangleCount, 0);
  assertEquals(lines.maxCurrentLineCount, 1);
  assertEquals(lines.maxCurrentTriangleCount, 1);

  const solids = new Tr2SolidSet();
  solids.AddTriangle(
    vec3.fromValues(0, 0, 0), red,
    vec3.fromValues(1, 0, 0), green,
    vec3.fromValues(0, 1, 0), blue
  );
  solids.SubmitChanges();
  assertEquals(solids.currentSubmittedTriangleCount, 1);
  assertAlmostEquals(solids.triangles[0].normal[0], 0);
  assertAlmostEquals(solids.triangles[0].normal[1], 0);
  assertAlmostEquals(solids.triangles[0].normal[2], 1);
  assert.deepEqual(Array.from(solids.GetCenterOfMass()).map(value => Math.round(value * 1e6) / 1e6), [0.333333, 0.333333, 0]);
  solids.SetCurrentColor(white);
  assert.deepEqual(Array.from(solids.triangles[0].color3), Array.from(white));

  const bounds = new Tr2BoundingLineSet();
  bounds.UpdateBounds(vec3.fromValues(-1, -2, -3), vec3.fromValues(4, 5, 6));
  assert.deepEqual(Array.from(bounds.minBounds), [-1, -2, -3]);
  assert.deepEqual(Array.from(bounds.maxBounds), [4, 5, 6]);
  assertEquals(bounds.lines.length, 12);
  assertEquals(bounds.triangles.length, 12);
  assertEquals(bounds.currentSubmittedLineCount, 12);
  assertEquals(bounds.currentSubmittedTriangleCount, 12);
});

test("Tr2LineGraph preserves Carbon's circular statistics history", () =>
{
  const graph = new Tr2LineGraph();
  assertEquals(graph.GetSize(), 200);
  graph.SetSize(3);
  graph.AddMarker("start");
  assertEquals(graph.Add(1), true);
  graph.Add(2);
  graph.AddMarker("wrap");
  graph.AddMarker("same sample");
  graph.Add(3);
  assert.deepEqual(graph.GetStatsHistory(), [1, 2, 3]);
  graph.Add(4);
  assert.deepEqual(graph.GetStatsHistory(), [2, 3, 4]);
  graph.SetSize(0);
  assert.deepEqual(graph.GetStatsHistory(), []);
  assertEquals(graph.Add(5), false);
});

test("TriRigidOrientation sorts and integrates Carbon torque states", () =>
{
  const first = new TriTorque();
  first.time = 0;
  first.omega0[0] = 1;
  const second = new TriTorque();
  second.time = 1;
  const orientation = new TriRigidOrientation();
  orientation.states.push(second, first);
  orientation.Sort();
  assertEquals(orientation.states[0], first);
  assertAlmostEquals(second.omega0[0], Math.exp(-1));
  assertAlmostEquals(second.omega0[1], 0);
  assertAlmostEquals(second.omega0[2], 0);
  assertAlmostEquals(second.rot0[0], Math.sin(1 - Math.exp(-1)));
  assertAlmostEquals(second.rot0[3], Math.cos(1 - Math.exp(-1)));
  assert.deepEqual(Array.from(orientation.value), Array.from(first.rot0));
});

test("TriLineSet builds Carbon debug geometry and records render intent", () =>
{
  const lines = new TriLineSet();
  lines.Add([0, 0, 0], 0x11223344, [1, 0, 0], 0x55667788);
  assertEquals(lines.vertices.length, 2);
  assertEquals(lines.vertices[0].color, 0x11443322);
  assertEquals(lines.vertices[1].color, 0x55887766);
  lines.SetCurrentColor(0xaabbccdd);
  assertEquals(lines.vertices[0].color, 0xaaddccbb);
  lines.SetDefaultColor(0x01020304);
  lines.AddLines([[[0, 0, 0], [0, 1, 0]]]);
  assertEquals(lines.vertices.at(-1).color, 0x01040302);
  lines.AddBox([-1, -1, -1], [1, 1, 1]);
  assertEquals(lines.vertices.length, 28);
  lines.AddSphere([0, 0, 0], 1, 3);
  assertEquals(lines.vertices.length, 156);
  const context = new Tr2RenderContext();
  assertEquals(lines.Render(context), true);
  assertEquals(context.GetIntents().at(-1).type, "draw-line-set");
  assertEquals(context.GetIntents().at(-1).lineSet, lines);
  lines.Clear();
  assertEquals(lines.Render(context), false);
});

test("Carbon device graph descriptions remain canonical runtime-trinity classes", () =>
{
  const graphClasses = [
    TriDevice,
    Tr2RenderContext,
    Tr2PrimaryRenderContext,
    Tr2RenderTarget,
    Tr2DepthStencil,
    Tr2GpuBuffer,
    Tr2RuntimeGpuBuffer,
    Tr2SwapChain,
    Tr2PresentParameters
  ];
  for (const Class of graphClasses)
  {
    new Class();
    assertEquals(CjsSchema.GetConstructor(Class.name), Class);
  }
});

test("TriSettings adapts Carbon's registered native pointers to typed JavaScript values", () =>
{
  const settings = new TriSettings();
  settings.RegisterSetting("enabled", true);
  settings.RegisterSetting("quality", 2);
  settings.RegisterSetting("effectPath", "res:/effect.fx");
  assertEquals(settings.GetValue("quality"), 2);
  assertEquals(settings.FindSetting("missing"), null);

  settings.SetValue("quality", 3);
  assertEquals(settings.GetValue("quality"), 3);
  assert.throws(() => settings.SetValue("quality", "high"), TypeError);
  assert.throws(() => settings.GetValue("missing"), RangeError);
  assertEquals(settings.__repr__(), "{'effectPath':'res:/effect.fx', 'enabled':True, 'quality':3, }");
  assertEquals(CjsSchema.GetConstructor("TriSettings"), TriSettings);
  assertEquals(CjsSchema.getField(TriSettings, "entry"), null);
  assertEquals(CjsSchema.getField(TriSettings, "map"), null);
});

test("GrannyBoneOffset stores, binds, and applies Carbon bone corrections", () =>
{
  const offsets = new GrannyBoneOffset();
  assertEquals(offsets.Initialize(), true);
  assertEquals(offsets.HaveTransforms(), false);
  offsets.SetOffset("Head", 1, 2, 3);
  assertEquals(offsets.HaveTransforms(), true);
  assertEquals(offsets.NeedRebind(1), true);
  offsets.BindToRig(["Head"]);
  assertEquals(offsets.NeedRebind(1), false);

  const result = mat4.create();
  assertEquals(offsets.Apply(result, 0, mat4.create(), mat4.create()), true);
  assertEquals(result[12], 1);
  assertEquals(result[13], 2);
  assertEquals(result[14], 3);
  assertEquals(offsets.Apply(result, 1, mat4.create(), mat4.create()), false);

  offsets.SetRotation("Head", 0, 0, 0, 1);
  assertEquals(offsets.NeedRebind(1), true);
  offsets.ClearTransforms();
  assertEquals(offsets.HaveTransforms(), false);
  assertEquals(CjsSchema.getField(GrannyBoneOffset, "riggedTransforms"), null);
});

test("device graph descriptions keep Carbon defaults without realizing a backend", () =>
{
  const device = new TriDevice();
  assertEquals(device.presentationInterval, 1);
  assertEquals(device.multiSampleType, 0);
  assertEquals(device.upscalingSetting, 1);
  assertEquals(CjsSchema.getField(TriDevice, "adapterWidth")?.type.kind, "uint32");

  const target = new Tr2RenderTarget();
  assertEquals(target.type, 6);
  assertEquals(target.isValid, false);
  assertEquals(new Tr2DepthStencil().format, 7);

  const buffer = new Tr2GpuBuffer();
  assertEquals(buffer.creationFlags, 0);
  assertEquals(buffer.isValid, false);
  assertEquals(CjsSchema.getField(Tr2GpuBuffer, "creationFlags")?.type.kind, "uint32");

  const present = new Tr2PresentParameters();
  assertEquals(present.backBufferWidth, 0);
  assertEquals(present.windowed, false);
  assertEquals(CjsSchema.getField(Tr2PresentParameters, "windowed")?.type.kind, "boolean");

  assertEquals(TriDevice.ThrottlingReason.WINDOW_HIDDEN, 2);
  assertEquals(TriDevice.ThrottlingReason.THERMAL_STATE, 4);
  assertEquals(Tr2GpuBuffer.CreationFlags.DRAW_INDIRECT, 4);
  assertEquals(Tr2RenderContext.TextureAddressMode.TA_WRAP, 1);
  assertEquals(Tr2RenderContext.TextureFilter.TF_ANISOTROPIC, 3);
});

test("mesh graph routes every Carbon batch type without realizing geometry", () =>
{
  const mesh = new Tr2Mesh();
  const expected = [
    "opaqueAreas", "decalAreas", "transparentAreas", "depthAreas",
    "additiveAreas", "pickableAreas", "mirrorAreas", "decalNormalAreas",
    "depthNormalAreas", "opaquePrepassAreas", "decalPrepassAreas",
    "geometryEraserAreas", "flareAreas", "distortionAreas"
  ];
  assertEquals(mesh.GetAreasCount(), 14);
  for (let index = 0; index < expected.length; index++)
  {
    assertEquals(mesh.GetAreas(index), mesh[expected[index]], `batch ${index}`);
  }
  assertEquals(mesh.GetAreas(-1), null);
  assertEquals(mesh.GetAreas(14), null);
  assertEquals(mesh.GetAreas("4"), null);
  assertEquals(new Set(expected.map(name => mesh[name])).size, 14);

  const opaque = new Tr2MeshArea();
  const flare = new Tr2MeshArea();
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, opaque);
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_FLARE, flare);
  const all = mesh.GetAllAreas();
  assertEquals(all[0], opaque);
  assertEquals(all[1], flare);
  all.length = 0;
  assertEquals(mesh.opaqueAreas.length, 1);
  assertEquals(mesh.flareAreas.length, 1);
});

test("SOF shield mesh construction stays a CPU object graph", () =>
{
  const shader = { calls: 0, SetOption() { this.calls++; } };
  const area = new Tr2MeshArea();
  area.SetMaterial(shader);
  area.SetCount(7);
  area.SetIndex(2);
  assertEquals(area.GetMaterialInterface(), shader);
  assertEquals(area.GetCount(), 7);
  assertEquals(area.GetIndex(), 2);
  assertEquals(area.count, 7);
  assertEquals(CjsSchema.getField(Tr2MeshArea, "effect")?.io?.persist, true);
  assertEquals(CjsSchema.getField(Tr2MeshArea, "display")?.io?.persist, undefined);

  const mesh = new Tr2Mesh();
  mesh.SetMeshResPath("res:/shield.gr2");
  mesh.GetAreas(TriBatchType.TRIBATCHTYPE_ADDITIVE).push(area);
  assertEquals(mesh.geometryResPath, "res:/shield.gr2");
  assertEquals(mesh.additiveAreas[0], area);
  assertEquals(mesh.SetShaderOption("SHIELD", "1"), true);
  assertEquals(shader.calls, 1);

  const resource = { GetPath: () => "res:/provided.gr2", IsLoading: () => true };
  mesh.SetGeometryRes(resource);
  assertEquals(mesh.geometry, resource);
  assertEquals(mesh.geometryResPath, "");
  assertEquals(mesh.GetGeometryResPath(), "res:/provided.gr2");
  assertEquals(mesh.isLoading, true);
  assertEquals(mesh.Initialize(), true);
  assertEquals(mesh.OnModified(), true);
});

test("mesh bounds adjustment is corrected source-backed graph data", () =>
{
  const mesh = new Tr2MeshBase();
  assertEquals(mesh.maxVertexScale, 1);
  assertEquals(mesh.maxVertexDisplacement, 0);
  assertEquals(mesh.rotatesVertices, false);
  assertEquals(CjsSchema.getField(Tr2MeshBase, "maxVertexScale")?.type?.kind, "float32");
  assertEquals(CjsSchema.getField(Tr2MeshBase, "rotatesVertices")?.type?.kind, "boolean");
  const input = { maxLocalScale: 3, maxLocalDisplacement: 4, rotatesVertices: true };
  mesh.SetMaterialBoundsAdjustment(input);
  const output = mesh.GetMaterialBoundsAdjustment();
  assertEquals(output.maxLocalScale, 3);
  assertEquals(output.maxLocalDisplacement, 4);
  assertEquals(output.rotatesVertices, true);
  input.maxLocalScale = 99;
  assertEquals(mesh.maxVertexScale, 3);
});

test("instanced meshes retain the Tr2Mesh CPU graph and distinct resource paths", () =>
{
  const mesh = new Tr2InstancedMesh();
  assertEquals(mesh instanceof Tr2Mesh, true);
  assertEquals(mesh.boundsMethod, Tr2InstancedMesh.BoundsMethod.STATIC);
  assertEquals(mesh.instanceGeometryResPath, "");
  assertEquals(mesh.instanceGeometryResource, null);
  assertEquals(mesh.instanceMeshIndex, 0);
  assertEquals(mesh.maxInstanceSize, 0);
  assertEquals(Object.isFrozen(Tr2InstancedMesh.BoundsMethod), true);
  assertEquals(CjsSchema.getField(Tr2InstancedMesh, "geometryResPath")?.type.kind, "string");
  assertEquals(CjsSchema.getField(Tr2InstancedMesh, "instanceGeometryResource")?.io?.persistOnly, true);

  mesh.SetMeshResPath("res:/mesh/base.gr2");
  mesh.SetInstanceMeshResPath("res:/mesh/instances.gr2");
  assertEquals(mesh.geometryResPath, "res:/mesh/base.gr2");
  assertEquals(mesh.GetInstanceMeshResPath(), "res:/mesh/instances.gr2");

  const instanceData = new Tr2RuntimeInstanceData();
  mesh.SetInstanceGeometryRes(instanceData);
  assertEquals(mesh.GetInstanceGeometryResource(), instanceData);
  mesh.opaqueAreas.push(new Tr2MeshArea());
  assertEquals(mesh.GetAreas(TriBatchType.TRIBATCHTYPE_OPAQUE).length, 1);

  mesh.SetDynamicBounds(3);
  assertEquals(mesh.boundsMethod, Tr2InstancedMesh.BoundsMethod.DYNAMIC);
  assertEquals(mesh.maxInstanceSize, 3);
  mesh.SetDynamicScaledBounds(4);
  assertEquals(mesh.boundsMethod, Tr2InstancedMesh.BoundsMethod.DYNAMIC_SCALED);
  assertEquals(mesh.maxInstanceSize, 4);
});

test("runtime instance data packs Carbon SOF records without realizing a GPU buffer", () =>
{
  const data = new Tr2RuntimeInstanceData();
  const layout = [
    { usage: "TEXCOORD", usageIndex: 0, type: "FLOAT32_4", name: "transform0" },
    { usage: "TEXCOORD", usageIndex: 1, type: "FLOAT32_4", name: "transform1" },
    { usage: "TEXCOORD", usageIndex: 2, type: "FLOAT32_4", name: "transform2" },
    { usage: "TEXCOORD", usageIndex: 3, type: "FLOAT32_4", name: "lastTransform0" },
    { usage: "TEXCOORD", usageIndex: 4, type: "FLOAT32_4", name: "lastTransform1" },
    { usage: "TEXCOORD", usageIndex: 5, type: "FLOAT32_4", name: "lastTransform2" },
    { usage: "TEXCOORD", usageIndex: 6, type: "BYTE_4", name: "boneIndex" }
  ];
  data.SetElementLayout(layout);
  assertEquals(data.GetStride(), 100);
  assertEquals(Object.isFrozen(data.GetLayout()), true);

  const row = {
    transform0: [1, 2, 3, 4],
    transform1: [5, 6, 7, 8],
    transform2: [9, 10, 11, 12],
    lastTransform0: [13, 14, 15, 16],
    lastTransform1: [17, 18, 19, 20],
    lastTransform2: [21, 22, 23, 24],
    boneIndex: 0x01020304
  };
  data.SetData([row]);
  row.transform0[0] = 99;
  row.boneIndex = 0;

  assertEquals(data.count, 1);
  assertEquals(data.GetCount(), 1);
  assertEquals(data.dirty, true);
  assertEquals(data.dataRevision, 0);
  const bytes = data.GetData();
  assertEquals(bytes.byteLength, 100);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assertAlmostEquals(view.getFloat32(0, true), 1);
  assertAlmostEquals(view.getFloat32(92, true), 24);
  assertEquals(view.getUint8(96), 4);
  assertEquals(view.getUint8(97), 3);
  assertEquals(view.getUint8(98), 2);
  assertEquals(view.getUint8(99), 1);
  assertEquals(data.GetItemElement(0, 6), 0x01020304);

  const transform = data.GetItemElement(0, 0);
  transform[0] = 77;
  assertEquals(data.GetItemElement(0, 0)[0], 1);
  data.SetItemElement(0, 0, [2, 3, 4, 5]);
  assertAlmostEquals(new DataView(data.GetData().buffer).getFloat32(0, true), 2);
  assertEquals(data.UpdateData(), true);
  assertEquals(data.UpdateData(), false);
  assertEquals(data.dirty, false);
  assertEquals(data.dataRevision, 1);
  assertEquals(Object.hasOwn(data, "gpuBuffer"), false);

  const values = data.GetValues({ persistOnly: true });
  assert.deepEqual(values.layout, layout);
  assert.deepEqual(values.rows[0], [
    [2, 3, 4, 5],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
    [17, 18, 19, 20],
    [21, 22, 23, 24],
    0x01020304
  ]);
  assert.equal(Object.hasOwn(values, "data"), false);

  const restored = Tr2RuntimeInstanceData.from(values);
  assert.equal(restored.GetStride(), 100);
  assert.equal(restored.GetCount(), 1);
  assert.deepEqual(restored.GetItem(0), values.rows[0]);
  assert.equal(restored.GetData().byteLength, 100);
  assert.equal(Object.hasOwn(restored, "gpuBuffer"), false);
});

test("runtime instance data builds the standard transform stream as a non-GPU graph", () =>
{
  const data = new Tr2RuntimeInstanceData();
  const transform = mat4.fromRotationTranslationScale(
    mat4.create(),
    [0, 0, 0, 1],
    [5, 6, 7],
    [2, 3, 4]
  );
  const previousTransform = mat4.fromTranslation(mat4.create(), [1, 2, 3]);
  const maxScale = data.SetTransformInstances([{ transform, previousTransform, boneIndex: 9 }]);

  assert.equal(maxScale, 4);
  assert.equal(data.GetStride(), 100);
  assert.equal(data.GetCount(), 1);
  assert.deepEqual(data.layout, Tr2RuntimeInstanceData.TransformLayout);
  assert.deepEqual(data.GetItem(0), [
    [2, 0, 0, 5],
    [0, 3, 0, 6],
    [0, 0, 4, 7],
    [1, 0, 0, 1],
    [0, 1, 0, 2],
    [0, 0, 1, 3],
    9
  ]);
  assert.equal(data.explicitBoundingBox, true);
  assert.deepEqual(Array.from(data.aabbMin), [5, 6, 7]);
  assert.deepEqual(Array.from(data.aabbMax), [5, 6, 7]);
  assert.equal(data.dirty, false);
  assert.equal(Object.hasOwn(data, "gpuBuffer"), false);

  const restored = Tr2RuntimeInstanceData.from(data.GetValues({ persistOnly: true }));
  assert.deepEqual(restored.GetItem(0), data.GetItem(0));
  assert.deepEqual(Array.from(restored.aabbMin), [5, 6, 7]);
  assert.deepEqual(Array.from(restored.aabbMax), [5, 6, 7]);
  assert.equal(restored.GetData().byteLength, 100);
});

test("runtime instance data preserves explicit bounds and computes position bounds", () =>
{
  const data = new Tr2RuntimeInstanceData();
  assertEquals(CjsSchema.getField(Tr2RuntimeInstanceData, "count")?.type.kind, "uint32");
  assertEquals(CjsSchema.getField(Tr2RuntimeInstanceData, "layout")?.type.kind, "array");
  assertEquals(CjsSchema.getField(Tr2RuntimeInstanceData, "rows")?.type.kind, "array");
  assertEquals(CjsSchema.getField(Tr2RuntimeInstanceData, "aabbMin")?.type.kind, "vec3");
  assertEquals(CjsSchema.getField(Tr2RuntimeInstanceData, "aabbMax")?.type.kind, "vec3");
  assertEquals(data.aabbMin.join(","), "0,0,0");
  assertEquals(data.aabbMax.join(","), "0,0,0");

  data.SetElementLayout([
    { usage: "POSITION", usageIndex: 0, type: "FLOAT32_3", name: "position" }
  ]);
  data.SetData([
    { position: [4, -2, 7] },
    { position: [-3, 5, 1] }
  ]);
  assertEquals(data.UpdateBoundingBox(), true);
  assertEquals(data.aabbMin.join(","), "-3,-2,1");
  assertEquals(data.aabbMax.join(","), "4,5,7");

  const min = [-10, -11, -12];
  const max = [10, 11, 12];
  data.SetBoundingBox({ min, max });
  min[0] = 100;
  max[0] = 100;
  assertEquals(data.UpdateBoundingBox(), false);
  assertEquals(data.aabbMin.join(","), "-10,-11,-12");
  assertEquals(data.aabbMax.join(","), "10,11,12");
  assertEquals(data.GetInstanceBufferBoundingBox(0).min.join(","), "-10,-11,-12");

  const mesh = new Tr2InstancedMesh();
  mesh.SetInstanceGeometryRes(data);
  mesh.SetDynamicBounds(2);
  const bounds = mesh.GetBounds();
  assertEquals(bounds.min.join(","), "-12,-13,-14");
  assertEquals(bounds.max.join(","), "12,13,14");

  data.SetElementLayout([[4, 0, 4]]);
  assertEquals(data.GetStride(), 16);
  assertEquals(data.count, 0);
  assertEquals(data.GetData(), null);
});

test("runtime instance data spawns Carbon particle declarations from CPU rows", () =>
{
  const particleSystem = new Tr2ParticleSystem();
  particleSystem.maxParticleCount = 2;
  for (const [elementType, customName, usageIndex] of [
    [Tr2ParticleElementDeclaration.Type.LIFETIME, "", 0],
    [Tr2ParticleElementDeclaration.Type.POSITION, "", 0],
    [Tr2ParticleElementDeclaration.Type.VELOCITY, "", 0],
    [Tr2ParticleElementDeclaration.Type.MASS, "", 0],
    [Tr2ParticleElementDeclaration.Type.CUSTOM, "heat", 3]
  ])
  {
    const element = new Tr2ParticleElementDeclaration();
    element.elementType = elementType;
    element.customName = customName;
    element.usageIndex = usageIndex;
    particleSystem.elements.push(element);
  }
  assertEquals(particleSystem.UpdateElementDeclaration(), true);

  const data = new Tr2RuntimeInstanceData();
  data.particleSystem = particleSystem;
  data.SetElementLayout([
    { usage: "TANGENT", usageIndex: 0, type: "FLOAT32_2", name: "lifetime" },
    { usage: "POSITION", usageIndex: 0, type: "FLOAT32_3", name: "position" },
    { usage: "NORMAL", usageIndex: 0, type: "FLOAT32_3", name: "velocity" },
    { usage: "BITANGENT", usageIndex: 0, type: "FLOAT32_1", name: "mass" },
    { usage: "TEXCOORD", usageIndex: 3, type: "FLOAT32_1", name: "heat" }
  ]);
  data.SetData([
    [[0.25, 4], [1, 2, 3], [4, 5, 6], 7, 8],
    [[0.5, 9], [10, 11, 12], [13, 14, 15], 16, 17]
  ]);

  particleSystem.SpawnParticle({ position: [99, 99, 99] });
  data.Spawn();
  assertEquals(particleSystem.aliveCount, 2);
  assert.deepEqual(Array.from(particleSystem.GetParticleElement(0, "semantic:0")), [0.25, 4]);
  assert.deepEqual(Array.from(particleSystem.GetParticleElement(0, "semantic:1")), [1, 2, 3]);
  assert.deepEqual(Array.from(particleSystem.GetParticleElement(1, "semantic:2")), [13, 14, 15]);
  assert.deepEqual(Array.from(particleSystem.GetParticleElement(1, "semantic:3")), [16]);
  assert.deepEqual(Array.from(particleSystem.GetParticleElement(1, "custom:heat")), [17]);

  assertEquals(CjsSchema.getMethod(Tr2RuntimeInstanceData, "Spawn")?.impl?.status, "adapted");
  assertEquals(CjsSchema.getMethod(Tr2RuntimeInstanceData, "SaveToCMF")?.impl?.status, "notImplemented");
  assertEquals(CjsSchema.getMethod(Tr2RuntimeInstanceData, "SaveToGranny")?.impl?.status, "notImplemented");
  assert.throws(() => data.SaveToCMF("res:/instance.cmf"), /not implemented/);
  assert.throws(() => data.SaveToGranny("res:/instance.gr2"), /not implemented/);
});

test("TriObserverLocal maintains Carbon placement and mute state without creating audio objects", () =>
{
  const calls = [];
  const placementObserver = {
    UpdatePlacement(front, up, position)
    {
      calls.push([
        "placement",
        Array.from(front),
        Array.from(up),
        Array.from(position)
      ]);
    },
    Mute()
    {
      calls.push(["mute"]);
    },
    Unmute()
    {
      calls.push(["unmute"]);
    }
  };
  const observer = new TriObserverLocal();
  observer.SetPosition([1, 2, 3]);
  observer.SetFront([1, 0, 0]);
  observer.SetObserver(placementObserver);

  const transform = mat4.fromRotationTranslationScale(
    mat4.create(),
    [0, 0, 0, 1],
    [10, 20, 30],
    [2, 3, 4]
  );
  assertEquals(observer.Update(transform), true);
  assertEquals(calls[0][1].join(","), "2,0,0");
  assertEquals(calls[0][2].join(","), "0,3,0");
  assertEquals(calls[0][3].join(","), "12,26,42");

  assertEquals(observer.SetMute(true), true);
  assertEquals(observer.SetMute(true), false);
  assertEquals(observer.GetMute(), true);
  assertEquals(observer.SetMute(false), true);
  assertEquals(calls.slice(1).map(call => call[0]).join(","), "mute,unmute");
  assertEquals(CjsSchema.getField(TriObserverLocal, "observer")?.io?.persist, true);
  assertEquals(CjsSchema.getField(TriObserverLocal, "mute")?.io?.persist, undefined);
});

test("TriObserverLocal preserves Carbon's degenerate-front fallback", () =>
{
  let placement = null;
  const observer = new TriObserverLocal();
  observer.SetObserver({
    UpdatePlacement(front, up, position)
    {
      placement = { front: Array.from(front), up: Array.from(up), position: Array.from(position) };
    }
  });
  const transform = mat4.fromScaling(mat4.create(), [0, 0, 0]);
  observer.Update(transform);
  assertEquals(placement.front.join(","), "0,0,1");
  assertEquals(placement.up.join(","), "0,1,0");
});

test("TriProjection exposes its source-backed schema and identity default", () =>
{
  const projection = new TriProjection();
  assertEquals(CjsSchema.GetConstructor("TriProjection"), TriProjection);
  assertEquals(CjsSchema.getField(TriProjection, "transform")?.type.kind, "mat4");
  assertEquals(CjsSchema.getField(TriProjection, "transform")?.io?.read, true);
  for (const privateField of [
    "projectionType",
    "fov",
    "aspect",
    "left",
    "right",
    "bottom",
    "top",
    "zn",
    "zf",
    "customTransform"
  ])
  {
    assertEquals(CjsSchema.getField(TriProjection, privateField), null);
  }
  assertEquals(projection.GetProjectionType(), 0);
  assertMatrixValues(projection.GetTransform(), mat4.create());
});

test("TriProjection constructs Carbon's right-handed perspective and orthographic matrices", () =>
{
  const projection = new TriProjection();

  projection.PerspectiveFov(Math.PI / 2, 2, 1, 11);
  assertEquals(projection.GetProjectionType(), TriProjection.FOV);
  assertMatrixValues(projection.GetTransform(), [
    0.5, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, -1.1, -1,
    0, 0, -1.1, 0
  ]);

  projection.PerspectiveOffCenter(-1, 3, -2, 2, 1, 11);
  assertEquals(projection.GetProjectionType(), TriProjection.OFF_CENTER);
  assertMatrixValues(projection.GetTransform(), [
    0.5, 0, 0, 0,
    0, 0.5, 0, 0,
    0.5, 0, -1.1, -1,
    0, 0, -1.1, 0
  ]);

  projection.PerspectiveOrthographic(8, 4, 1, 11);
  assertEquals(projection.GetProjectionType(), TriProjection.ORTHO);
  assertMatrixValues(projection.GetTransform(), [
    0.25, 0, 0, 0,
    0, 0.5, 0, 0,
    0, 0, -0.1, 0,
    0, 0, -0.1, 1
  ]);
});

test("TriProjection custom transforms are copied at both API boundaries", () =>
{
  const projection = new TriProjection();
  const source = mat4.create();
  source[12] = 4;
  projection.CustomProjection(source);
  source[12] = 8;

  const first = projection.GetTransform();
  assertEquals(projection.GetProjectionType(), TriProjection.CUSTOM);
  assertAlmostEquals(first[12], 4);
  first[12] = 12;
  assertAlmostEquals(projection.GetTransform()[12], 4);
});

test("TriView builds Carbon's right-handed look-at transform", () =>
{
  const view = new TriView();
  const expected = mat4.create();
  mat4.lookAt(expected, [3, 4, 5], [0, 0, 0], [0, 1, 0]);

  assertEquals(view.SetLookAtPosition([3, 4, 5], [0, 0, 0], [0, 1, 0]), undefined);
  assertMatrixValues(view.transform, expected);
  const replacement = mat4.fromTranslation(mat4.create(), [7, 8, 9]);
  view.SetTransform(replacement);
  const detached = view.GetTransform();
  assertMatrixValues(detached, replacement);
  detached[12] = 100;
  assertEquals(view.transform[12], 7);
  assertEquals(CjsSchema.getMethod(TriView, "SetLookAtPosition")?.impl?.status, "implemented");
  assertEquals(CjsSchema.getMethod(TriView, "SetTransform")?.impl?.status, "implemented");
  assertEquals(CjsSchema.getMethod(TriView, "GetTransform")?.impl?.status, "adapted");
  assertEquals(existsSync(new URL("../src/generated/trinityCore/TriView.js", import.meta.url)), false);
});

test("Tr2DirectInstanceData retains detached CPU bounds", () =>
{
  const data = new Tr2DirectInstanceData();
  const min = [-3, -2, -1];
  const max = [4, 5, 6];

  data.SetBoundingBox({ min, max });
  min[0] = -30;
  max[0] = 40;
  assertEquals(data.aabbMin.join(","), "-3,-2,-1");
  assertEquals(data.aabbMax.join(","), "4,5,6");

  data.SetBoundingBox([-8, -7, -6], [8, 7, 6]);
  assertEquals(data.aabbMin.join(","), "-8,-7,-6");
  assertEquals(data.aabbMax.join(","), "8,7,6");
  assert.throws(() => data.SetBoundingBox(null), /requires min and max/);
  assertEquals(existsSync(new URL("../src/generated/trinityCore/Tr2DirectInstanceData.js", import.meta.url)), false);
});

test("Tr2VisibilityResults keeps native events transient", () =>
{
  const results = new Tr2VisibilityResults();
  const event = { eventType: 128, userData: { id: 7 } };
  results.AddVisibilityEvent(event);
  assertEquals(results.GetNumVisibilityEvents(), 1);
  assert.deepEqual(results.GetEvents(), [event]);

  const detached = results.GetEvents();
  detached.length = 0;
  assertEquals(results.GetNumVisibilityEvents(), 1);
  results.Clear();
  assertEquals(results.GetNumVisibilityEvents(), 0);
  assertEquals(CjsSchema.getField(Tr2VisibilityResults, "events"), null);
  assertEquals(existsSync(new URL("../src/generated/trinityCore/Tr2VisibilityResults.js", import.meta.url)), false);
});

test("TriViewport preserves Carbon defaults, initialization, and aspect ratios", () =>
{
  const viewport = new TriViewport();
  assertEquals(viewport.x, 0);
  assertEquals(viewport.y, 0);
  assertEquals(viewport.width, 1);
  assertEquals(viewport.height, 1);
  assertEquals(viewport.minZ, 0);
  assertEquals(viewport.maxZ, 1);
  assertEquals(viewport.GetAspectRatio(), 1);
  assertEquals(CjsSchema.getField(TriViewport, "width")?.type.kind, "int32");
  assertEquals(CjsSchema.getField(TriViewport, "maxZ")?.type.kind, "float32");

  viewport.__init__(10, 20, 1920, 1080, 0.25);
  assertEquals(viewport.x, 10);
  assertEquals(viewport.y, 20);
  assertEquals(viewport.width, 1920);
  assertEquals(viewport.height, 1080);
  assertEquals(viewport.minZ, 0.25);
  assertEquals(viewport.maxZ, 1);
  assertAlmostEquals(viewport.GetAspectRatio(), 16 / 9);

  viewport.__init__(0, 0, 4, 0, 0, 0.75);
  assertEquals(viewport.GetAspectRatio(), Infinity);
  assertEquals(viewport.maxZ, 0.75);
});

test("TriRect uses int32 fields and preserves omitted SetRect components", () =>
{
  const rect = new TriRect();
  assertEquals(CjsSchema.GetConstructor("TriRect"), TriRect);
  assertEquals(CjsSchema.getField(TriRect, "left")?.type.kind, "int32");
  assertEquals(rect.left, 0);
  assertEquals(rect.top, 0);
  assertEquals(rect.right, 0);
  assertEquals(rect.bottom, 0);

  rect.__init__(1, 2, 3, 4);
  rect.SetRect(undefined, 20, undefined, 40);
  assertEquals(rect.left, 1);
  assertEquals(rect.top, 20);
  assertEquals(rect.right, 3);
  assertEquals(rect.bottom, 40);
  rect.SetRect(-1);
  assertEquals(rect.left, -1);
  assertEquals(rect.top, 20);
});

test("Tr2ExpressionTermInfo factories preserve Carbon term types and isolate arguments", () =>
{
  const variable = Tr2ExpressionTermInfo.Variable("Math", "Time", "Current time");
  assertEquals(variable.type, TermType.VARIABLE);
  assertEquals(variable.category, "Math");
  assertEquals(variable.name, "Time");
  assertEquals(variable.description, "Current time");
  assertEquals(variable.GetArguments().length, 0);

  const fn = Tr2ExpressionTermInfo.Function("Math", "Clamp", "value", "min", "max", "Clamps a value");
  assertEquals(fn.type, TermType.FUNCTION);
  assertEquals(fn.GetArguments().join(","), "value,min,max");
  const copiedArguments = fn.GetArguments();
  copiedArguments.push("mutated");
  assertEquals(fn.GetArguments().join(","), "value,min,max");

  const stringFn = Tr2ExpressionTermInfo.StringFunction("Object", "Find", "name", "Finds by name");
  assertEquals(stringFn.type, TermType.STRING_FUNCTION);
  assertEquals(stringFn.GetArguments().join(","), "name");
  assertEquals(CjsSchema.getField(Tr2ExpressionTermInfo, "type")?.type.kind, "int32");
  assertEquals(CjsSchema.getMethod(Tr2ExpressionTermInfo, "GetArguments")?.impl?.status, "implemented");
});

test("Tr2VariableStore forms a global-rooted graph with Carbon lookup rules", () =>
{
  const globalStore = Tr2VariableStore.GlobalStore();
  assertEquals(Tr2VariableStore.GlobalStore(), globalStore);
  assertEquals(globalStore.GetParentVariableStore(), null);
  // The global store refuses a parent, as Carbon enforces.
  globalStore.SetParentVariableStore(new Tr2VariableStore());
  assertEquals(globalStore.GetParentVariableStore(), null);

  const store = new Tr2VariableStore();
  assertEquals(store.GetParentVariableStore(), globalStore);

  // Registration derives the script-bridge content type and stores values.
  const speed = store.RegisterVariable("vsTestSpeed", 0.5);
  assertEquals(speed instanceof TriVariable, true);
  assertEquals(speed.GetType(), TriVariable.ContentType.TRIVARIABLE_FLOAT);
  assertEquals(speed.GetValue(), 0.5);
  assertEquals(store.RegisterVariable("vsTestCount", 3).GetType(), TriVariable.ContentType.TRIVARIABLE_INT);
  assertEquals(store.RegisterVariable("vsTestColor", [1, 0, 0, 1]).GetType(), TriVariable.ContentType.TRIVARIABLE_FLOAT4);
  assertEquals(store.RegisterVariable("vsTestMatrix", mat4.create()).GetType(), TriVariable.ContentType.TRIVARIABLE_FLOAT4X4);
  // Booleans register as INT, the way the Python bridge coerces them.
  const flag = store.RegisterVariable("vsTestFlag", true);
  assertEquals(flag.GetType(), TriVariable.ContentType.TRIVARIABLE_INT);
  assertEquals(flag.GetValue(), 1);
  // An unsupported value shape registers nothing and never clobbers an
  // existing variable; null reserves like the bridge's None.
  assertEquals(store.RegisterVariable("vsTestSpeed", { bogus: true }), null);
  assertEquals(store.FindLocalVariable("vsTestSpeed").GetValue(), 0.5);
  assertEquals(store.FindLocalVariable("vsTestNone"), null);
  assertEquals(store.RegisterVariable("vsTestNone", null).GetType(), TriVariable.ContentType.TRIVARIABLE_INVALID);

  // Same-name same-type registration reuses the variable; a reserved
  // variable adopts the incoming type; a hard conflict returns null.
  assertEquals(store.RegisterVariable("vsTestSpeed", 0.75), speed);
  assertEquals(speed.GetValue(), 0.75);
  const reserved = store.RegisterVariable("vsTestReserved");
  assertEquals(reserved.GetType(), TriVariable.ContentType.TRIVARIABLE_INVALID);
  assertEquals(store.RegisterVariable("vsTestReserved", [1, 2]), reserved);
  assertEquals(reserved.GetType(), TriVariable.ContentType.TRIVARIABLE_FLOAT2);
  assertEquals(store.RegisterVariable("vsTestSpeed", [1, 2, 3]), null);

  // Find walks the parent chain without creating; Get reserves on miss in
  // the queried store.
  globalStore.RegisterVariable("vsTestGlobal", 7.5);
  assertEquals(store.FindVariable("vsTestGlobal"), globalStore.FindLocalVariable("vsTestGlobal"));
  assertEquals(store.FindLocalVariable("vsTestGlobal"), null);
  assertEquals(store.FindVariable("vsTestMissing"), null);
  const gotten = store.GetVariable("vsTestMissing");
  assertEquals(gotten.GetType(), TriVariable.ContentType.TRIVARIABLE_INVALID);
  assertEquals(store.FindLocalVariable("vsTestMissing"), gotten);
  const local = store.GetLocalVariable("vsTestGlobal");
  assertEquals(local === globalStore.FindLocalVariable("vsTestGlobal"), false);
  assertEquals(store.FindLocalVariable("vsTestGlobal"), local);

  assertEquals(store.GetLocalNames().includes("vsTestSpeed"), true);
  assertEquals(store.GetLocalNames().includes("vsTestGlobal"), true);

  // Unregister walks up to the first owner; the removed variable is
  // invalidated so stale references stop binding.
  const child = new Tr2VariableStore();
  child.SetParentVariableStore(store);
  child.UnregisterVariable("vsTestSpeed");
  assertEquals(store.FindLocalVariable("vsTestSpeed"), null);
  assertEquals(speed.GetType(), TriVariable.ContentType.TRIVARIABLE_INVALID);
  assertEquals(speed.GetValue(), null);
  assertEquals(child.UnregisterLocalVariable("vsTestGlobal"), false);

  globalStore.UnregisterLocalVariable("vsTestGlobal");
  assertEquals(CjsSchema.GetConstructor("Tr2VariableStore"), Tr2VariableStore);
  assertEquals(CjsSchema.GetConstructor("TriVariable"), TriVariable);
});

test("dropped Blue and native scanner shapes stay quarantined", () =>
{
  const droppedByFamily = {
    trinityCore: ["TriVector", "TriQuaternion", "TriColor"],
    include: ["ITriVector", "ITriMatrix", "ITriQuaternion", "ITriColor", "ITriDevice", "ITriEffectTextureParameter", "Point", "Tr2CurveBase", "Tr2DebugColor", "Tr2DebugObjectReference", "Tr2Rect", "TriPerlinNoise"],
    curves: ["Tr2CurveRasterizeDestination", "Tr2CurveScalarDefinition", "Tr2Key"],
    "eve/scene": ["EveInstancedMeshManager", "Tr2OcclusionBuffer"],
    "eve/ui": ["EveSpherePinIndexTree"],
    particle: ["Tr2ParticleStreamIterator"],
    postProcess: ["CASConstants"],
    raytracing: ["Tr2RaytracingMeshArea"],
    utilities: ["AreaBoundsInfo", "BoundingBox", "MeshBoundsInfo", "Vector3d", "Vector4d"]
  };
  const droppedReadme = readFileSync(new URL("../src/dropped/README.md", import.meta.url), "utf8");
  for (const [family, names] of Object.entries(droppedByFamily))
  {
    for (const name of names)
    {
      assert.equal(existsSync(new URL(`../src/generated/${family}/${name}.js`, import.meta.url)), false, name);
      assert.equal(existsSync(new URL(`../src/dropped/${name}.js`, import.meta.url)), true, name);
      assert.equal(droppedReadme.includes(`| \`${name}.js\` |`), true, `${name} disposition`);
    }
  }
  // No barrel may export them and the schema registry must not know them.
  const barrels = Object.fromEntries(Object.keys(droppedByFamily).map(family => [
    family,
    readFileSync(new URL(`../src/generated/${family}/index.js`, import.meta.url), "utf8")
  ]));
  for (const [family, names] of Object.entries(droppedByFamily))
  {
    for (const name of names)
    {
      assert.equal(barrels[family].includes(`${name}.js"`), false, name);
      assert.equal(CjsSchema.GetConstructor(name), null, name);
    }
  }
  // The copied generator summary is provenance for its accepted upstream
  // artifact, not runtime-trinity's later ownership/quarantine manifest.
  const summary = JSON.parse(readFileSync(new URL("../src/generated/summary.json", import.meta.url), "utf8"));
  const characterMatrixSkip = summary.generation.skipped.find(entry => entry.className === "TriMatrix" && entry.reason === "owned by runtime-character");
  assert.ok(characterMatrixSkip, "TriMatrix must remain owned by runtime-character");
  for (const [owner, names] of Object.entries({
    "runtime-character": ["Tr2GStateAnimation", "Tr2GStateParameter"],
    "runtime-core": ["Tr2DisplayMode", "Tr2PlatformInfo", "Tr2VideoAdapter", "Tr2VideoAdapters", "Tr2VideoDriver"],
    "runtime-input": ["Tr2MainWindow", "Tr2MainWindowState", "Tr2MouseCursor", "UIScancode"]
  }))
  {
    for (const name of names)
    {
      const skip = summary.generation.skipped.find(entry => entry.className === name && entry.reason === `owned by ${owner}`);
      assert.ok(skip, `${name} must remain owned by ${owner}`);
      assert.equal(CjsSchema.GetConstructor(name), null, name);
    }
  }
  assert.equal(existsSync(new URL("../src/generated/trinityCore/TriMatrix.js", import.meta.url)), false);
  assert.equal(CjsSchema.GetConstructor("TriMatrix"), null);
  assert.equal(existsSync(new URL("../src/generated/trinityCore/Tr2GStateAnimation.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/generated/trinityCore/Tr2GStateParameter.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/generated/eve/socket/_className.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/generated/include/ITr2InteriorLight.js", import.meta.url)), false);
});
