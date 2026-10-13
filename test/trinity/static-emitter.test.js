import assert from "node:assert/strict";
import test from "node:test";
import { Tr2ParticleElementDeclaration, Tr2ParticleSystem, Tr2RenderContext_GetMainThreadRenderContext, Tr2StaticEmitter } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";

/** Resource creation is allowed only with a live main-thread context (Tr2Renderer.IsResourceCreationAllowed). */
function liveContext(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  t.after(() => context.SetRenderContextAL(prior));
}

/** Three vertices: Float32 positions and a Float16 texcoord, as a CMF-form mesh. */
function geometry(decl = [
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
  { usage: "TexCoord", usageIndex: 0, type: "Float16", elementCount: 2, offset: 12 }
])
{
  const resource = new TriGeometryRes();
  resource.SetPayload({
    meshes: [ {
      decl,
      vertex: {
        position: new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]),
        texcoord0: new Float32Array([ 0.5, 0.25, 0.75, 1, 0, 0.125 ])
      }
    } ]
  });
  resource.MarkPrepared();
  return resource;
}

function element(type, { dimension = 1, usageIndex = 0, customName = "" } = {})
{
  const declaration = new Tr2ParticleElementDeclaration();
  declaration.elementType = type;
  declaration.dimension = dimension;
  declaration.usageIndex = usageIndex;
  declaration.customName = customName;
  declaration.usedByGPU = false;
  return declaration;
}

function system(...elements)
{
  const particles = new Tr2ParticleSystem();
  particles.maxParticleCount = 8;
  particles.elements.push(...elements);
  particles.Initialize();
  assert.equal(particles.IsValid(), true);
  return particles;
}

test("ForceSpawn inserts one particle per vertex, matching elements by usage and zero-filling the rest", t =>
{
  liveContext(t);
  const Type = Tr2ParticleElementDeclaration.Type;
  const particles = system(
    element(Type.POSITION),
    element(Type.CUSTOM, { dimension: 2, usageIndex: 0, customName: "uv" }),
    element(Type.VELOCITY)
  );
  const emitter = new Tr2StaticEmitter();
  emitter.particleSystem = particles;
  emitter.geometryResource = geometry();

  emitter.ForceSpawn();

  assert.equal(emitter.hasSpawnedParticles, true);
  assert.equal(particles.aliveCount, 3);
  assert.deepEqual(Array.from(particles.GetParticleElement(1, Type.POSITION)), [ 4, 5, 6 ]);
  // CUSTOM reads TEXCOORD at its usage index (Tr2ParticleElementDeclaration.cpp:86-96).
  assert.deepEqual(Array.from(particles.GetParticleElement(2, "uv")), [ 0, 0.125 ]);
  // VELOCITY reads NORMAL, which this mesh lacks: zero-filled (Tr2StaticEmitter.cpp:142-155).
  assert.deepEqual(Array.from(particles.GetParticleElement(0, Type.VELOCITY)), [ 0, 0, 0 ]);
});

test("ForceSpawn waits for good geometry and a valid system, then spawns once from Update", t =>
{
  liveContext(t);
  const particles = system(element(Tr2ParticleElementDeclaration.Type.POSITION));
  const emitter = new Tr2StaticEmitter();
  emitter.particleSystem = particles;
  const pending = geometry();
  pending.MarkLoading();
  emitter.geometryResource = pending;

  emitter.Update(null);
  assert.equal(emitter.hasSpawnedParticles, false, "nothing to read yet; retried next update");
  assert.equal(particles.aliveCount, 0);

  emitter.geometryResource = geometry();
  emitter.Update(null);
  assert.equal(particles.aliveCount, 3);
  particles.ClearParticles();
  emitter.Update(null);
  assert.equal(particles.aliveCount, 0, "a one-shot emitter does not spawn again until Spawn()");
  emitter.Spawn();
  emitter.Update(null);
  assert.equal(particles.aliveCount, 3);
});

test("ForceSpawn refuses a vertex element that is neither Float32 nor Float16", t =>
{
  liveContext(t);
  const particles = system(element(Tr2ParticleElementDeclaration.Type.POSITION));
  const emitter = new Tr2StaticEmitter();
  emitter.particleSystem = particles;
  emitter.geometryResource = geometry([ { usage: "Position", usageIndex: 0, type: "UInt16Norm", elementCount: 3, offset: 0 } ]);

  emitter.ForceSpawn();

  assert.equal(particles.aliveCount, 0);
  assert.equal(emitter.hasSpawnedParticles, true, "Carbon marks the attempt spawned before validating (cpp:196-213)");
});

test("an invalid mesh index logs and spawns nothing", t =>
{
  liveContext(t);
  const particles = system(element(Tr2ParticleElementDeclaration.Type.POSITION));
  const emitter = new Tr2StaticEmitter();
  emitter.particleSystem = particles;
  emitter.geometryResource = geometry();
  emitter.meshIndex = 4;

  emitter.ForceSpawn();

  assert.equal(particles.aliveCount, 0);
});
