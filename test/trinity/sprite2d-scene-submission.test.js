import assert from "node:assert/strict";
import test from "node:test";
import { Tr2Sprite2dScene, Tr2Sprite2dD3DVertex } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";

/**
 * The scene reaches the main-thread context as Carbon does (USE_MAIN_THREAD_RENDER_CONTEXT),
 * so tests swap members on that context and restore them when the test ends.
 */
function mainContext(t, overrides)
{
  const main = Tr2RenderContext_GetMainThreadRenderContext();
  const keys = ["GetRenderContextAL", ...Object.keys(overrides)];
  const saved = keys.map(key => [key, Object.getOwnPropertyDescriptor(main, key)]);
  Object.assign(main, { GetRenderContextAL: () => ({ AddGpuMarker() {} }) }, overrides);
  t.after(() =>
  {
    for (const [key, descriptor] of saved)
    {
      if (descriptor) Object.defineProperty(main, key, descriptor);
      else delete main[key];
    }
  });
  return main;
}

function storage(scene)
{
  scene._vertexBytes = new Uint8Array(scene.maxSpriteCount * 4 * 88);
  scene._vertexView = new DataView(scene._vertexBytes.buffer);
  scene._indexData = new Uint32Array(scene.maxSpriteCount * 6);
  scene._PrepareStacksBeforeRender();
}

test("native sprite vertex bytes apply parent translation, alpha and clip without mutating cached vertices", () =>
{
  const scene = new Tr2Sprite2dScene();
  storage(scene);
  scene.PushTranslation([10, 20]);
  scene.PushClipRectangle(0, 0, 100, 50);
  scene.SetAccumulatedAlpha(0.25);
  const vertex = new Tr2Sprite2dD3DVertex();
  vertex.position.set([2, 3, 4]); vertex.color.set([1, 0.5, 0.25, 0.8]);
  vertex.blendMode = 9; vertex.spriteEffect = 43; vertex.tileMode = 3;
  scene.RenderTriangleVerts([vertex], 1, [0, 0, 0], 3);
  const view = scene._vertexView;
  assert.equal(view.getFloat32(0, true), 12);
  assert.equal(view.getFloat32(4, true), 23);
  assert.ok(Math.abs(view.getFloat32(24, true) - 0.2) < 1e-7);
  assert.deepEqual(Array.from(scene._vertexBytes.slice(64, 68)), [0, 9, 43, 3]);
  assert.deepEqual(Array.from(vertex.position), [2, 3, 4]);
  assert.equal(vertex.color[3], Math.fround(0.8));
  scene.PopClipRectangle(); scene.PopTransform(); scene._CleanUpStacksAfterRender();
});

test("scene batches offset indices and submit through the effect with ring allocations", t =>
{
  const scene = new Tr2Sprite2dScene(), calls = [];
  storage(scene);
  const vertex = new Tr2Sprite2dD3DVertex();
  const esm = { ApplyStreamSource(...args) { calls.push(["vertex", ...args]); }, ApplyIndexBuffer(value) { calls.push(["index", value]); } };
  mainContext(t, { GetEffectStateManager: () => esm });
  scene._vertexBuffer = { PutData: (_data, bytes) => { calls.push(["vertexBytes", bytes]); return { result: 0, offset: 176 }; }, GetBuffer: () => "vb", DoneUsingData() { calls.push(["vertexDone"]); } };
  scene._indexBuffer = { PutData: (_data, bytes) => { calls.push(["indexBytes", bytes]); return { result: 0, offset: 24 }; }, GetBuffer: () => "ib", DoneUsingData() { calls.push(["indexDone"]); } };
  scene._effect = { GetPassDescription: () => ({ resourceSetDesc: { SetSrv__TextureAL: () => false } }), Render(callback) { calls.push(["render", callback._indexCount, callback._drawCallStartIndex]); } };
  scene._SelectEffect = () => true;
  scene.RenderTriangleVerts([vertex, vertex], 2, [0, 1, 0], 3);
  scene.RenderTriangleVerts([vertex], 1, [0, 0, 0], 3);
  assert.deepEqual(Array.from(scene._indexData.slice(0, 6)), [0, 1, 0, 2, 2, 2]);
  scene._IssueDrawCall();
  assert.deepEqual(calls, [["vertexBytes", 264], ["indexBytes", 24], ["vertex", 0, "vb", 176, 88], ["index", "ib"], ["render", 6, 6], ["indexDone"], ["vertexDone"]]);
  assert.equal(scene._vertexCount, 0); assert.equal(scene._indexCount, 0);
  scene._CleanUpStacksAfterRender();
});

