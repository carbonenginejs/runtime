import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mat4, quat, vec3 } from "../../npm/dist/global/math/index.js";
import { RenderingMode, TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import {
  EveChildCloud, EveUpdateContext, EveSpaceObject2, TriDevice, TriPoolAllocator,
  TriRenderBatchAccumulator, Tr2RenderContext_GetMainThreadRenderContext,
  Tr2EffectStateManager
} from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub, Tr2ConstantBufferALStub, ALResult } from "../../npm/dist/trinityal/index.js";
import { CjsPerObjectLayouts } from "../../npm/dist/trinity/core/rawData/CjsPerObjectLayouts.js";
import { gTriDev } from "../../npm/dist/trinity/core/device/gTriDev.js";

// Expected geometry, constants and gates below come from EveChildCloud.cpp,
// not from the former JS shell: grid 282-352, payload 354-422, gates 218-273.
function setup(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const registered = new Set(TriDevice.GetResourcesRegistered());
  const oldWidth = gTriDev.device.width, oldHeight = gTriDev.device.height;
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  al.BeginScene();
  const uploads = [], draws = [];
  const create = al.CreateBuffer.bind(al), draw = al.DrawIndexedInstanced.bind(al);
  al.CreateBuffer = (description, data, internal) =>
  {
    if (data) uploads.push({ description, data: data.slice() });
    return create(description, data, internal);
  };
  al.DrawIndexedInstanced = (...args) => { draws.push(args); return draw(...args); };
  const projection = mat4.create();
  // D3D RH perspective: near=1, far=100, horizontal and vertical slopes=1.
  projection[10] = -100 / 99; projection[11] = -1;
  projection[14] = -100 / 99; projection[15] = 0;
  context.SetViewTransform(mat4.create());
  context.SetProjection(projection);
  gTriDev.device.width = 800;
  gTriDev.device.height = 200;
  const pool = new TriPoolAllocator().RegisterCatalog();
  const accumulator = new TriRenderBatchAccumulator().SetTriPoolAllocator(pool);
  const shader = { GetTechniqueIndex: () => 0, GetPassCount: () => 1, GetShaderTypeMask: () => 3, ApplyAllStateForPass() {} };
  const effect = { GetShaderStateInterface: () => shader, CompatibleWithGdr: () => false, ApplyMaterialDataForPass() {} };
  t.after(() =>
  {
    for (const resource of TriDevice.GetResourcesRegistered())
    {
      if (!registered.has(resource) && resource.constructor === EveChildCloud) resource.Destroy();
    }
    context.SetRenderContextAL(prior);
    gTriDev.device.width = oldWidth; gTriDev.device.height = oldHeight;
  });
  return { context, al, uploads, draws, accumulator, effect, projection };
}

function near(actual, expected)
{
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 0.00002, `${i}: ${actual[i]} != ${expected[i]}`);
}

test("native staggered grid retains alternating winding and LODs above sixteen", t =>
{
  const { uploads } = setup(t);
  const cloud = CjsSchema.from("EveChildCloud", { preTesselationLevel: 64 });
  const vertices = uploads.filter(item => item.description.stride === 8).at(-1).data;
  assert.equal(vertices.length, 65 * 65 * 2);
  near(vertices.slice(0, 4), [-1 - 1 / 63.5, -1, -1 + 1 / 63.5, -1]);
  near(vertices.slice(130, 132), [-1, -1 + 2 / 64]);
  const indices = uploads.filter(item => item.description.stride === 2).slice(-2);
  assert.deepEqual(indices.map(item => item.data.length), [64 * 64 * 6, 32 * 32 * 6]);
  assert.deepEqual(Array.from(indices[0].data.slice(0, 6)), [0, 1, 65, 65, 1, 66]);
  assert.deepEqual(Array.from(indices[0].data.slice(64 * 6, 64 * 6 + 6)), [65, 66, 131, 131, 130, 65]);
  assert.deepEqual(Array.from(indices[1].data.slice(0, 6)), [0, 2, 130, 130, 2, 132]);
  assert.equal(cloud._indexBuffers.length, 2);
  const definition = Tr2EffectStateManager.getVertexDeclarationElements(cloud._declaration);
  assert.equal(definition.items[0].type, "FLOAT32_2");
  assert.equal(CjsSchema.getField(EveChildCloud, "preTesselationLevel").type.kind, "uint32");
});

