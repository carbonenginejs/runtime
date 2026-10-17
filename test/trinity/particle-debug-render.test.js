// Debug-renderer ports of the particle forces and constraints, Tr2ParticleSystem
// and EveChildParticleSystem: a fake ITr2DebugRenderer2 records every call.
import assert from "node:assert/strict";
import test from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { box3 } from "../../npm/dist/global/math/box3.js";
import {
  EveChildParticleSystem,
  Tr2ParticleSystem,
  Tr2PlaneConstraint,
  Tr2ParticleVortexForce
} from "../../npm/dist/trinity/index.js";

function fakeRenderer(enabled, variants)
{
  const calls = [];
  const renderer = { calls, HasOption: (_owner, option) => enabled.includes(option) };
  for (const variant of variants)
  {
    renderer[variant] = (...args) => calls.push([ variant, ...args.map(a => ArrayBuffer.isView(a) ? Array.from(a) : a) ]);
  }
  return renderer;
}

function close(actual, expected)
{
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-5, `${actual} vs ${expected}`));
}

test("Tr2PlaneConstraint debug: an 11x11 grid on the plane around the box centre (cpp:257-280)", () =>
{
  const constraint = new Tr2PlaneConstraint();
  const renderer = fakeRenderer([], [ "DrawLine" ]);
  const aabb = box3.fromBounds(box3.create(), [ -1, -1, -1 ], [ 1, 1, 1 ]);

  constraint.RenderDebugInfo(renderer, mat4.create(), aabb);
  assert.equal(renderer.calls.length, 0, "an invalid constraint draws nothing");

  // Default plane (0, 1, 0, 0): OrthoNormalBasisZ((0,1,0)) has rows X = (-1,0,0),
  // Y = (0,0,1), Z = (0,1,0), so a local (x, y, 0) lands at (-x, 0, y).
  constraint.isValid = true;
  constraint.RenderDebugInfo(renderer, mat4.create(), aabb);
  assert.equal(renderer.calls.length, 22);
  const [ name, owner, from, to, color ] = renderer.calls[0];
  assert.equal(name, "DrawLine");
  assert.equal(owner.object, constraint);
  // radius = max(10, |size| * 0.25) = 10, step 2: first line x = -10, y from -10 to 10.
  close(from, [ 10, 0, -10 ]);
  close(to, [ 10, 0, 10 ]);
  assert.equal(color.color, 0xffff4444);
});

test("Tr2ParticleVortexForce debug: the axis line, then a 16-segment ring, under world (cpp:49-63)", () =>
{
  const force = new Tr2ParticleVortexForce();
  const renderer = fakeRenderer([], [ "DrawLine" ]);
  const world = mat4.fromTranslation(mat4.create(), [ 10, 0, 0 ]);

  force.RenderDebugInfo(renderer, world, box3.create());
  assert.equal(renderer.calls.length, 17);
  // Axis (0,1,0): local Z maps to world Y.
  close(renderer.calls[0][2], [ 10, -20, 0 ]);
  close(renderer.calls[0][3], [ 10, 20, 0 ]);
  // Ring start: local (20, 0, 0) maps through X = (-1, 0, 0).
  close(renderer.calls[1][2], [ -10, 0, 0 ]);
});

test("Tr2ParticleSystem forwards to forces then constraints under its option; EveChildParticleSystem forwards its world", () =>
{
  const system = new Tr2ParticleSystem();
  const seen = [];
  system.forces.push({ RenderDebugInfo: (...args) => seen.push([ "force", ...args ]) });
  system.constraints.push(Object.assign(new Tr2PlaneConstraint(), { RenderDebugInfo: (...args) => seen.push([ "constraint", ...args ]) }));

  const options = new Set();
  system.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Particle Systems" ]);

  system.RenderDebugInfo(fakeRenderer([], []), mat4.create());
  assert.equal(seen.length, 0, "off without the option");

  const renderer = fakeRenderer([ "Particle Systems" ], []);
  const child = new EveChildParticleSystem();
  child.particleSystems.push(system);
  mat4.fromTranslation(child.worldTransform, [ 1, 2, 3 ]);
  child.RenderDebugInfo(renderer);
  assert.deepEqual(seen.map(s => s[0]), [ "force", "constraint" ]);
  assert.equal(seen[0][1], renderer);
  assert.equal(seen[0][2], child.worldTransform);
});
