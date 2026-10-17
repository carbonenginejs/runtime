// Tr2ParticleSystem's process-wide accounting (Tr2ParticleSystem.cpp:16-21,
// 350-427, 844-878): the registry of live systems, the capacity every built
// system holds, and the cpuMaxParticleCount cap on dynamic systems.
import test from "node:test";
import assert from "node:assert/strict";
import { Tr2ParticleSystem, Tr2ParticleElementDeclaration } from "../../npm/dist/trinity/index.js";

function positionSystem(maxParticleCount, dynamic = true)
{
  const system = new Tr2ParticleSystem();
  const declaration = new Tr2ParticleElementDeclaration();
  declaration.elementType = Tr2ParticleElementDeclaration.Type.POSITION;
  system.updateSimulation = dynamic;
  system.maxParticleCount = maxParticleCount;
  system.elements.push(declaration);
  assert.equal(system.UpdateElementDeclaration(), true);
  return system;
}

test("the registry holds a system from construction until Destroy", () =>
{
  const system = new Tr2ParticleSystem();
  assert.ok(Tr2ParticleSystem.getAllSystems().has(system));
  system.Destroy();
  assert.ok(!Tr2ParticleSystem.getAllSystems().has(system));
});

test("built buffers claim capacity, Destroy and resizing return it, and dynamic systems are capped", () =>
{
  const savedCap = Tr2ParticleSystem.cpuMaxParticleCount;
  const base = Tr2ParticleSystem._totalParticleCount;
  try
  {
    const first = positionSystem(100);
    assert.equal(Tr2ParticleSystem._totalParticleCount, base + 100);

    assert.equal(first.SetMaxParticleCount(40), 40);
    assert.equal(Tr2ParticleSystem._totalParticleCount, base + 40, "resizing returns the old capacity first");

    // A dynamic system that would reach the cap gets no buffers and zero capacity.
    Tr2ParticleSystem.cpuMaxParticleCount = base + 100;
    const capped = positionSystem(60);
    assert.equal(capped.maxParticleCount, 0);
    assert.equal(Tr2ParticleSystem._totalParticleCount, base + 40);

    // Only dynamic systems are capped (cpp:399-407).
    const staticSystem = positionSystem(60, false);
    assert.equal(staticSystem.maxParticleCount, 60);
    assert.equal(Tr2ParticleSystem._totalParticleCount, base + 100);

    first.Destroy();
    staticSystem.Destroy();
    capped.Destroy();
    assert.equal(Tr2ParticleSystem._totalParticleCount, base);
  }
  finally
  {
    Tr2ParticleSystem.cpuMaxParticleCount = savedCap;
  }
});

test("updateAllSystems updates every live system; the same-time guard never fires (cpp:848-856 quirk)", () =>
{
  const seen = [];
  const systems = [ new Tr2ParticleSystem(), new Tr2ParticleSystem() ];
  for (const system of systems) system.Update = args => seen.push([ system, args ]);
  const args = { time: 5 };

  Tr2ParticleSystem.updateAllSystems(args);
  Tr2ParticleSystem.updateAllSystems(args);
  for (const system of systems)
  {
    assert.equal(seen.filter(([ s ]) => s === system).length, 2);
    system.Destroy();
  }
});
