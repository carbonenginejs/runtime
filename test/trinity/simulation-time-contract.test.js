import assert from "node:assert/strict";
import test from "node:test";
import { EveBezierCurve, EveCircle, EveVirtualCameraSystem, Tr2ParticleSystem,
  Tr2ParticleElementDeclaration, Tr2ParticleTurbulenceForce } from "../../npm/dist/trinity/index.js";
import { noise } from "../../npm/dist/global/math/noise.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";

for (const Type of [EveBezierCurve, EveCircle])
{
  test(Type.name + " preserves signed deltas and nonfinite float arithmetic", () =>
  {
    const path = new Type();
    path._regeneratePoints = false;
    path.movementSpeed = 1;
    path.animValue = 0.5;
    path.Update({ GetDeltaT: () => -0.125 });
    assert.equal(path.animValue, 0.375);
    for (const dt of [NaN, Infinity, -Infinity])
    {
      path.animValue = 0.5;
      path.Update({ GetDeltaT: () => dt });
      assert.ok(Number.isNaN(path.animValue));
    }
  });
}

test("particle aging consumes negative and NaN deltas", t =>
{
  const system = new Tr2ParticleSystem();
  system.maxParticleCount = 1;
  system.elements.push(Object.assign(new Tr2ParticleElementDeclaration(), {
    elementType: Tr2ParticleElementDeclaration.Type.LIFETIME, usedByGPU: false
  }));
  system.Initialize();
  t.after(() => system.ReleaseResources());
  const index = system.SpawnParticle({ lifetime: [0.5, 2] });
  assert.equal(index, 0);
  system.UpdateSimulation(-0.25);
  assert.equal(system.GetParticleElement(index, Tr2ParticleElementDeclaration.Type.LIFETIME)[0], 0.375);
  system.UpdateSimulation(NaN);
  assert.ok(Number.isNaN(system.GetParticleElement(index, Tr2ParticleElementDeclaration.Type.LIFETIME)[0]));
});

test("turbulence passes its signed or nonfinite accumulated time to noise", t =>
{
  const samples = [];
  t.mock.method(noise, "turbulence", (out, x, y, z, w) => { samples.push(w); return out; });
  for (const dt of [-0.25, NaN, Infinity, -Infinity])
  {
    const force = new Tr2ParticleTurbulenceForce();
    force.noiseLevel = 1;
    force.Update(1);
    force.Update(dt);
    force.GetForce(vec3.create(), null, 0, 1, vec3.create());
    assert.equal(samples.pop(), 1 + dt);
  }
});

test("camera rejects impossible timestamps before changing its previous time", t =>
{
  const system = new EveVirtualCameraSystem();
  const deltas = [];
  t.mock.method(system.externalCamera, "Update", dt => deltas.push(dt));
  system.Update(10);
  for (const input of [NaN, Infinity, -Infinity, undefined, null, "11"])
  {
    assert.throws(() => system.Update(input), TypeError);
  }
  assert.deepEqual(deltas, [0]);
  system.Update(9.5);
  system.Update(10.25);
  assert.deepEqual(deltas, [0, -0.5, 0.75]);
});
