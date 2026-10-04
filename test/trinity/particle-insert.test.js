import assert from "node:assert/strict";
import test from "node:test";
import { Tr2ParticleSystem, Tr2ParticleElementDeclaration } from "../../npm/dist/trinity/index.js";

const { Type } = Tr2ParticleElementDeclaration;

function system(t, maxParticleCount = 2)
{
  const value = new Tr2ParticleSystem();
  value.maxParticleCount = maxParticleCount;
  for (const fields of [
    { elementType: Type.POSITION },
    { elementType: Type.VELOCITY },
    { elementType: Type.LIFETIME, usedByGPU: false }
  ]) value.elements.push(Object.assign(new Tr2ParticleElementDeclaration(), fields));
  value.Initialize();
  t.after(() => value.ReleaseResources());
  return value;
}

test("InsertParticle points each buffer at the new slot, counts it alive and raises the peak (cpp:1293-1316)", t =>
{
  const particles = system(t);
  const particle = [];

  assert.equal(particles.InsertParticle(particle), true);
  assert.equal(particles.InsertParticle(particle), true);
  assert.equal(particles.aliveCount, 2);
  assert.equal(particles.peakAliveCount, 2, "the peak rises in InsertParticle, not in DoneInsertingParticle");

  // One view per Tr2ParticleElementData buffer, starting at the second slot.
  assert.equal(particle.length, particles._buffers.length);
  for (let index = 0; index < particle.length; index++)
  {
    assert.equal(particle[index].buffer, particles._buffers[index].buffer);
    assert.equal(particle[index].byteOffset, particles._buffers[index].byteOffset + particles._strides[index] * 1 * 4);
  }

  // A write through the view at the element's offset is that particle's element value.
  const position = particles.GetElement(Type.POSITION);
  particle[position.bufferIndex].set([ 1, 2, 3 ], position.startOffset);
  particles.DoneInsertingParticle();
  assert.deepEqual(Array.from(particles.GetParticleElement(1, Type.POSITION)), [ 1, 2, 3 ]);
});

test("InsertParticle on a full system returns false and leaves the system and the output alone", t =>
{
  const particles = system(t, 1);
  const particle = [];
  assert.equal(particles.InsertParticle(particle), true);
  const first = particle.slice();
  particles._bufferDirty = false;

  assert.equal(particles.InsertParticle(particle), false);
  assert.equal(particles.aliveCount, 1);
  assert.equal(particles._bufferDirty, false);
  assert.deepEqual(particle, first);
});

test("GetElementStream returns the semantic element's first value and its buffer stride (cpp:440-451)", t =>
{
  const particles = system(t);
  particles.InsertParticle([]);
  particles.InsertParticle([]);
  particles.SetParticleElement(1, Type.VELOCITY, [ 4, 5, 6 ]);

  const out = { element: null, stride: -1 };
  assert.equal(particles.GetElementStream(Type.VELOCITY, out), true);
  const velocity = particles.GetElement(Type.VELOCITY);
  assert.equal(out.stride, particles._strides[velocity.bufferIndex]);
  assert.deepEqual(Array.from(out.element.subarray(out.stride, out.stride + 3)), [ 4, 5, 6 ]);

  // MASS is not declared: Carbon's m_offset == -1 branch.
  assert.equal(particles.GetElementStream(Type.MASS, out), false);
  assert.equal(out.element, null);
  assert.equal(out.stride, 0);
});