test("scene texture changes flush only across underlying atlas storage", () =>
{
  const scene = new Tr2Sprite2dScene(), al = { GetWidth: () => 32, GetHeight: () => 16 };
  let flushes = 0;
  scene._IssueDrawCall = () => { flushes++; };
  const texture = () => ({ GetTexture: () => al, GetTextureWindow: out => out.set([0, 0, 0.5, 0.5]) });
  scene.SetTexture(0, texture(), 0);
  scene.SetTexture(0, texture(), 0);
  assert.equal(flushes, 1);
  assert.deepEqual(Array.from(scene._texelSizeValues[0]), [1 / 32, 1 / 16, 0, 0]);
});

function captureContext(t)
{
  const allocations = [], draws = [];
  const context = {
    GetEffectStateManager: () => ({ ApplyIndexBuffer() {}, ApplyStreamSource() {} }),
    // Carbon's render context is the backend context; buffer creation reaches it through GetRenderContextAL.
    GetRenderContextAL() { return this; },
    AddGpuMarker() {},
    CreateBuffer(desc, initialData)
    {
      const buffer = {
        bytes: new Uint8Array(desc.count * desc.stride), alive: true, updates: 0,
        IsValid() { return this.alive; },
        GetDesc: () => desc,
        UpdateBuffer(offset, size, data) { this.bytes.set(new Uint8Array(data.buffer, data.byteOffset, size), offset); this.updates++; return 0; },
        Destroy() { this.alive = false; }
      };
      buffer.bytes.set(new Uint8Array(initialData.buffer, initialData.byteOffset, buffer.bytes.length));
      allocations.push(buffer);
      return { result: 0, implementation: buffer };
    }
  };
  const scene = new Tr2Sprite2dScene();
  storage(scene);
  mainContext(t, context);
  scene._indexBuffer = { GetBuffer: () => "direct" };
  scene._effect = {
    GetPassDescription: () => ({ resourceSetDesc: { SetSrv__TextureAL: () => false } }),
    Render(entry) { draws.push([entry.numVertices, entry.startIndex, entry.primitiveCount]); }
  };
  scene._SelectEffect = () => true;
  return { scene, allocations, draws, context };
}

test("capture retains global indices across texture batches and replays without ring uploads", t =>
{
  const { scene, allocations, draws } = captureContext(t);
  const vertex = new Tr2Sprite2dD3DVertex();
  scene.StartCapture({ SetDirty() {} });
  scene.RenderTriangleVerts([vertex, vertex], 2, [0, 1, 0], 3);
  scene._IssueDrawCall();
  scene.RenderTriangleVerts([vertex], 1, [0, 0, 0], 3);
  const list = scene.EndCapture(null);
  assert.equal(scene.IsCapturing(), false);
  assert.deepEqual(list.entries.map(e => [e.numVertices, e.startIndex, e.primitiveCount]), [[2, 0, 1], [3, 3, 1]]);
  assert.deepEqual(Array.from(new Uint32Array(allocations[1].bytes.buffer).slice(0, 6)), [0, 1, 0, 2, 2, 2]);
  scene.ReplayCapture(list);
  assert.deepEqual(draws, [[2, 0, 1], [3, 3, 1]]);
  list.Destruct();
  assert.ok(allocations.every(buffer => !buffer.alive));
  scene._CleanUpStacksAfterRender();
});