test("notified tessellation edits and device release rebuild owned storage", t =>
{
  setup(t);
  const cloud = CjsSchema.from("EveChildCloud", { preTesselationLevel: 64 });
  const vertex = cloud._vertexBuffer, oldIndex = cloud._indexBuffers[0];
  CjsSchema.setValues(cloud, { preTesselationLevel: 16 });
  assert.equal(oldIndex.IsValid(), false);
  assert.equal(cloud._indexBuffers.length, 0, "native dim > 16 gate");
  CjsSchema.setValues(cloud, { preTesselationLevel: 32 });
  assert.equal(cloud._indexBuffers.length, 1);
  cloud.ReleaseResources();
  assert.equal(vertex.IsValid(), true, "native ReleaseResources retains the vertex buffer");
  assert.equal(cloud._declaration, Tr2EffectStateManager.Unknown);
  assert.equal(cloud.PrepareResources(), true);
  assert.equal(cloud._indexBuffers.length, 1);
  cloud.Destroy();
  assert.equal(vertex.IsValid(), false);
  assert.ok(!TriDevice.GetResourcesRegistered().includes(cloud));
});

test("failed native buffer creation is reported and can be prepared again", t =>
{
  const { al } = setup(t);
  const cloud = new EveChildCloud();
  cloud.ReleaseResources();
  const create = al.CreateBuffer.bind(al);
  al.CreateBuffer = () => ({ result: ALResult.E_FAIL, implementation: null });
  assert.equal(cloud.PrepareResources(), false);
  assert.equal(cloud._declaration, Tr2EffectStateManager.Unknown);
  al.CreateBuffer = create;
  assert.equal(cloud.PrepareResources(), true);
});

test("rotated nonuniform parent, visibility, sorting and pre-update collection", t =>
{
  const { context } = setup(t);
  const cloud = new EveChildCloud(), owner = new EveSpaceObject2();
  const renderables = [];
  cloud.isVisible = true;
  cloud.GetRenderables(renderables);
  assert.equal(renderables.length, 0);
  const rotation = quat.setAxisAngle(quat.create(), [0, 0, 1], Math.PI / 2);
  mat4.fromRotationTranslationScale(owner.worldTransform, rotation, [10, 20, -30], [2, 3, 4]);
  vec3.set(cloud.translation, 1, 2, 3);
  const update = new EveUpdateContext();
  update.SetTime(123); update.SetLodFactor(2);
  let time = 0;
  cloud.volume = { Update(value) { time = value; } };
  cloud.UpdateSyncronous(update, { spaceObjectParent: owner });
  assert.equal(time, 123);
  near(cloud.worldTransform.slice(12, 15), [4, 22, -18]);
  near(cloud.boundingSphere, [4, 22, -18, Math.sqrt(29) / 2]);
  cloud.minScreenSize = 5;
  update.SetFrustum({ IsSphereVisible: () => true, GetPixelSizeAccross: () => 9 });
  cloud.UpdateVisibility(update);
  cloud.GetRenderables(renderables); assert.equal(renderables.length, 0);
  update.SetFrustum({ IsSphereVisible: () => true, GetPixelSizeAccross: () => 10 });
  cloud.UpdateVisibility(update); cloud.GetRenderables(renderables);
  assert.deepEqual(renderables, [cloud]);
  assert.ok(Math.abs(cloud.GetSortValue(context) - (Math.hypot(4, 22, -18) - Math.sqrt(3))) < 0.00001);
});

test("payload has nineteen registers, one GPU transpose and native clipped bounds", t =>
{
  const { accumulator, projection } = setup(t);
  const cloud = new EveChildCloud();
  mat4.fromTranslation(cloud.worldTransform, [0, 0, -10]);
  const record = cloud.GetPerObjectData(accumulator), data = record.data;
  assert.equal(data.GetData().length, 76);
  near(data.GetTransposed("world"), [1,0,0,0, 0,1,0,0, 0,0,1,-10, 0,0,0,1]);
  near(data.Get("eyePosLocal"), [0, 0, 10]);
  near(data.Get("nearPlaneLocal"), [0, 0, -1, 9]);
  near(data.Get("screenSize"), [-0.5 / 9.5, -0.5 / 9.5, 0.5 / 9.5, 0.5 / 9.5]);
  near(data.Get("screenDepth"), [(projection[10] * -10 + projection[14]) / 10]);
  const q = quat.setAxisAngle(quat.create(), [0, 1, 0], 0.4);
  mat4.fromRotationTranslationScale(cloud.worldTransform, q, [0, 0, -10], [2, 3, 4]);
  const rotated = cloud.GetPerObjectData(accumulator).data;
  near(rotated.GetTransposed("worldView"), mat4.transpose(mat4.create(), cloud.worldTransform));
  near(rotated.GetTransposed("worldViewInv"), mat4.transpose(mat4.create(), mat4.invert(mat4.create(), cloud.worldTransform)));
  assert.equal(CjsPerObjectLayouts.Get("EveChildCloudPerObjectData").stride, 76);
});

