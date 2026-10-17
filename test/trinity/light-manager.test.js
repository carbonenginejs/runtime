import test from "node:test";
import assert from "node:assert/strict";
import { Tr2LightManager, TriFrustum } from "../../npm/dist/trinity/index.js";
import { CreateLightRecord, LIGHT_FLAG_CASTS_SHADOWS, LIGHT_FLAG_IS_VOLUMETRIC } from "../../npm/dist/trinity/eve/lights/lightConversion.js";

const FLAGS = Tr2LightManager.Flags;

/** Decodes one IEEE binary16 half from its bits, for pack assertions. */
function fromHalf(bits)
{
  const sign = (bits & 0x8000) ? -1 : 1;
  const exponent = (bits >> 10) & 0x1F;
  const mantissa = bits & 0x3FF;
  if (exponent === 0) return sign * mantissa * 2 ** -24;
  if (exponent === 0x1F) return mantissa ? NaN : sign * Infinity;
  return sign * (1 + mantissa / 1024) * 2 ** (exponent - 15);
}

/** A frustum double extending the real class, per the fixture rule. */
function makeFrustum({ visible = true, pixelSize = 100 } = {})
{
  return new (class extends TriFrustum
  {
    IsSphereVisible__CenterRadius()
    {
      return visible;
    }
    GetPixelSizeAccross__CenterRadius()
    {
      return pixelSize;
    }
  })();
}

test("AddLight applies Carbon's gates, premultiply, and in-place shadow strip", () =>
{
  const manager = new Tr2LightManager();

  // Invalid flags (neither surfaces nor particles) are rejected first.
  const invalid = CreateLightRecord();
  invalid.flags = 0;
  invalid.color.set([ 1, 1, 1 ]);
  invalid.radius = 10;
  manager.AddLight(invalid);
  assert.equal(manager.GetLightData().length, 0);

  // Zero brightness and zero radius are rejected.
  const dark = CreateLightRecord();
  dark.flags = FLAGS.DEFAULT;
  dark.radius = 10;
  manager.AddLight(dark);
  const flat = CreateLightRecord();
  flat.flags = FLAGS.DEFAULT;
  flat.color.set([ 1, 0, 0 ]);
  manager.AddLight(flat);
  assert.equal(manager.GetLightData().length, 0);

  // With no frustum set, dimming is 1: colour is premultiplied by exactly
  // the radius (contract: a producer omitting the premultiply is dim by a
  // factor of its own radius).
  const record = CreateLightRecord();
  record.flags = FLAGS.DEFAULT | LIGHT_FLAG_CASTS_SHADOWS;
  record.color.set([ 0.5, 0.25, 1 ]);
  record.radius = 4;
  record.position.set([ 1, 2, 3 ]);
  manager.AddLight(record);

  // The caller's scratch record is mutated in place, as Carbon's non-const
  // reference is: the shadow flag is stripped under the shipping pin.
  assert.equal(record.flags & LIGHT_FLAG_CASTS_SHADOWS, 0);

  const stored = manager.GetLightData()[0];
  assert.notEqual(stored, record, "the manager copies; producers reuse scratch records");
  assert.deepEqual(Array.from(stored.color), [ 2, 1, 4 ]);
  record.position.set([ 9, 9, 9 ]);
  assert.deepEqual(Array.from(stored.position), [ 1, 2, 3 ], "deep copy, not aliased");
});

test("the frustum cull, cutoff, and fade band follow the contract", () =>
{
  const manager = new Tr2LightManager();
  manager.AdjustLightCutoff(1); // adjustedCutoff = 7

  manager.SetFrustum(makeFrustum({ visible: false }));
  manager.AddPointLight([ 0, 0, 0 ], 5, [ 1, 1, 1 ]);
  assert.equal(manager.GetLightData().length, 0, "invisible sphere rejected");

  manager.SetFrustum(makeFrustum({ pixelSize: 7 }));
  manager.AddPointLight([ 0, 0, 0 ], 5, [ 1, 1, 1 ]);
  assert.equal(manager.GetLightData().length, 0, "absent AT the cutoff (7px)");

  // The band sits ABOVE the cutoff: 7 + 2.5 = half brightness.
  manager.SetFrustum(makeFrustum({ pixelSize: 9.5 }));
  manager.AddPointLight([ 0, 0, 0 ], 2, [ 1, 0.5, 0 ]);
  const dimmed = manager.GetLightData()[0];
  assert.ok(Math.abs(dimmed.color[0] - 1) < 1e-6, "1 * radius 2 * dimming 0.5");
  assert.deepEqual(Array.from(dimmed.direction), [ 1, 0, 0 ], "point default direction is (1,0,0), never zero");
});

