import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { Tr2GpuSharedEmitter, Tr2GpuUniqueEmitter, ITr2GenericEmitterUpdateArguments,
  EveChildParticleSystem, EveUpdateContext } from "../../npm/dist/trinity/index.js";

function context()
{
  const args = new ITr2GenericEmitterUpdateArguments();
  const requests = [];
  args.system = {
    Emit(emitter, id, hash, params)
    {
      requests.push(structuredClone({ emitter, id, hash, params }));
    }
  };
  return { args, requests };
}

function near(actual, expected)
{
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-5,
    `${i}: ${actual[i]} != ${expected[i]}`);
}

test("GPU emitter null-system update follows Carbon and unblocks child updates", () =>
{
  // Tr2GpuSharedEmitter.cpp:110-116, EveChildParticleSystem.cpp:263-265.
  const args = new ITr2GenericEmitterUpdateArguments();
  for (const Type of [Tr2GpuSharedEmitter, Tr2GpuUniqueEmitter])
  {
    const emitter = new Type();
    emitter._previousTime = 4;
    emitter.Update(args);
    assert.equal(emitter._previousTime, -1);
    emitter.SpawnParticles(args);
    emitter.SpawnOnce(args, [0, 0, 0]);
    const child = new EveChildParticleSystem();
    child.particleEmitters.push(emitter);
    child.UpdateAsyncronous(new EveUpdateContext(), null);
  }
});

test("GPU shared emitter preserves zeroed native colors and raw uint32 hash fields", () =>
{
  // Tr2GpuSharedEmitter.cpp:27-30; Tr2GpuParticleSystem.h:45-63.
  const emitter = new Tr2GpuSharedEmitter();
  near(emitter.color0, [0, 0, 0, 0]);
  emitter.Initialize();
  const bytes = new Uint8Array(132);
  const data = new DataView(bytes.buffer);
  data.setFloat32(12, 0.5, true);
  data.setUint32(104, 1, true);
  let hash = 2166136261;
  for (const byte of bytes) hash = (Math.imul(hash, 16777619) ^ (byte < 128 ? byte : byte - 256)) >>> 0;
  assert.equal(emitter._paramsHash, hash);
  assert.equal(emitter._id, (hash & ~128) >>> 0, "cpp:74 byte-count shift quirk");
  const other = new Tr2GpuSharedEmitter();
  other.Initialize();
  assert.equal(other._id, emitter._id);
  emitter.textureIndex = 0x80000001;
  emitter.OnModified();
  assert.notEqual(emitter._paramsHash, hash);
});

test("GPU continuous emission clamps time but derives velocity from the full frame delta", () =>
{
  // Tr2GpuSharedEmitter.cpp:117-146, 193-233.
  const { args, requests } = context();
  const emitter = new Tr2GpuSharedEmitter();
  emitter.rate = 30;
  emitter.inheritVelocity = 0.5;
  emitter.Initialize();
  args.time = 10;
  emitter.Update(args);
  assert.equal(requests.length, 0);
  args.time = 11;
  args.parentTransform[12] = 12;
  args.originShift[0] = 2;
  emitter.Update(args);
  assert.equal(requests[0].emitter.count, 2);
  near(requests[0].emitter.positionPrevious, [2, 0, 0]);
  near(requests[0].emitter.position, [12, 0, 0]);
  near(requests[0].emitter.velocity, [5, 0, 0]);
  emitter.Update(args);
  assert.equal(requests.length, 1, "repeated timestamp does not emit");
  emitter.Enable(false);
  args.time = 12;
  emitter.Update(args);
  emitter.Enable(true);
  emitter.Update(args);
  assert.equal(requests.length, 1, "re-enable starts a fresh clock");
});

test("GPU emission retains fractional carry and bounds displacement/density", () =>
{
  const { args, requests } = context();
  const emitter = new Tr2GpuSharedEmitter();
  emitter.rate = 10;
  emitter.Initialize();
  emitter.Update(args);
  args.time = 0.05;
  emitter.Update(args);
  assert.equal(requests.length, 0);
  args.time = 0.1;
  emitter.Update(args);
  assert.equal(requests[0].emitter.count, 1);
  emitter.rate = 0;
  emitter.emissionDensity = 2;
  emitter.maxEmissionDensity = 3;
  args.emitCountFactor = 0;
  args.parentTransform[12] = 2;
  args.time = 0.2;
  emitter.Update(args);
  assert.equal(requests[1].emitter.count, 3, "Carbon density is independent of emitCountFactor");
  emitter.maxDisplacement = 1;
  args.parentTransform[12] = 5;
  args.time = 0.3;
  emitter.Update(args);
  assert.equal(requests.length, 2);
  assert.equal(emitter._carryOver, 0);
});

