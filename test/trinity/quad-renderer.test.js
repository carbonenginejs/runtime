// Tr2QuadRenderer: register, accumulate and merge on the CPU, then upload into
// the ring and emit instanced batches on a device.
import test from "node:test";
import assert from "node:assert/strict";
import {
  EveSmartLightQuad,
  EveShip2,
  EveSpaceScene,
  EveSpriteSet,
  Tr2QuadRenderer,
  Tr2Effect,
  Tr2VertexDefinition,
  TriRenderBatchAccumulator,
  Tr2RenderContext_GetMainThreadRenderContext
} from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { toHalfFloat } from "../../npm/dist/global/math/num.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { FixtureEffect } from "../support/fixtureEffect.js";

const OPAQUE = Tr2QuadRenderer.TriBatchType.TRIBATCHTYPE_OPAQUE;
const ADDITIVE = Tr2QuadRenderer.TriBatchType.TRIBATCHTYPE_ADDITIVE;

test("Tr2QuadRenderer merges per-effect instances and emits instanced batches", () =>
{
  const renderer = new Tr2QuadRenderer();
  const effect = FixtureEffect({ GetShaderStateInterface: () => ({ GetSortValue: () => 1 }) });

  // Two effects: 8-byte (2 floats) opaque instances and 16-byte additive.
  renderer.RegisterEffect("a", OPAQUE, 8, 1, null, effect);
  renderer.RegisterEffect("b", ADDITIVE, 16, 2, null, effect);
  renderer.RegisterEffect("a", ADDITIVE, 4, 1, null, effect); // duplicate key ignored

  renderer.AddQuads("a", [1, 2], 1);
  renderer.AddQuads("a", [3, 4, 5, 6], 2);
  renderer.AddQuads("b", [7, 8, 9, 10], 1);
  renderer.AddQuads("missing", [0], 1); // unknown key ignored
  assert.equal(renderer.bufferSize, 8 * 3 + 16);

  const quadCount = renderer.MergeBuffers();
  assert.equal(quadCount, 2, "largest live quadCount");
  assert.equal(renderer.bufferSize, 40 + 8 + 16, "one instance of padding per record (cpp:137-140)");

  const records = renderer.GetEffectRecords();
  assert.equal(records.get("a").count, 3);
  assert.equal(records.get("b").count, 1);
  const mergedBytes = renderer._buffer;
  const merged = new Float32Array(mergedBytes.buffer, mergedBytes.byteOffset, mergedBytes.byteLength / 4);
  assert.equal(merged[0], 1);
  assert.equal(merged[records.get("b").bufferOffset / 4], 7, "aligned record offset");

  assert.equal(Tr2QuadRenderer.Instance(), Tr2QuadRenderer.Instance(), "singleton");
});

test("Tr2QuadRenderer uploads into its ring and emits one instanced batch per live record on a device", () =>
{
  // Device resources are made through the main-thread context once it has a
  // device (Tr2Renderer.IsResourceCreationAllowed).
  const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
  renderContext.GetRenderContextAL().CreateDevice({ mode: { width: 64, height: 64 } });

  const renderer = new Tr2QuadRenderer();
  const effect = FixtureEffect({ GetShaderStateInterface: () => ({ GetSortValue: () => 1 }) });
  const definition = new Tr2VertexDefinition();
  definition.Add("FLOAT32_2", "TEXCOORD", 0, 1, 1);

  renderer.RegisterEffect("a", OPAQUE, 8, 1, definition, effect);
  renderer.RegisterEffect("b", ADDITIVE, 16, 2, definition, effect);
  renderer.AddQuads("a", [ 1, 2, 3, 4, 5, 6 ], 3);
  renderer.AddQuads("b", [ 7, 8, 9, 10 ], 1);

  // Nothing is emitted before BeginRendering uploads (cpp:299-302).
  const early = new TriRenderBatchAccumulator();
  renderer.GetBatches(OPAQUE, early);
  assert.equal(early.GetBatchCount(), 0);

  renderer.BeginRendering(renderContext);
  assert.notEqual(renderer.vertexBufferOffset, -1, "the ring took the frame's instances");
  assert.equal(renderer.GetInstanceDataSize(), 40 + 8 + 16);
  assert.equal(renderer._quadIB.GetDesc().count, 12, "six indices per quad for the largest quadCount (cpp:218-231)");

  const opaque = new TriRenderBatchAccumulator();
  renderer.GetBatches(OPAQUE, opaque);
  assert.equal(opaque.GetBatchCount(), 1);
  const batch = opaque.GetBatches()[0];
  assert.equal(batch.instanceCount, 3);
  assert.equal(batch.indexCountPerInstance, 6, "6 indices x quadCount 1");
  assert.equal(batch.vertexStreams[1], renderer._vertexBuffer.GetBuffer(), "instances come from the ring");

  const additive = new TriRenderBatchAccumulator();
  renderer.GetBatches(ADDITIVE, additive);
  assert.equal(additive.GetBatchCount(), 1);
  assert.equal(additive.GetBatches()[0].indexCountPerInstance, 12, "6 x quadCount 2");

  renderer.DoneRendering(renderContext);
  assert.equal(renderer.bufferSize, 0, "frame reset");
});