test("ResolveLightData keeps the sixteen largest volumetric lights and clears the losers' flag", () =>
{
  const manager = new Tr2LightManager();
  manager.SetFrustum(makeFrustum({ pixelSize: 100 }));
  manager.AdjustLightCutoff(0);

  const records = [];
  for (let i = 0; i < 17; i++)
  {
    const record = CreateLightRecord();
    record.flags = FLAGS.DEFAULT | LIGHT_FLAG_IS_VOLUMETRIC;
    record.color.set([ 1, 1, 1 ]);
    record.radius = 1 + i;
    manager.AddLight(record);
    records.push(record);
  }
  // Screen size ties (fixed pixelSize), so the sort is stable by insertion:
  // the seventeenth entry loses.
  const before = manager.GetDataRevision();
  manager.ResolveLightData();
  assert.equal(manager.GetDataRevision(), before + 1);
  assert.equal(manager.GetVolumetricLights().length, 16);
  const stored = manager.GetLightData();
  assert.equal(stored[16].flags & LIGHT_FLAG_IS_VOLUMETRIC, 0, "loser flag cleared so shader and CPU agree");
  assert.equal(stored[0].flags & LIGHT_FLAG_IS_VOLUMETRIC, LIGHT_FLAG_IS_VOLUMETRIC);
});

test("the packed buffer carries the contract layout, including biased profile slots", () =>
{
  const manager = new Tr2LightManager();

  const profile = { name: "profile-a" };
  const record = CreateLightRecord();
  record.flags = FLAGS.DEFAULT | LIGHT_FLAG_IS_VOLUMETRIC;
  record.color.set([ 1, 1, 1 ]);
  record.radius = 2;
  record.position.set([ 10, 20, 30 ]);
  record.direction.set([ 0, 1, 0 ]);
  record.innerRadius = 0.5;
  record.outerAngle = 0.25;
  record.innerAngle = 0.75;
  record.projectionPlaneDistance = 1.25;
  record.lightProfile = profile;
  manager.AddLight(record);

  const second = CreateLightRecord();
  second.flags = FLAGS.DEFAULT;
  second.color.set([ 1, 1, 1 ]);
  second.radius = 1;
  second.lightProfile = profile;
  manager.AddLight(second);

  manager.ResolveLightData();
  assert.equal(manager.GetLightCount(), 2);
  const data = manager.GetLightBufferData();
  assert.equal(data.length, 24, "three RGBA32 texels per light");

  // Texel 0: position + radius.
  assert.deepEqual(Array.from(data.slice(0, 4)), [ 10, 20, 30, 2 ]);

  // Texel 1.w: innerRadius f16 low, flags u16 high with the profile slot
  // biased by one in bits 4-15 (both records share slot 1).
  const bits = new Uint32Array(data.buffer, data.byteOffset, data.length);
  assert.ok(Math.abs(fromHalf(bits[7] & 0xFFFF) - 0.5) < 1e-3, "innerRadius half");
  const flagsWord = bits[7] >>> 16;
  assert.equal(flagsWord & 0xF, FLAGS.DEFAULT | LIGHT_FLAG_IS_VOLUMETRIC);
  assert.equal(flagsWord >>> 4, 1, "profile slot 0, stored biased as 1");
  assert.equal((bits[19] >>> 16) >>> 4, 1, "second record shares the slot");

  // Texel 2: direction halves, projection plane distance, angles, zeroed union.
  assert.ok(Math.abs(fromHalf(bits[8] >>> 16) - 1) < 1e-3, "direction.y");
  assert.ok(Math.abs(fromHalf(bits[9] >>> 16) - 1.25) < 1e-3, "projectionPlaneDistance");
  assert.ok(Math.abs(fromHalf(bits[10] & 0xFFFF) - 0.25) < 1e-3, "outerAngle");
  assert.ok(Math.abs(fromHalf(bits[10] >>> 16) - 0.75) < 1e-3, "innerAngle");
  assert.equal(bits[11], 0, "shadow union dead under the shipping pin");
});

