import test from "node:test";
import assert from "node:assert/strict";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { Tr2GpuSharedEmitter, Tr2GpuUniqueEmitter, Tr2ParticleAttractorForce, Tr2ParticleDirectForce, Tr2ParticleDragForce, Tr2ParticleFluidDragForce, Tr2ParticleSpring, Tr2ParticleVortexForce } from "../npm/dist/index.js";


function assertVector(actual, expected)
{
  for (let i = 0; i < expected.length; i++)
  {
    if (Math.abs(actual[i] - expected[i]) > 1e-6)
    {
      throw new Error(`component ${i}: expected ${expected[i]}, got ${actual[i]}`);
    }
  }
}

test("particle direct and drag forces follow Carbon CPU formulas", () =>
{
  const direct = new Tr2ParticleDirectForce();
  const directOut = vec3.create();
  assertVector(direct.GetForce(null, null, 99, 99, directOut), [1, 1, 1]);
  direct.force[0] = 4;
  assertVector(direct.GetForce(null, null, 0, 0, directOut), [4, 1, 1]);
  if (directOut === direct.force)
  {
    throw new Error("direct force must copy into caller-owned output");
  }

  const drag = new Tr2ParticleDragForce();
  drag.drag = 0.25;
  const dragOut = vec3.create();
  assertVector(drag.GetForce(null, vec3.fromValues(4, -8, 2), 5, 7, dragOut), [-1, 2, -0.5]);
  drag.Update(1);
  if (CjsSchema.GetConstructor("Tr2ParticleDragForce") !== Tr2ParticleDragForce)
  {
    throw new Error("drag force should be schema-registered");
  }
});

test("particle spring force follows Carbon displacement formula", () =>
{
  const spring = new Tr2ParticleSpring();
  spring.springConstant = 2;
  vec3.copy(spring.position, vec3.fromValues(1, 2, 3));
  const out = vec3.create();
  assertVector(spring.GetForce(vec3.fromValues(4, 0, 5), null, 10, 20, out), [-6, 4, -4]);
  spring.springConstant = 0;
  assertVector(spring.GetForce(vec3.fromValues(4, 0, 5), null, 10, 20, out), [0, 0, 0]);
  spring.Update(1);
});

test("particle attractor and vortex forces preserve Carbon zero cases", () =>
{
  const attractor = new Tr2ParticleAttractorForce();
  attractor.magnitude = 3;
  const out = vec3.create();
  assertVector(attractor.GetForce(vec3.fromValues(4, 0, 0), null, 0, 0, out), [-3, 0, 0]);
  assertVector(attractor.GetForce(vec3.create(), null, 0, 0, out), [0, 0, 0]);

  const vortex = new Tr2ParticleVortexForce();
  vortex.magnitude = 2;
  assertVector(vortex.GetForce(vec3.fromValues(1, 0, 0), null, 0, 0, out), [0, 0, -2]);
  assertVector(vortex.GetForce(vec3.fromValues(0, 4, 0), null, 0, 0, out), [0, 0, 0]);
  vortex.axis[1] = -1;
  assertVector(vortex.GetForce(vec3.fromValues(1, 0, 0), null, 0, 0, out), [0, 0, 2]);
});

test("particle fluid drag clamps one-frame velocity reversal", () =>
{
  const drag = new Tr2ParticleFluidDragForce();
  const velocity = vec3.fromValues(2, 0, 0);
  const out = vec3.create();
  drag.drag = 0.1;
  assertVector(drag.GetForce(null, velocity, 0.5, 1, out), [-0.4, 0, 0]);
  drag.drag = 10;
  assertVector(drag.GetForce(null, velocity, 0.5, 1, out), [-4, 0, 0]);
  assertVector(drag.GetForce(null, vec3.create(), 0.5, 1, out), [0, 0, 0]);
});

