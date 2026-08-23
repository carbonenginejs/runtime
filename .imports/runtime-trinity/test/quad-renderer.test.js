// Tr2QuadRenderer CPU half: register/accumulate/merge/emit (batch-plan P5).
import test from "node:test";
import assert from "node:assert/strict";
import {
  EveSmartLightQuad,
  Tr2QuadRenderer,
  Tr2Effect,
  TriRenderBatchAccumulator
} from "../npm/dist/index.js";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { toHalfFloat } from "@carbonenginejs/runtime-utils/num";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

const OPAQUE = Tr2QuadRenderer.TriBatchType.TRIBATCHTYPE_OPAQUE;
const ADDITIVE = Tr2QuadRenderer.TriBatchType.TRIBATCHTYPE_ADDITIVE;

test("Tr2QuadRenderer merges per-effect instances and emits instanced batches", () =>
{
  const renderer = new Tr2QuadRenderer();
  const effect = { GetShaderStateInterface: () => ({ GetSortValue: () => 1 }) };

  // Two effects: 8-byte (2 floats) opaque instances and 16-byte additive.
  renderer.RegisterEffect("a", OPAQUE, 8, 1, null, effect);
  renderer.RegisterEffect("b", ADDITIVE, 16, 2, null, effect);
  renderer.RegisterEffect("a", ADDITIVE, 4, 1, null, effect); // duplicate key ignored

  renderer.AddQuads("a", [1, 2], 1);
  renderer.AddQuads("a", [3, 4, 5, 6], 2);
  renderer.AddQuads("b", [7, 8, 9, 10], 1);
  renderer.AddQuads("missing", [0], 1); // unknown key ignored
  assert.equal(renderer.bufferSize, 8 * 3 + 16);

  const quadCount = renderer.BeginRendering();
  assert.equal(quadCount, 2, "largest live quadCount");
  assert.equal(renderer.lastInstanceDataSize, 40);

  const records = renderer.GetEffectRecords();
  assert.equal(records.get("a").count, 3);
  assert.equal(records.get("b").count, 1);
  const mergedBytes = renderer.GetMergedData();
  const merged = new Float32Array(mergedBytes.buffer, mergedBytes.byteOffset, mergedBytes.byteLength / 4);
  assert.equal(merged[0], 1);
  assert.equal(merged[records.get("b").bufferOffset / 4], 7, "aligned record offset");

  const accumulator = new TriRenderBatchAccumulator();
  assert.equal(renderer.GetBatches(OPAQUE, accumulator), true);
  assert.equal(renderer.GetBatches(OPAQUE, accumulator), true);
  assert.equal(accumulator.GetBatchCount(), 2);
  const batch = accumulator.GetBatches()[0];
  assert.equal(batch.instanceCount, 3, "instances for the opaque record");
  assert.equal(batch.indexCountPerInstance, 6, "6 indices x quadCount 1");

  // Only matching batch types emit.
  const additive = new TriRenderBatchAccumulator();
  assert.equal(renderer.GetBatches(ADDITIVE, additive), true);
  assert.equal(additive.GetBatchCount(), 1);
  assert.equal(additive.GetBatches()[0].indexCountPerInstance, 12, "6 x quadCount 2");

  renderer.DoneRendering();
  assert.equal(renderer.bufferSize, 0, "frame reset");

  assert.equal(Tr2QuadRenderer.Instance(), Tr2QuadRenderer.Instance(), "singleton");
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
  renderer.BeginRendering();

  const bytes = renderer.GetMergedData();
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