test("Clear drops records, not frustum state", () =>
{
  // This test also covered a frame-clock seam on the manager -
  // GetAnimationTime/SetAnimationTime, marked non-Carbon at its own site. The
  // clock lives on TriDevice, where Carbon keeps it, and the packed sets read
  // it through gTriDev as Tr2Renderer::GetAnimationTime does. Nothing in src
  // ever called the setter, so the five readers had been sampling a constant
  // zero; the seam is gone rather than rehomed.
  const manager = new Tr2LightManager();

  const record = CreateLightRecord();
  record.flags = FLAGS.DEFAULT;
  record.color.set([ 1, 1, 1 ]);
  record.radius = 1;
  manager.AddLight(record);
  manager.Clear();
  assert.equal(manager.GetLightData().length, 0);
});

// The GPU half (Tr2LightManager.cpp:140-212, 370-440, 622-675):
// computelightlists builds the per-tile lists. Against a recording render
// context, with Tr2Renderer.runComputeShader replaced by a recorder. No GPU.

// An invertible projection and inverse view whose transposed inverses are
// exact in float32.
const PROJECTION = [ 2, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1, 0, 3, 5, 7, 1 ];
const PROJECTION_INVERSE_TRANSPOSED = [ 0.5, 0, 0, -1.5, 0, 0.25, 0, -1.25, 0, 0, 1, -7, 0, 0, 0, 1 ];
const VIEW_INVERSE = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 20, 30, 1 ];
const VIEW_INVERSE_TRANSPOSED = [ 1, 0, 0, 10, 0, 1, 0, 20, 0, 0, 1, 30, 0, 0, 0, 1 ];

/** A render context that records what the manager asks of it. */
function recordingContext({ width = 33, height = 17 } = {})
{
  const log = [];
  const buffers = [];
  const constants = { size: 0, usage: null, bytes: new Uint8Array(0) };
  return {
    log,
    buffers,
    constants,
    CreateBuffer(desc)
    {
      let bytes = null;
      const buffer = {
        GetDesc: () => desc,
        SetName() {},
        Destroy() {},
        // Mapped only for the light upload; the 32 MB index buffer never is.
        MapForWriting: () => ({ result: 0, data: (bytes ??= new Uint8Array(desc.count * desc.stride)) }),
        UnmapForWriting() {}
      };
      buffers.push(buffer);
      return buffer;
    },
    // The AL factory the by-value Tr2ConstantBufferAL asks for its
    // implementation (Tr2ConstantBufferAL.cpp:28-47).
    CreateConstantBuffer: (size, usage, initialData, implementationOnly) =>
    {
      assert.equal(implementationOnly, true, "the by-value handle asks for its implementation");
      constants.size = size;
      constants.usage = usage;
      constants.bytes = new Uint8Array(size);
      return { result: 0, implementation: {
        IsValid: () => constants.size > 0,
        GetSize: () => constants.size,
        Lock: () => ({ result: 0, data: constants.bytes }),
        Unlock: () => 0,
        GetMemoryClass: () => 1,
        Destroy() {}
      } };
    },
    SetConstants: (buffer, stage, register) => log.push([ "constants", stage, register ]),
    ClearUav: (buffer, values) => { log.push([ "clearUav", buffer.GetDesc().count, Array.from(values) ]); return 0; },
    GetEffectStateManager: () => ({ renderTargetWidth: width, renderTargetHeight: height }),
    GetProjection: () => PROJECTION,
    GetInverseViewTransform: () => VIEW_INVERSE,
    GetViewPosition: () => [ 10, 20, 30 ]
  };
}

/**
 * A manager prepared against `context`: OnPrepareResources reads the
 * main-thread context, which is pointed at the recorder's buffer and
 * constant creation for the call. The effect records its DepthMap binds.
 */
async function preparedManager(context)
{
  const { Tr2RenderContext_GetMainThreadRenderContext } = await import("../../npm/dist/trinity/core/index.js");
  const { Tr2Effect } = await import("../../npm/dist/trinity/index.js");
  const main = Tr2RenderContext_GetMainThreadRenderContext();
  const manager = new Tr2LightManager();
  manager._effect = new (class extends Tr2Effect
  {
    SetParameter__TextureAL(name, texture, uavMipLevel)
    {
      if (name === "DepthMap") context.log.push([ "depthMap", texture ]);
      super.SetParameter__TextureAL(name, texture, uavMipLevel);
    }
  })();
  const own = [ "CreateBuffer", "ClearUav" ];
  const al = main.GetRenderContextAL();
  const factory = al.CreateConstantBuffer;
  for (const name of own) main[name] = context[name];
  // A handle's Create reaches the AL's factory (RenderContextALOf).
  al.CreateConstantBuffer = context.CreateConstantBuffer;
  try
  {
    assert.equal(manager.OnPrepareResources(), true);
  }
  finally
  {
    for (const name of own) delete main[name];
    al.CreateConstantBuffer = factory;
  }
  return manager;
}

