import assert from "node:assert/strict";
import test from "node:test";
import { EveSprite2dBracketRenderer, EveSprite2dBracket, Tr2Sprite2dScene } from "../../npm/dist/trinity/index.js";

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
    RenderTriangleVerts__Buffers(...args) { calls.push(["draw", ...args]); }
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

test("direct buffer submission flushes pending sprites, binds atlas and restores after draw failure", () =>
{
  const scene = new Tr2Sprite2dScene(), calls = [];
  scene._IssueDrawCall = () => calls.push("flush");
  scene._SelectEffect = () => true;
  scene._indexBuffer = { GetBuffer: () => "ring" };
  scene._renderContext = { GetEffectStateManager: () => ({
    ApplyIndexBuffer: value => calls.push(value), ApplyStreamSource: (...args) => calls.push(args)
  }) };
  scene._texture[0] = { GetTexture: () => "atlas" };
  scene._effect = {
    GetPassDescription: () => ({ resourceSetDesc: { SetSrv__TextureAL: (...args) => { calls.push(args[2]); return true; } } }),
    Render: renderer => { assert.equal(renderer._indexCount, 6); assert.equal(renderer._drawCallStartIndex, 0); throw new Error("draw failed"); }
  };
  assert.throws(() => scene.RenderTriangleVerts__Buffers("vb", 4, "ib", 6), /draw failed/);
  assert.deepEqual(calls, ["flush", "atlas", null, "ib", [0, "vb", 0, 88], "ring"]);
  assert.equal(scene._indexCount, 0); assert.equal(scene._vertexCount, 0);
  scene._captureDisplayList = {};
  assert.throws(() => scene.RenderTriangleVerts__Buffers("vb", 4, "ib", 6), /cannot be captured/);
});