test("nearPlaneLocal pulls the view plane through rotated nonuniform world and view transforms", t =>
{
  const { context, accumulator } = setup(t);
  const cloud = new EveChildCloud();
  const worldAngle = 0.4, viewAngle = -0.3;
  mat4.fromRotationTranslationScale(cloud.worldTransform,
    quat.setAxisAngle(quat.create(), [0, 1, 0], worldAngle), [5, 6, -20], [2, 3, 4]);
  const view = mat4.create();
  mat4.fromRotationTranslation(view,
    quat.setAxisAngle(quat.create(), [1, 0, 0], viewAngle), [-2, 3, -7]);
  context.SetViewTransform(view);

  // Carbon cpp:367-370 pulls (0, 0, -1, -near) into local coordinates.
  // Independently expand -viewZ - 1: worldZ = -2*sin(a)*x + 4*cos(a)*z - 20,
  // worldY = 3*y + 6; viewZ = sin(b)*worldY + cos(b)*worldZ - 7.
  // Keep the scale in the plane coefficients: Carbon does not normalize them.
  const sa = Math.sin(worldAngle), ca = Math.cos(worldAngle);
  const sb = Math.sin(viewAngle), cb = Math.cos(viewAngle);
  const plane = cloud.GetPerObjectData(accumulator).data.Get("nearPlaneLocal");
  near(plane, [2 * cb * sa, -3 * sb, -4 * cb * ca, 6 - 6 * sb + 20 * cb]);
});

test("LOD preserves Carbon's width-for-both-axes quirk and near-plane clipping", t =>
{
  const { accumulator } = setup(t);
  const cloud = CjsSchema.from("EveChildCloud", { preTesselationLevel: 128, cellScreenSize: 1 });
  mat4.fromScaling(cloud.worldTransform, [1, 4, 1]); cloud.worldTransform[14] = -100;
  const record = cloud.GetPerObjectData(accumulator);
  assert.equal(cloud.currentLod, 2);
  gTriDev.device.height = 1600;
  cloud.GetPerObjectData(accumulator);
  assert.equal(cloud.currentLod, 2, "height does not enter the native formula");
  cloud.cellScreenSize = 0.2;
  cloud.GetPerObjectData(accumulator);
  assert.equal(cloud.currentLod, 0);
  near(record.data.Get("screenSize"), [-0.5 / 99.5, -2 / 99.5, 0.5 / 99.5, 2 / 99.5]);
  mat4.fromTranslation(cloud.worldTransform, [0, 0, -1]);
  near(cloud.GetPerObjectData(accumulator).data.Get("screenSize"), [-0.5, -0.5, 0.5, 0.5]);
  mat4.fromTranslation(cloud.worldTransform, [0, 0, 10]);
  near(cloud.GetPerObjectData(accumulator).data.Get("screenSize"), [0, 0, 0, 0]);
});

test("native transparent batch reaches AL indexed draw and constants use the vertex-family layout", t =>
{
  const { context, accumulator, draws, effect } = setup(t);
  const cloud = new EveChildCloud();
  cloud.effect = effect;
  mat4.fromTranslation(cloud.worldTransform, [0, 0, -10]);
  const record = cloud.GetPerObjectData(accumulator);
  const batches = [];
  cloud.GetBatches({ Commit: batch => batches.push(batch) }, TriBatchType.TRIBATCHTYPE_OPAQUE, record);
  assert.equal(batches.length, 0);
  cloud.GetBatches({ Commit: batch => batches.push(batch) }, TriBatchType.TRIBATCHTYPE_TRANSPARENT, record);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].renderingMode, RenderingMode.RM_ALPHA);
  assert.equal(batches[0].objectData, record);
  context.SubmitGeometry(batches[0]);
  assert.equal(draws.length, 1);
  assert.deepEqual(draws[0].slice(0, 5), [6144, 1, 0, 0, 0]);
  const buffers = Array.from({ length: 6 }, () => new Tr2ConstantBufferALStub());
  const stages = [];
  t.mock.method(context, "SetConstants", (_buffer, stage, register) => stages.push([stage, register]));
  assert.equal(record.SetPerObjectDataToDevice(buffers, 3, context), 1);
  assert.deepEqual(stages, [[0,3]]);
  for (const buffer of buffers) buffer.Destroy();
  accumulator.SetRenderingMode(RenderingMode.RM_ALPHA);
  cloud.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_TRANSPARENT, record);
  context.RenderBatchesInOrder(accumulator);
  assert.equal(draws.length, 2, "the full batch path uploads the record and submits the draw");
});
