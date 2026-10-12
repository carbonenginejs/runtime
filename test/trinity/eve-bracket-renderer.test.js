import assert from "node:assert/strict";
import test from "node:test";
import { EveSprite2dBracketRenderer, EveSprite2dBracket, Tr2Sprite2dScene, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";

function buffer()
{
  return {
    creates: 0, unmaps: 0, data: null,
    Create(desc) { this.creates++; this.data = new Uint8Array(desc.count * desc.stride); return 0; },
    MapForWriting() { return { result: 0, data: this.data }; },
    UnmapForWriting() { this.unmaps++; },
    Destroy() { this.data = null; }
  };
}

function fixture()
{
  const batch = new EveSprite2dBracketRenderer();
  batch._vertexBuffer = buffer(); batch._indexBuffer = buffer();
  batch.displayX = 3; batch.displayY = 4;
  const calls = [];
  const renderer = {
    GetTranslation: () => [10, 20],
    GetClipRectangle: () => ({ left: 1, top: 2, right: 300, bottom: 400 }),
    SetTexture(...args) { calls.push(["texture", ...args]); },
    RenderTriangleVerts__Tr2BufferAL(...args) { calls.push(["draw", ...args]); }
  };
  const atlas = {};
  function bracket({ display = true, loading = false, texture = atlas } = {})
  {
    const item = new EveSprite2dBracket();
    item.display = display;
    item.translation.set([5, 6]);
    item.color.set([1, 0.5, 0.25, 0.75]);
    item.icon = {
      IsLoading: () => loading, GetTexture: () => texture,
      GetTextureWindow: out => out.set([0.25, 0.5, 0.125, 0.25]),
      GetWidth: () => 16, GetHeight: () => 32
    };
    return item;
  }
  return { batch, renderer, calls, bracket };
}

test("brackets compact visible loaded icons, preserving native UVs, colour, clip and topology", () =>
{
  const { batch, renderer, calls, bracket } = fixture();
  batch.brackets.push(bracket({ display: false }), bracket(), bracket({ loading: true }), bracket());
  batch.GatherSprites(renderer);
  assert.equal(calls[1][2], 8); assert.equal(calls[1][4], 12);
  const data = new DataView(batch._vertexBuffer.data.buffer);
  assert.equal(data.getFloat32(0, true), 18);
  assert.equal(data.getFloat32(4, true), 30);
  assert.equal(data.getFloat32(88, true), 34);
  assert.equal(data.getFloat32(180, true), 62);
  assert.equal(data.getFloat32(24, true), 0.75);
  assert.equal(data.getFloat32(28, true), 0.25);
  assert.equal(data.getFloat32(88 + 28, true), 0.375);
  assert.equal(data.getFloat32(44, true), 1);
  assert.equal(data.getFloat32(60, true), 1);
  assert.equal(data.getUint8(65), 9);
  assert.deepEqual(Array.from(new Uint16Array(batch._indexBuffer.data.buffer).slice(0, 12)), [0, 1, 3, 3, 1, 2, 4, 5, 7, 7, 5, 6]);
  batch.GatherSprites(renderer);
  assert.equal(batch._vertexBuffer.creates, 1);
  assert.equal(batch._indexBuffer.unmaps, 1);
  batch.brackets.pop(); batch.GatherSprites(renderer);
  assert.equal(batch._vertexBuffer.creates, 2);
  batch.ReleaseResources(0);
  assert.equal(batch._bracketCountInBuffers, 0);
  assert.equal(batch._vertexBuffer.data, null);
});

test("hidden/loading batches do not draw; atlas violations unmap before throwing", () =>
{
  const { batch, renderer, calls, bracket } = fixture();
  batch.brackets.push(bracket({ loading: true }));
  batch.GatherSprites(renderer);
  assert.equal(calls.length, 0);
  batch.brackets.push(bracket(), bracket({ texture: {} }));
  assert.throws(() => batch.GatherSprites(renderer), /share one texture atlas/);
  assert.equal(batch._vertexBuffer.unmaps, 2);
  batch.display = false;
  batch.GatherSprites(renderer);
  assert.equal(batch._vertexBuffer.unmaps, 2);
  assert.equal(batch.PickPoint(0, 0, renderer), null);
});

test("buffer submission follows Carbon order: flush, bind buffers, draw, restore the ring index buffer", t =>
{
  // Carbon Tr2Sprite2dScene::RenderTriangleVerts( Tr2BufferAL&, ... ) (Tr2Sprite2dScene.cpp:1021-1045):
  // SelectEffect, IssueDrawCall, ApplyIndexBuffer(indices), ApplyStreamSource(0, vertices, 0, 88),
  // m_indexCount = indexCount, effect Render, m_vertexCount = 0, ApplyIndexBuffer(ring).
  // Two kept silent fixes are asserted as such: textures are bound before the draw (CE-124),
  // and the draw starts at index 0 with the index count cleared afterwards (CE-123).
  const scene = new Tr2Sprite2dScene(), calls = [];
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const saved = context.GetEffectStateManager;
  context.GetEffectStateManager = () => ({
    ApplyIndexBuffer: value => calls.push(["index", value]), ApplyStreamSource: (...args) => calls.push(["stream", ...args])
  });
  t.after(() => { context.GetEffectStateManager = saved; });

  scene._IssueDrawCall = () => calls.push("flush");
  scene._SelectEffect = () => true;
  scene._indexBuffer = { GetBuffer: () => "ring" };
  scene._drawCallStartIndex = 96;
  scene._texture[0] = { GetTexture: () => "atlas" };
  scene._effect = {
    GetPassDescription: () => ({ resourceSetDesc: { SetSrv__TextureAL: (...args) => { calls.push(["srv", args[2]]); return true; } } }),
    Render: renderer => { calls.push(["render", renderer._indexCount, renderer._drawCallStartIndex]); }
  };

  scene.RenderTriangleVerts__Tr2BufferAL("vb", 4, "ib", 6);

  assert.deepEqual(calls, ["flush", ["srv", "atlas"], ["srv", null], ["index", "ib"], ["stream", 0, "vb", 0, 88], ["render", 6, 0], ["index", "ring"]]);
  assert.equal(scene._vertexCount, 0);
  assert.equal(scene._indexCount, 0);
});