/** Replaces Tr2Renderer.runComputeShader with a recorder for one test. */
async function recordCompute(t, log, answer = () => true)
{
  const { Tr2Renderer } = await import("../../npm/dist/trinity/core/index.js");
  const direct = Tr2Renderer.runComputeShader;
  Tr2Renderer.runComputeShader = (effect, ...args) =>
  {
    const call = typeof args[0] === "string" ? args.slice(0, 4) : args.slice(0, 3);
    log.push([ "dispatch", ...call ]);
    return answer(call);
  };
  t.after(() => { Tr2Renderer.runComputeShader = direct; });
}

/** Two lights packed, the second also lighting particles. */
function addTwoLights(manager)
{
  manager.AddPointLight([ 0, 0, 0 ], 10, [ 1, 1, 1 ]);
  manager.AddPointLight([ 5, 0, 0 ], 10, [ 1, 0, 0 ], 0, FLAGS.AFFECTS_SURFACES | FLAGS.AFFECTS_PARTICLES);
  manager.ResolveLightData();
  assert.equal(manager.GetLightCount(), 2);
}

test("OnPrepareResources makes Carbon's light, index and counter buffers and points the effect at them", async () =>
{
  const { PixelFormat, Tr2CpuUsage, Tr2GpuUsage } = await import("../../npm/dist/global/consts/renderContext/index.js");
  const { Tr2ConstantUsageAL } = await import("../../npm/dist/trinityal/index.js");
  const context = recordingContext();
  const manager = await preparedManager(context);
  // ClearLightIndices (cpp:666): the whole index buffer, as a UAV.
  assert.deepEqual(context.log, [ [ "clearUav", 8 * 1024 * 1024, [ 0, 0, 0, 0 ] ], [ "depthMap", null ] ]);

  const [ light, index, counter ] = context.buffers.map(buffer => buffer.GetDesc());
  assert.deepEqual([ light.count, light.stride, light.cpuUsage ], [ 1024, 48, Tr2CpuUsage.WRITE_OFTEN ]);
  assert.equal(light.gpuUsage & Tr2GpuUsage.UNORDERED_ACCESS, 0);
  // INDEX_BUFFER_SIZE (cpp:33): 8M uint indices, written by the kernel.
  assert.deepEqual([ index.count, index.stride, index.cpuUsage ], [ 8 * 1024 * 1024, 4, Tr2CpuUsage.READ ]);
  assert.ok(index.gpuUsage & Tr2GpuUsage.UNORDERED_ACCESS);
  // LightIndexCount: one signed counter (cpp:665).
  assert.deepEqual([ counter.count, counter.format ], [ 1, PixelFormat.PIXEL_FORMAT_R32_SINT ]);
  assert.ok(counter.gpuUsage & Tr2GpuUsage.UNORDERED_ACCESS);
  // PerFrameData (cpp:50-64) is 176 bytes, ONE_SHOT.
  assert.deepEqual([ context.constants.size, context.constants.usage ], [ 176, Tr2ConstantUsageAL.ONE_SHOT ]);

  assert.equal(manager._effect.GetResourceByName("LightBuffer").GetGpuBuffer(), manager._lightBuffer);
  assert.equal(manager._effect.GetResourceByName("LightIndices").GetGpuBuffer(), manager._indexBuffer);
  assert.equal(manager._effect.GetResourceByName("LightIndexCount").GetGpuBuffer(), manager._indexBufferCounter);
  assert.ok(manager._effect.GetResourceByName("DepthMap"), "the depth map slot exists, empty");
});