test("recapture transfers fitting buffers without destroying them with the old display list", t =>
{
  const { scene, allocations } = captureContext(t);
  const vertex = new Tr2Sprite2dD3DVertex(), owner = { SetDirty() {} };
  scene.StartCapture(owner);
  scene.RenderTriangleVerts([vertex], 1, [0, 0, 0], 3);
  const old = scene.EndCapture(null);
  scene.StartCapture(owner);
  scene.RenderTriangleVerts([vertex], 1, [0, 0, 0], 3);
  const next = scene.EndCapture(old);
  old.Destruct();
  assert.equal(allocations.length, 2);
  assert.ok(allocations.every(buffer => buffer.alive && buffer.updates === 1));
  next.Destruct();
  scene._CleanUpStacksAfterRender();
});

test("captured geometry grows beyond direct batch capacity and release invalidates its owner", t =>
{
  const { scene } = captureContext(t);
  let dirty = 0;
  scene.maxSpriteCount = 1;
  scene.StartCapture({ SetDirty() { dirty++; } });
  const vertices = Array.from({ length: 1100 }, () => new Tr2Sprite2dD3DVertex());
  scene.RenderTriangleVerts(vertices, vertices.length, Array(1600).fill(1099), 1600);
  const list = scene.EndCapture(null);
  assert.ok(scene._captureVertexDataCapacity >= 1100);
  assert.ok(scene.captureIndexDataCapacity >= 1600);
  assert.equal(list.entries[0].numVertices, 1100);
  list.ReleaseResources(3);
  assert.equal(dirty, 1);
  assert.equal(list.entries.length, 0);
  scene._CleanUpStacksAfterRender();
});

test("failed capture upload releases partial buffers and restores direct recording", t =>
{
  const { scene, allocations, context } = captureContext(t);
  const create = context.CreateBuffer;
  Tr2RenderContext_GetMainThreadRenderContext().CreateBuffer = (...args) => allocations.length ? { result: -1, implementation: null } : create(...args);
  scene.StartCapture({ SetDirty() {} });
  scene.RenderTriangleVerts([new Tr2Sprite2dD3DVertex()], 1, [0, 0, 0], 3);
  assert.equal(scene.EndCapture(null), null);
  assert.equal(scene.IsCapturing(), false);
  assert.equal(allocations[0].alive, false);
  assert.equal(scene._indexCount, 0);
  scene._CleanUpStacksAfterRender();
});


// RunJobHelper (Tr2Sprite2dScene.cpp:2139-2175) has no recovery path: Carbon runs the job between
// the state handoff and the restore, so that is the whole sequence.
test("embedded render jobs receive frame clocks between the UI state handoff and restore", t =>
{
  const scene = new Tr2Sprite2dScene(), calls = [];
  const esm = {};
  for (const name of ["EndManagedRendering", "PopDepthStencilBuffer", "PushRenderTarget__TextureAL", "PushViewport", "PopViewport", "PopRenderTarget", "PushDepthStencilBuffer__TextureAL", "BeginManagedRendering", "ApplyStandardStates", "ApplyVertexDeclaration", "ApplyIndexBuffer"])
    esm[name] = () => calls.push(name);
  mainContext(t, { GetEffectStateManager: () => esm });
  scene._realTime = 123; scene._simTime = 456;
  scene.RunJob({ Run(real, sim) { assert.deepEqual([real, sim], [123, 456]); calls.push("job"); } });
  assert.deepEqual(calls, ["EndManagedRendering", "PopDepthStencilBuffer", "PushRenderTarget__TextureAL", "PushViewport", "job", "PopViewport", "PopRenderTarget", "PushDepthStencilBuffer__TextureAL", "BeginManagedRendering", "ApplyStandardStates", "ApplyVertexDeclaration", "ApplyIndexBuffer"]);
});

test("capture records embedded jobs in sequence between geometry batches", t =>
{
  const { scene } = captureContext(t), vertex = new Tr2Sprite2dD3DVertex();
  const job = { Run() {} };
  scene.StartCapture({ SetDirty() {} });
  scene.RenderTriangleVerts([vertex], 1, [0, 0, 0], 3);
  scene.RunJob(job);
  scene.RenderTriangleVerts([vertex], 1, [0, 0, 0], 3);
  const list = scene.EndCapture(null);
  assert.deepEqual(list.entries.map(entry => entry.job), [null, job, null]);
  assert.deepEqual(list.entries.map(entry => entry.startIndex), [0, 0, 3]);
  list.Destruct();
  scene._CleanUpStacksAfterRender();
});