test("GPU emitter graph descriptors preserve Carbon CPU types and defaults", () =>
{
  const shared = new Tr2GpuSharedEmitter();
  if (shared.direction[1] !== 1 || shared.colorMidpoint !== 0.5 || shared.turbulenceFrequency !== 1)
  {
    throw new Error("shared emitter constructor defaults drifted from Carbon");
  }
  if (new Set([shared.color0, shared.color1, shared.color2, shared.color3]).size !== 4)
  {
    throw new Error("emitter colors must be independent values");
  }
  for (const [name, kind] of [["angle", "float32"], ["sizes", "vec3"], ["color0", "color"], ["textureIndex", "uint32"], ["turbulenceFrequency", "uint32"]])
  {
    const field = CjsSchema.getField(Tr2GpuSharedEmitter, name);
    if (field?.type?.kind !== kind || field?.enum)
    {
      throw new Error(`${name} should be ${kind} without a false emitter enum`);
    }
  }

  const unique = new Tr2GpuUniqueEmitter();
  const strength = CjsSchema.getField(Tr2GpuUniqueEmitter, "attractorStrength");
  if (strength?.type?.kind !== "float32" || !strength?.io?.persist || !strength?.io?.notify)
  {
    throw new Error("unique emitter attractorStrength metadata is incomplete");
  }
});

test("GPU emitter Setup projects CPU descriptors onto its authored model fields", () =>
{
  const emitterData = {
    count: 7,
    radius: 2,
    angle: 0.75,
    innerAngle: 0.25,
    minSpeed: 3,
    maxSpeed: 9
  };
  const paramsData = {
    minLifeTime: 1,
    maxLifeTime: 4,
    sizes: [2, 3, 4],
    sizeVariance: 0.2,
    colors: [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1], [1, 1, 1, 0.5]],
    textureIndex: 12,
    colorMidpoint: 0.4,
    velocityStretchRotation: -2,
    drag: 0.3,
    turbulenceAmplitude: 5,
    turbulenceFrequency: 6,
    gravity: -9.8,
    attractorPosition: [8, 7, 6],
    attractorStrength: 11
  };
  const emitter = new Tr2GpuUniqueEmitter();
  if (emitter.Setup(30, emitterData, paramsData) !== undefined)
  {
    throw new Error("Carbon Setup is void");
  }
  if (emitter.rate !== 30 || emitter.angle !== 0.75 || emitter.minSpeed !== 3 || emitter.maxSpeed !== 9)
  {
    throw new Error("emitter structure was not projected onto graph fields");
  }
  assertVector(emitter.sizes, [2, 3, 4]);
  assertVector(emitter.color2, [0, 0, 1, 1]);
  if (emitter.textureIndex !== 12 || emitter.turbulenceFrequency !== 6 || emitter.attractorStrength !== 11)
  {
    throw new Error("emitter parameter structure was not projected onto graph fields");
  }
  assertVector(emitter.attractorPosition, [0, 0, 0]);

  paramsData.sizes[0] = 99;
  paramsData.colors[2][2] = 99;
  assertVector(emitter.sizes, [2, 3, 4]);
  assertVector(emitter.color2, [0, 0, 1, 1]);

  const exported = emitter.GetValues();
  exported.sizes[0] = 50;
  exported.color2[2] = 50;
  assertVector(emitter.sizes, [2, 3, 4]);
  assertVector(emitter.color2, [0, 0, 1, 1]);

  emitter.SetValues({
    minSpeed: 13,
    sizes: [6, 7, 8],
    color2: [0.25, 0.5, 0.75, 1],
    attractorStrength: 12
  });
  assert.equal(emitter.minSpeed, 13);
  assertVector(emitter.sizes, [6, 7, 8]);
  assertVector(emitter.color2, [0.25, 0.5, 0.75, 1]);
  assert.equal(emitter.attractorStrength, 12);
  assertVector(emitter.attractorPosition, [0, 0, 0]);

  const position = [5, 6, 7];
  emitter.SetPosition(position);
  position[0] = 90;
  assertVector(emitter.position, [5, 6, 7]);
  emitter.Enable(false);
  if (emitter.IsEnabled()) throw new Error("emitter should be disabled");
  if (!emitter.Initialize() || !emitter.OnModified()) throw new Error("CPU graph lifecycle should succeed");
});