test("UpdateLists fills PerFrameData, then runs Clear and one group per 16x16 tile with the depth map bound", async t =>
{
  const { ShaderType } = await import("../../npm/dist/global/consts/renderContext/index.js");
  const { PER_FRAME_PS } = await import("../../npm/dist/trinity/core/index.js");
  const context = recordingContext({ width: 33, height: 17 });
  const manager = await preparedManager(context);
  await recordCompute(t, context.log);
  addTwoLights(manager);
  context.log.length = 0;

  const depthMap = { name: "depth" };
  assert.equal(manager.UpdateLists(depthMap, context), true);
  // 33x17 pixels round up to 3x2 tiles (cpp:417-418).
  assert.deepEqual(context.log, [
    [ "depthMap", depthMap ],
    [ "constants", ShaderType.COMPUTE_SHADER, PER_FRAME_PS ],
    [ "dispatch", "Clear", 1, 1, 1 ],
    [ "dispatch", 3, 2, 1 ],
    [ "depthMap", null ]
  ]);

  const bytes = context.constants.bytes;
  const floats = new Float32Array(bytes.buffer, 0, 44);
  const words = new Uint32Array(bytes.buffer, 0, 44);
  assert.deepEqual(Array.from(floats.subarray(0, 16)), VIEW_INVERSE_TRANSPOSED);
  assert.deepEqual(Array.from(floats.subarray(16, 32)), PROJECTION_INVERSE_TRANSPOSED);
  assert.deepEqual(Array.from(floats.subarray(32, 35)), [ 10, 20, 30 ]);
  // width, height, tilesX, tilesY, lightCount, indexBufferSize.
  assert.deepEqual(Array.from(words.subarray(36, 42)), [ 33, 17, 3, 2, 2, 8 * 1024 * 1024 ]);
});

test("a failed dispatch clears the lists and unbinds the depth map; no lights clears without dispatching", async t =>
{
  const context = recordingContext();
  const manager = await preparedManager(context);
  await recordCompute(t, context.log, call => call[0] !== "Clear");
  addTwoLights(manager);
  context.log.length = 0;

  const depthMap = { name: "depth" };
  assert.equal(manager.UpdateLists(depthMap, context), false);
  assert.deepEqual(context.log.slice(-3), [
    [ "dispatch", "Clear", 1, 1, 1 ],
    [ "depthMap", null ],
    [ "clearUav", 8 * 1024 * 1024, [ 0, 0, 0, 0 ] ]
  ]);

  context.log.length = 0;
  manager.Clear(context);
  manager.ResolveLightData();
  assert.equal(manager.UpdateLists(depthMap, context), true);
  assert.deepEqual(context.log, [
    [ "clearUav", 8 * 1024 * 1024, [ 0, 0, 0, 0 ] ],
    [ "clearUav", 8 * 1024 * 1024, [ 0, 0, 0, 0 ] ]
  ], "Clear's clear, then UpdateLists' - no dispatch");
});

test("the process-wide manager publishes its buffers; on the stub device the GPU-writable buffers are refused, so no list is built", async () =>
{
  const { Tr2RenderContext_GetMainThreadRenderContext } = await import("../../npm/dist/trinity/core/index.js");
  const { Tr2VariableStore } = await import("../../npm/dist/trinity/core/index.js");
  const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
  renderContext.GetRenderContextAL().CreateDevice({ mode: { width: 64, height: 64 } });

  const manager = Tr2LightManager.getOrCreateInstance("res:/graphics/effect/managed/space/system/computelightlists.fx");
  assert.equal(Tr2LightManager.getInstance(), manager);
  assert.equal(Tr2LightManager.getOrCreateInstance("other"), manager, "one manager per process");
  assert.equal(manager._effect.GetEffectPathName(), "res:/graphics/effect/managed/space/system/computelightlists.fx");

  const store = Tr2VariableStore.globalStore();
  assert.equal(store.FindVariable("LightBuffer").GetValue(), manager._lightBuffer);
  assert.equal(store.FindVariable("LightIndexBuffer").GetValue(), manager._indexBuffer);

  // Carbon's stub refuses a buffer nothing can write (Tr2BufferALStub.Create).
  assert.equal(manager._lightBuffer.IsValid(), true);
  assert.equal(manager._indexBuffer.IsValid(), false);
  assert.equal(manager._indexBufferCounter.IsValid(), false);
  manager.Clear(renderContext);
  addTwoLights(manager);
  assert.equal(manager.UpdateLists({}, renderContext), false);

  Tr2LightManager.deleteInstance();
  assert.equal(Tr2LightManager.getInstance(), null);
  assert.notEqual(store.FindVariable("LightBuffer").GetValue(), manager._lightBuffer, "the globals stop naming the deleted manager's buffers");
});
