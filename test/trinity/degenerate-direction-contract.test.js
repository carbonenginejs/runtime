import assert from "node:assert/strict";
import test from "node:test";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { EveVirtualCameraBehaviourVector3Base as Base, EveVirtualCameraBehaviourVector3Offset as Offset,
  EveVirtualCameraBehaviourVector3MoveBetween as MoveBetween, EveVirtualCameraBehaviourVector3Orbit as Orbit,
  EveVirtualCamera, Tr2SphereConstraint, Tr2ParticleSystem, Tr2ParticleElementDeclaration as Element
} from "../../npm/dist/trinity/index.js";

function near(actual, expected)
{
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-6);
}

test("anchor rotation preserves native zero-axis identity and ordinary heading", () =>
{
  for (const heading of [[0, 0, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]])
  {
    const value = vec3.fromValues(1, 2, 3);
    near(Base.rotateVectorWithAnchor(value, value, heading), [1, 2, 3]);
  }
  near(Base.rotateVectorWithAnchor(vec3.create(), [0, 0, 2], [1, 0, 0]), [2, 0, 0]);
  near(Base.rotateVectorWithAnchor(vec3.create(), [0, 0, 0], [1, 0, 0]), [0, 0, 0]);
});

test("offset and move-between use native backward-heading identity", () =>
{
  const camera = new EveVirtualCamera();
  camera.animationTimelineLength = 1;
  const offset = new Offset();
  offset.world = false;
  offset.proportional = false;
  vec3.set(offset.offset, 1, 0, 0);
  near(offset.Update(camera, null, 0, 0.5, null, 1, [0, 0, -1]), [1, 0, 0]);
  const move = new MoveBetween();
  move.world = false;
  move.proportional = false;
  vec3.set(move.start, 1, 0, 0);
  vec3.set(move.end, 1, 0, 0);
  near(move.Update(camera, null, 0, 0.5, null, 1, [0, 0, -1]), [1, 0, 0]);
});

test("orbit preserves a zero horizontal heading without changing world-space mode", () =>
{
  const camera = new EveVirtualCamera();
  camera.animationTimelineLength = 1;
  const orbit = new Orbit();
  orbit.world = false;
  orbit.proportional = false;
  orbit.distance = 2;
  orbit.start = orbit.end = 0;
  for (const heading of [[0, 1, 0], [0, 0, 0]])
    near(orbit.Update(camera, null, 0, 0, null, 1, heading), [0, 0, 0]);
  orbit.world = true;
  near(orbit.Update(camera, null, 0, 0, null, 1, [0, 1, 0]), [0, 0, 2]);
});

test("sphere projection retains native center NaN and nonzero radial projection", t =>
{
  const system = new Tr2ParticleSystem();
  system.maxParticleCount = 2;
  system.elements.push(Object.assign(new Element(), { elementType: Element.Type.POSITION, usedByGPU: false }));
  system.Initialize();
  t.after(() => system.ReleaseResources());
  system.SpawnParticle({ position: [0, 0, 0] });
  system.SpawnParticle({ position: [0.5, 0, 0] });
  const sphere = new Tr2SphereConstraint();
  sphere.affectVelocity = false;
  assert.equal(sphere.Bind(system), true);
  sphere.ApplyConstraint(null, null, null, 2, 0);
  assert.ok(Array.from(system.GetParticleElement(0, Element.Type.POSITION)).every(Number.isNaN));
  near(system.GetParticleElement(1, Element.Type.POSITION), [1, 0, 0]);
});