test("GPU explicit point and segment overloads preserve normal transforms and origin-shift quirk", () =>
{
  const { args, requests } = context();
  const emitter = new Tr2GpuSharedEmitter();
  emitter.rate = 30;
  emitter.Initialize();
  mat4.fromZRotation(args.parentTransform, Math.PI / 2);
  mat4.scale(args.parentTransform, args.parentTransform, [2, 3, 4]);
  args.parentTransform[12] = 10;
  emitter.SpawnParticles(args, [1, 0, 0], [1, 0, 0], 0.1);
  near(requests[0].emitter.position, [10, 2, 0]);
  near(requests[0].emitter.velocity, [0, 2, 0]);
  assert.equal(requests[0].emitter.count, 3, "point rateModifier is not frame-clamped");
  near(emitter._emitter.direction, [0, 0, 0], "point call uses an emitter copy");
  args.originShift[0] = 1;
  emitter.SpawnParticles(args, [0, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], 1);
  assert.equal(requests[1].emitter.count, 2);
  near(requests[1].emitter.positionPrevious, [9, 0, 0]);
  near(requests[1].emitter.velocity, [-1, 2, 0]);
});

test("GPU unique emitter scales temporary structs, preserves local attractor and stable identity", () =>
{
  // Tr2GpuUniqueEmitter.cpp:18-53, 55-120.
  const { args, requests } = context();
  const emitter = new Tr2GpuUniqueEmitter();
  emitter.rate = 30;
  emitter.scaledByParent = true;
  emitter.radius = 2;
  emitter.gravity = 3;
  emitter.attractorStrength = 4;
  emitter.attractorPosition.set([1, 0, 0]);
  emitter.sizes.set([1, 2, 3]);
  emitter.Initialize();
  const id = emitter._id;
  assert.notEqual(id, new Tr2GpuUniqueEmitter()._id);
  mat4.fromZRotation(args.parentTransform, Math.PI / 2);
  mat4.scale(args.parentTransform, args.parentTransform, [2, 3, 4]);
  args.parentTransform[12] = 10;
  args.originShift[0] = 1;
  emitter.Update(args);
  args.time = 1;
  emitter.Update(args);
  assert.equal(requests[0].emitter.radius, 6);
  assert.equal(requests[0].params.gravity, 9);
  assert.equal(requests[0].params.attractorStrength, 12);
  near(requests[0].params.attractorPosition, [9, 2, 0]);
  near(requests[0].params.sizes, [3, 6, 9]);
  near(emitter.attractorPosition, [1, 0, 0]);
  near(emitter.sizes, [1, 2, 3]);
  assert.equal(emitter._params.gravity, 3);
  assert.equal(emitter._paramsHash, requests[0].hash, "Carbon restores structs, not the scaled hash");
  emitter.OnModified();
  assert.equal(emitter._id, id);
  args.parentTransform[12] = 100;
  emitter.SpawnParticles(args, null, null, 1);
  near(requests[1].params.attractorPosition, [9, 2, 0], "spawn does not update attractor");
});

test("GPU unique emitter consumes DirectX signed scale even when decomposition fails", () =>
{
  const { args, requests } = context();
  const emitter = new Tr2GpuUniqueEmitter();
  emitter.scaledByParent = true;
  emitter.rate = 1;
  emitter.radius = 3;
  emitter.Initialize();
  mat4.fromScaling(args.parentTransform, [-2, 3, 4]);
  emitter.SpawnParticles(args);
  assert.ok(Math.abs(requests[0].emitter.radius - 1) < 1e-6);
  mat4.fromScaling(args.parentTransform, [0, 2, 3]);
  emitter.SpawnParticles(args);
  assert.ok(Math.abs(requests[1].emitter.radius + 1) < 1e-6);
  mat4.identity(args.parentTransform);
  args.parentTransform[4] = 1;
  emitter.SpawnParticles(args);
  assert.ok(Math.abs(requests[2].emitter.radius - (2 + Math.SQRT2)) < 1e-6,
    "native caller ignores false on shear but consumes the written scale");
});

test("GPU SpawnOnce scales bursts without LOD factor and leaves authored parameters intact", () =>
{
  // Tr2GpuSharedEmitter.cpp:236-276: no emitCountFactor in this path.
  const { args, requests } = context();
  const emitter = new Tr2GpuUniqueEmitter();
  emitter.rate = 5;
  emitter.radius = 2;
  emitter.turbulenceFrequency = 9;
  emitter.turbulenceAmplitude = 4;
  emitter.sizes.set([1, 2, 3]);
  emitter.Initialize();
  args.emitCountFactor = 0;
  emitter.SpawnOnce(args, [3, 4, 5], 2, 0.5);
  assert.equal(requests[0].emitter.count, 2);
  assert.equal(requests[0].emitter.radius, 4);
  assert.equal(requests[0].params.turbulenceFrequency, 4);
  assert.equal(requests[0].params.turbulenceAmplitude, 8);
  near(requests[0].params.sizes, [2, 4, 6]);
  near(requests[0].emitter.velocity, [3, 4, 5]);
  assert.equal(requests[0].id, emitter.GetID(requests[0].hash));
  assert.equal(emitter.radius, 2);
  assert.equal(emitter.turbulenceFrequency, 9);
  emitter.rate = -2;
  emitter.SpawnOnce(args, [0, 0, 0]);
  assert.equal(requests[1].emitter.count, 0xFFFFFFFE, "native signed-to-uint32 burst-count quirk");
  assert.throws(() => emitter.SpawnOnce({ ...args, system: {} }, [0, 0, 0]), /Emit/,
    "a non-null incomplete system must still fail visibly");
});
