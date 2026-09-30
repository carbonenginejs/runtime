// The render context caches bind groups by the objects they bind; destroying a
// texture or buffer must drop the groups binding it, or the cache keeps them
// (and the objects) alive.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ForgetBindingResource, RegisterBindingUse } from "../../../npm/dist/trinityal/webgpu/core/bindingIndex.js";
import { CjsWebgpuBufferAL, CjsWebgpuTextureAL } from "../../../npm/dist/trinityal/webgpu/internal.js";

test("forgetting an object drops every cached group that binds it, and only those", () =>
{
  const cache = new Map([ [ "a", {} ], [ "b", {} ], [ "c", {} ] ]);
  const view = {}, other = {};
  RegisterBindingUse(view, cache, "a");
  RegisterBindingUse(view, cache, "b");
  RegisterBindingUse(other, cache, "c");

  assert.equal(ForgetBindingResource(view), 2);
  assert.deepEqual([ ...cache.keys() ], [ "c" ], "the other object's group stays (negative control)");
  assert.equal(ForgetBindingResource(view), 0, "a second forget finds nothing");
});

test("destroying a texture drops the cached groups that bind its views", () =>
{
  const cache = new Map([ [ "uses-view", {} ], [ "unrelated", {} ] ]);
  const texture = new CjsWebgpuTextureAL();
  const view = { kind: "view" };
  texture.m_views.set("2d:linear", view);
  RegisterBindingUse(view, cache, "uses-view");
  RegisterBindingUse({ kind: "other view" }, cache, "unrelated");

  texture.Destroy();

  assert.deepEqual([ ...cache.keys() ], [ "unrelated" ]);
});

test("destroying a buffer drops the cached groups that bind its GPU buffers", () =>
{
  const cache = new Map([ [ "uses-buffer", {} ], [ "unrelated", {} ] ]);
  const gpuBuffer = { kind: "buffer", destroy() {} };
  const buffer = new CjsWebgpuBufferAL();
  buffer._webgpu = { GetDeviceBuffer: handle => handle.gpuBuffer };
  buffer._al = { ReleaseLater(release) { release(); } };
  buffer._handles = [ { gpuBuffer, Destroy() {} } ];
  RegisterBindingUse(gpuBuffer, cache, "uses-buffer");
  RegisterBindingUse({ kind: "other buffer" }, cache, "unrelated");

  buffer.Destroy();

  assert.deepEqual([ ...cache.keys() ], [ "unrelated" ]);
});
