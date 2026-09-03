import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuSamplerSource } from "../../../npm/dist/engine/webgpu/internal.js";

/** The authored state of `s0` in a real quadv5.sm_hi. */
const S0 = Object.freeze({
  comparison: false,
  minFilter: 3,
  magFilter: 2,
  mipFilter: 2,
  addressU: 1,
  addressV: 1,
  addressW: 3,
  mipLODBias: 0,
  maxAnisotropy: 16,
  comparisonFunc: 1,
  borderColor: [ 0, 0, 0, 0 ],
  minLOD: -3.4028234663852886e+38,
  maxLOD: 3.4028234663852886e+38,
  isDynamic: false
});

const bindingFor = (name, sampler = S0) => ({ name, carbon: { sampler } });

class TestDevice
{
  created = [];

  CreateSampler(descriptor)
  {
    this.created.push(descriptor);
    return { id: this.created.length };
  }
}

test("a declared sampler is created from its authored state", async () =>
{
  const device = new TestDevice();
  const source = new CjsWebgpuSamplerSource(device);

  const sampler = await source.Resolve("s0", null, bindingFor("s0"));

  assert.equal(device.created.length, 1);
  assert.equal(device.created[0].addressModeU, "repeat");
  assert.equal(device.created[0].maxAnisotropy, 16);
  assert.ok(sampler);
});

test("two names authoring the same state share one sampler", async () =>
{
  // Carbon shares samplers across textures; quadv5 binds nine textures against
  // a single s0. Creating one per name would multiply them for no reason.
  const device = new TestDevice();
  const source = new CjsWebgpuSamplerSource(device);

  const first = await source.Resolve("s0", null, bindingFor("s0"));
  const second = await source.Resolve("s1", null, bindingFor("s1"));

  assert.equal(device.created.length, 1);
  assert.equal(first, second);
});

test("different authored state is a different sampler", async () =>
{
  const device = new TestDevice();
  const source = new CjsWebgpuSamplerSource(device);

  await source.Resolve("s0", null, bindingFor("s0"));
  await source.Resolve("s1", null, bindingFor("s1", { ...S0, addressU: 3 }));

  assert.equal(device.created.length, 2);
});

test("a binding with no authored state refuses rather than defaulting", async () =>
{
  // A default sampler would draw a wrong picture rather than fail.
  const source = new CjsWebgpuSamplerSource(new TestDevice());

  await assert.rejects(
    async () => source.Resolve("s0", null, { name: "s0" }),
    /no authored state/
  );
});

test("the hook has the shape the resolver calls", async () =>
{
  const device = new TestDevice();
  const source = new CjsWebgpuSamplerSource(device);

  const sampler = await source.ResolveSampler()("s0", null, bindingFor("s0"));

  assert.ok(sampler);
});

test("Clear forgets samplers so a lost device can rebuild them", async () =>
{
  const device = new TestDevice();
  const source = new CjsWebgpuSamplerSource(device);

  await source.Resolve("s0", null, bindingFor("s0"));
  source.Clear();
  await source.Resolve("s0", null, bindingFor("s0"));

  assert.equal(device.created.length, 2);
});
