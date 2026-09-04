import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuPerFrameSource } from "../../../npm/dist/engine/webgpu/internal.js";
// The register map is Trinity's, not a backend's: Carbon keeps these numbers
// as Tr2Renderer statics because they are the contract between Trinity and
// EVERY backend (Tr2Renderer.cpp:38-43).
import { PER_FRAME_PS, PER_FRAME_VS } from "../../../npm/dist/trinity/core/index.js";

const recordOf = data => ({ GetData: () => data });

const sceneWith = (vs, ps) => ({
  GetPerFrameVSData: () => (vs ? recordOf(vs) : null),
  GetPerFramePSData: () => (ps ? recordOf(ps) : null)
});

test("each per-frame register comes from its own scene record", () =>
{
  // b1 is the vertex record and b2 the pixel one. Swapping them would bind
  // plausible bytes of the wrong length and draw a wrong picture.
  const vs = new Float32Array(4);
  const ps = new Float32Array(8);
  const source = new CjsWebgpuPerFrameSource(sceneWith(vs, ps));

  assert.equal(source.Resolve(PER_FRAME_VS), vs);
  assert.equal(source.Resolve(PER_FRAME_PS), ps);
});

test("the record is handed back live, not copied", () =>
{
  // Per-frame buffers are persistent and scene-owned, and two batches in one
  // frame read the same bytes - that is what makes them per-frame.
  const vs = new Float32Array(4);
  const source = new CjsWebgpuPerFrameSource(sceneWith(vs, new Float32Array(4)));

  vs[2] = 7;

  assert.equal(source.Resolve(PER_FRAME_VS)[2], 7);
});

test("a register that is not per-frame refuses", () =>
{
  const source = new CjsWebgpuPerFrameSource(sceneWith(new Float32Array(4), new Float32Array(4)));

  assert.throws(() => source.Resolve(3), /not a per-frame register/);
});

test("a scene holding no record says so rather than binding nothing", () =>
{
  // An empty buffer draws a black frame, which reads as a lighting bug rather
  // than a missing upload.
  const source = new CjsWebgpuPerFrameSource(sceneWith(null, new Float32Array(4)));

  assert.throws(() => source.Resolve(PER_FRAME_VS), /holds no record/);
});

test("a record that packs to nothing is refused", () =>
{
  const source = new CjsWebgpuPerFrameSource({
    GetPerFrameVSData: () => ({ GetData: () => null }),
    GetPerFramePSData: () => null
  });

  assert.throws(() => source.Resolve(PER_FRAME_VS), /did not pack to a typed array/);
});

test("no scene is refused at construction", () =>
{
  assert.throws(() => new CjsWebgpuPerFrameSource(null), /a scene is required/);
});

test("the hook has the shape the resolver calls", () =>
{
  const vs = new Float32Array(4);
  const source = new CjsWebgpuPerFrameSource(sceneWith(vs, new Float32Array(4)));

  assert.equal(source.ResolvePerFrame()(PER_FRAME_VS), vs);
});