test("EveSmartLightQuad packs Carbon's 108-byte mixed-width instance record", () =>
{
  const renderer = new Tr2QuadRenderer();
  const effect = new Tr2Effect();
  effect.GetHashValue = () => 0x1234;

  const quad = new EveSmartLightQuad();
  quad.effect = effect;
  quad.brightness = 2.5;
  quad.customColor.set([ 0.25, 0.5, 0.75, 1 ]);
  quad.Initialize();
  quad.RegisterWithQuadRenderer(renderer);
  quad.UpdateAsyncronous(null, { localToWorldTransform: mat4.create() });

  const placement = {
    initialScale: vec3.fromValues(2, 3, 4),
    additionalScale: vec3.fromValues(1, 1, 1),
    initialRotation: quat.create(),
    additionalRotation: quat.create(),
    initialTranslation: vec3.fromValues(5, 6, 7),
    additionalTranslation: vec3.create()
  };

  quad.AddQuadsToQuadRenderer([ placement ], 1, { IsSphereVisible: () => true }, renderer);
  renderer.MergeBuffers();

  const bytes = renderer._buffer;
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(renderer.GetEffectRecords().get(0x1234).count, 1);
  assert.equal(bytes.byteLength >= EveSmartLightQuad.QUAD_INSTANCE_SIZE, true);

  const view = new DataView(bytes.buffer, bytes.byteOffset, EveSmartLightQuad.QUAD_INSTANCE_SIZE);
  assert.equal(view.getFloat32(0, true), 1, "parentTransform0.x is float32");
  assert.equal(view.getFloat32(60, true), 5, "localTransform0.w carries position.x");
  assert.equal(view.getUint16(96, true), toHalfFloat(0.25), "color.r is float16");
  assert.equal(view.getUint16(102, true), toHalfFloat(1), "color.a is float16");
  assert.equal(view.getUint16(104, true), toHalfFloat(2.5), "brightness is float16");
  assert.equal(view.getUint16(106, true), toHalfFloat(0), "brightness padding is float16 zero");
});

test("an object pushed after Initialize registers its quad effects through ReregisterEntities", () =>
{
  // Carbon registers on list insert (EveSpaceScene.cpp:3455-3470); our arrays
  // have no insert event, so ReregisterEntities is where late objects join.
  const scene = new EveSpaceScene();
  scene.Initialize(Tr2RenderContext_GetMainThreadRenderContext());

  const ship = new EveShip2();
  const sprites = new EveSpriteSet();
  sprites.effect = FixtureEffect({ GetHashValue: () => 0x5a1e });
  sprites.Rebuild();
  ship.attachments.push(sprites);
  scene.objects.push(ship);

  assert.equal(Tr2QuadRenderer.Instance().GetEffectRecords().has(0x5a1e), false);
  scene.ReregisterEntities();
  assert.equal(Tr2QuadRenderer.Instance().GetEffectRecords().has(0x5a1e), true);
});
