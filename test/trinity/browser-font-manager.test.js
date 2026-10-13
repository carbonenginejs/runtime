import test from 'node:test';
import assert from 'node:assert/strict';
import { Tr2FontManager, Tr2Renderer } from '../../npm/dist/trinity/index.js';
import * as fontModule from '../../npm/dist/trinity/index.js';

// Deterministic Canvas2D contract fixture, not evidence of browser pixel parity.
function browser(t)
{
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas');
  const calls = [];
  class Canvas
  {
    constructor(width, height) { this.width = width; this.height = height; }
    getContext()
    {
      return this.context ??= {
        measureText(text) {
          return { width: text === 'AV' ? 13 : text.length * 8, actualBoundingBoxLeft: text === ' ' ? 0 : 1, actualBoundingBoxRight: text === ' ' ? 0 : 7, actualBoundingBoxAscent: text === ' ' ? 0 : 9, actualBoundingBoxDescent: text === ' ' ? 0 : 2, fontBoundingBoxAscent: 10, fontBoundingBoxDescent: 3 };
        },
        setTransform(...args) { calls.push(['transform', ...args]); },
        fillText(...args) { calls.push(['draw', ...args]); },
        getImageData(_x, _y, width, height) {
          const data = new Uint8ClampedArray(width * height * 4);
          for (let i = 3; i < data.length; i += 4) data[i] = 127;
          return { data };
        }
      };
    }
  }
  Object.defineProperty(globalThis, 'OffscreenCanvas', { configurable: true, writable: true, value: Canvas });
  t.after(() => { if (saved) Object.defineProperty(globalThis, 'OffscreenCanvas', saved); else delete globalThis.OffscreenCanvas; });
  return calls;
}

// The fixtures have no FontFace: mark families loaded, as LoadFont would.
function loaded(manager, ...families)
{
  for (const family of families.length ? families : [ 'evefont' ]) manager._loadedFamilies.add(family);
  return manager;
}

test('browser font identities, fixed-point metrics and pair kerning', t =>
{
  browser(t);
  const manager = loaded(new Tr2FontManager()), id = manager.GetFaceID('evefont');
  assert.equal(manager.GetFaceID('evefont'), id);
  // Carbon LookupFaceIDAndGlyphIndex (Blue name "LookupGlyphIndex") resolves the
  // name through g_fontManager (Tr2FontManager.cpp:707-725).
  Tr2FontManager.initialize();
  t.after(() => Tr2FontManager.shutdown());
  loaded(fontModule.g_fontManager);
  assert.deepEqual(manager.LookupFaceIDAndGlyphIndex('evefont', 65), [fontModule.g_fontManager.GetFaceID('evefont'), 65]);
  assert.equal(manager.LookupGlyphIndex(id, 0x1f600), 0x1f600);
  assert.equal(manager.LookupGlyphIndex(id, -1), -1);
  assert.deepEqual(manager.LookupMetrics(id, 0, 12), { ascender: 640, descender: -192, height: 832 });
  assert.deepEqual(manager.LookupMetricsFromScript(id, 0, 12), [10, -3]);
  assert.equal(manager.LookupKerningXP(id, 65, 86), -3);
});

test('browser glyph coverage, bearing, cache reuse and whitespace advances', t =>
{
  const calls = browser(t), manager = loaded(new Tr2FontManager()), id = manager.GetFaceID('evefont');
  const first = manager.LookupSBit(id, 0, 12, 65);
  assert.equal(first.GetWidth(), 8); assert.equal(first.GetHeight(), 11);
  assert.equal(first.GetXOffset(), -1); assert.equal(first.GetYOffset(), 9);
  assert.equal(first.GetXAdvance(), 8); assert.equal(first.GetYAdvance(), 0);
  assert.equal(first.sbit.buffer.length, 88);
  assert.ok(first.sbit.buffer.every(value => value === 127));
  assert.deepEqual(calls[0], ['transform', 1, 0, 0, 1, 1, 9]);
  const second = manager.LookupSBit(id, 0, 12, 65);
  assert.notEqual(first, second); assert.equal(first.sbit, second.sbit);
  assert.equal(calls.filter(call => call[0] === 'draw').length, 1);
  const space = manager.LookupSBit(id, 0, 12, 32);
  assert.equal(space.GetWidth(), 0); assert.equal(space.GetXAdvance(), 8);
  assert.equal(calls.filter(call => call[0] === 'draw').length, 1);
  manager.TrimGlyphCache(0);
  assert.equal(manager._glyphs.size, 0);
  assert.equal(first.sbit.buffer.length, 88);
});

test('glyph cache trims oldest-first on tick until strictly under budget', t =>
{
  browser(t);
  const saved = Tr2Renderer.GetCurrentFrameCounter;
  let frame = 0;
  Tr2Renderer.GetCurrentFrameCounter = () => frame;
  t.after(() => { Tr2Renderer.GetCurrentFrameCounter = saved; });

  const manager = loaded(new Tr2FontManager()), id = manager.GetFaceID('evefont');
  manager.glyphCacheBudget = 176;

  // Each glyph's coverage is 8x11 = 88 bytes. Frames: A at 1, B at 2, A refreshed
  // at 3, C at 4. Adding never trims; Carbon trims in OnTick (Tr2FontManager.cpp:695-698).
  frame = 1; manager.LookupSBit(id, 0, 12, 65);
  frame = 2; manager.LookupSBit(id, 0, 12, 66);
  frame = 3; manager.LookupSBit(id, 0, 12, 65);
  frame = 4; manager.LookupSBit(id, 0, 12, 67);
  assert.equal(manager.totalGlyphsCachedSize, 264);

  // Carbon TrimGlyphCache (Tr2FontManager.cpp:631-690): ages at frame 4 are
  // C 0, A 1, B 2; delete from the oldest until the total is strictly under 176:
  // B (264 -> 176, not under), then A (176 -> 88, under). Only C remains.
  manager.OnTick(0, 0, null);
  assert.equal(manager.totalGlyphsCachedSize, 88);
  assert.equal(manager._glyphs.has(`${id}:0:12:67`), true);
  assert.equal(manager._glyphs.has(`${id}:0:12:65`), false);
  assert.equal(manager._glyphs.has(`${id}:0:12:66`), false);
});

test('font loading registers only after completion and clears fallback caches', async t =>
{
  browser(t);
  const savedFace = Object.getOwnPropertyDescriptor(globalThis, 'FontFace');
  const savedFonts = Object.getOwnPropertyDescriptor(globalThis, 'fonts');
  const added = [];
  globalThis.fonts = { add(face) { added.push(face); } };
  globalThis.FontFace = class { constructor(family, source) { this.family = family; this.source = source; } async load() { if (this.source === 'bad') throw Error('font failed'); return this; } };
  t.after(() => {
    if (savedFace) Object.defineProperty(globalThis, 'FontFace', savedFace); else delete globalThis.FontFace;
    if (savedFonts) Object.defineProperty(globalThis, 'fonts', savedFonts); else delete globalThis.fonts;
  });
  const manager = new Tr2FontManager(), id = manager.GetFaceID('evefont');
  // A family no LoadFont has registered does not work, as a FreeType face whose file never loaded.
  assert.throws(() => manager.LookupSBit(id, 0, 12, 65), /FTC_SBitCache_Lookup failed/);
  assert.equal(manager.LookupFace(id), null);
  assert.equal(await manager.LoadFont('evefont', new ArrayBuffer(4)), id);
  assert.equal(added.length, 1); assert.equal(manager.totalGlyphsCachedSize, 0);
  assert.equal(manager.LookupFace(id), 'evefont');
  manager.LookupSBit(id, 0, 12, 65);
  assert.equal(manager.totalGlyphsCachedSize, 88);
  await manager.LoadFont('evefont', new ArrayBuffer(4));
  assert.equal(manager.totalGlyphsCachedSize, 0, 'a load clears the glyph cache');
  await assert.rejects(manager.LoadFont('broken', 'bad'), /font failed/);
  assert.equal(added.length, 2, 'the two good loads only'); assert.equal(manager._faceMap.has('broken'), false);
});

test('ClearBuffer respects a view offset and length', () =>
{
  const bytes = new Uint8Array(14).fill(9);
  new Tr2FontManager().ClearBuffer(bytes.subarray(1,13), 1, 2, 6, 0x04030201);
  assert.deepEqual([...bytes], [9,1,2,3,4,9,9,1,2,3,4,9,9,9]);
  assert.throws(() => new Tr2FontManager().ClearBuffer(bytes, 4, 1, 14), /pitch/);
});


test('glyph copy uses native bottom-origin placement, clipping and alpha composition', async () =>
{
  const { Tr2SBitWrapper } = await import('../../npm/dist/trinity/index.js');
  const glyph = new Tr2SBitWrapper();
  glyph.sbit = { width: 2, height: 2, pitch: 2, left: -1, top: 2, buffer: new Uint8Array([255,128,0,255]) };
  const bytes = new Uint8Array(24);
  glyph.ToBuffer(bytes, 2, 3, 8, 0, 0, 0xff030201);
  assert.deepEqual([...bytes.slice(8,12)], [1,2,3,128]);
  assert.deepEqual([...bytes.slice(16,20)], [1,2,3,255]);
  assert.deepEqual([...bytes.slice(0,8)], new Array(8).fill(0));
  glyph.ToBuffer(bytes, 2, 3, 8, 0, 0, 0xff030201);
  assert.equal(bytes[11], 191);
});


test('text measurer preserves segment cancellation, limits and committed index rules', async t =>
{
  browser(t);
  const { Tr2FontMeasurer } = await import('../../npm/dist/trinity/index.js');
  Tr2FontManager.initialize();
  loaded(fontModule.g_fontManager);
  const text = new Tr2FontMeasurer();
  text.font = 'evefont'; text.letterSpace = 2;
  assert.equal(text.AddText('AB'), 2); assert.equal(text.cursorX, 20);
  text.AddText('C'); text.CancelLastText(); assert.equal(text.cursorX, 20);
  text.limit = 25;
  assert.equal(text.AddText('C'), 0);
  text.CancelLastText();
  text.CommitText(3, 12);
  assert.equal(text.HasCommittedText(), true); assert.equal(text.HasUncommittedText(), false);
  assert.equal(text.GetIndexAtPos(3), 0); assert.equal(text.GetIndexAtPos(14), 1);
  assert.equal(text.GetWidthAtIndex(1), 8); assert.equal(text.GetWidthAtIndex(2), 16);
  assert.equal(text.GetVertexCount(), 8);
  text.asc = 7; assert.equal(text.ascender, 7);
  let notifications = 0;
  text.RegisterForChangeNotification({ FontMeasurerChanged() { notifications++; } });
  text.Reset(); assert.equal(notifications, 1); assert.equal(text.cursorX, 0);
  assert.equal(text.HasCommittedText(), false); assert.equal(text.font, 'evefont');
});

test('committed browser text draws into a host bitmap with top-down baseline placement', async t =>
{
  browser(t);
  const { Tr2FontMeasurer } = await import('../../npm/dist/trinity/index.js');
  Tr2FontManager.initialize();
  loaded(fontModule.g_fontManager, fontModule.TR2_FONT_FALLBACK);
  const text = new Tr2FontMeasurer(), bytes = new Uint8Array(20 * 20 * 4);
  text.color = 0xff030201; text.AddText('A'); text.CommitText(2, 10);
  text.DrawToHostBitmap({ IsValid: () => true, GetFormat: () => 28, GetWidth: () => 20, GetHeight: () => 20, GetPitch: () => 80, GetRawData: () => bytes });
  assert.deepEqual([...bytes.slice(84,88)], [1,2,3,127]);
  assert.deepEqual([...bytes.slice(0,80)], new Array(80).fill(0));
});


test('font fade boundaries and underline browser metrics are retained', async t =>
{
  browser(t);
  const { Tr2FontMeasurer } = await import('../../npm/dist/trinity/index.js');
  const measurer = new Tr2FontMeasurer();
  let changes = 0;
  measurer.RegisterForChangeNotification({ FontMeasurerChanged() { changes++; } });
  measurer.fadeLeftStart = 2; measurer.fadeLeftEnd = 6;
  measurer.fadeRightStart = 10; measurer.fadeRightEnd = 14;
  assert.deepEqual([1, 4, 8, 12, 15].map(x => measurer._CalcAlphaForHorizontal(x)), [0, 0.5, 1, 0.5, 0]);
  measurer.fadeTopStart = 2; measurer.fadeTopEnd = 6;
  measurer.fadeBottomStart = 10; measurer.fadeBottomEnd = 14;
  assert.deepEqual([1, 4, 8, 12, 15].map(y => measurer._CalcAlphaForVertical(y)), [0, 0.5, 1, 0.5, 0]);
  assert.equal(changes, 8);
  const manager = loaded(new Tr2FontManager()), face = manager.GetFaceID('evefont');
  const space = manager.LookupSBit(face, 0, 12, 32), pixels = new Uint8Array(16 * 16 * 4);
  space.ToBufferWithUnderline(pixels, 16, 16, 64, 2, 6, 0xffffffff, 2);
  assert.equal(pixels[(11 * 16 + 2) * 4 + 3], 255);
  assert.equal(pixels[(11 * 16 + 11) * 4 + 3], 255);
  assert.equal(pixels[(11 * 16 + 12) * 4 + 3], 0);
});

test('text sprite runs batch by atlas identity and rebase after a split', async t =>
{
  browser(t);
  const { Tr2FontMeasurer } = await import('../../npm/dist/trinity/index.js');
  Tr2FontManager.initialize();
  t.after(() => Tr2FontManager.shutdown());
  loaded(fontModule.g_fontManager);
  const measurer = new Tr2FontMeasurer();
  measurer.font = 'evefont';
  measurer.AddText('AAA B'); measurer.CommitText(0, 10);
  const shared = {}, other = {};
  for (const bitmap of measurer._committedRenderData[0].bitmaps)
  {
    bitmap.atlasTexture = {
      GetTexture: () => bitmap === measurer._committedRenderData[0].bitmaps.at(-1) ? other : shared,
      GetTextureWindow: out => { out[0] = 0; out[1] = 0; out[2] = 0.25; out[3] = 0.5; },
      GetTextureWidth: () => 32, GetTextureHeight: () => 24
    };
  }
  measurer.PrepareSprites(null, [5, 6], [1, 0.5, 1, 1], 43, 1, 0, 0, false, [0, 0], [0, 0, 0, 1], 43);
  assert.equal(measurer.GetVertexCount(), 16);
  assert.deepEqual(measurer._drawCalls.map(run => run.spriteCount), [3, 1]);
  const draws = [];
  measurer.SubmitSprites({
    IsCapturing: () => false, GetMaxVertexCountPerDrawCall: () => 8,
    SetTexture() {}, RenderTriangleVerts(vertices, count, indices) { draws.push({ vertices, count, indices }); }
  });
  assert.deepEqual(draws.map(draw => draw.count), [8, 4, 4]);
  assert.deepEqual(draws[1].indices, [0, 1, 3, 3, 1, 2]);
  assert.deepEqual(draws[2].indices, [0, 1, 3, 3, 1, 2]);
  assert.deepEqual(Array.from(draws[0].vertices[0].position), [4, 7, 0]);
  measurer.ClearSprites();
  assert.equal(measurer._vertices, null);
  assert.ok(measurer._committedRenderData[0].bitmaps.every(bitmap => bitmap.atlasTexture === null));
});


test('text object subscriptions invalidate without changing the active clip stack', async t =>
{
  browser(t);
  const { Tr2Sprite2dTextObject, Tr2FontMeasurer } = await import('../../npm/dist/trinity/index.js');
  const text = new Tr2Sprite2dTextObject(), first = new Tr2FontMeasurer(), second = new Tr2FontMeasurer();
  text.fontMeasurer = first;
  assert.ok(first._changeListeners.has(text));
  text.fontMeasurer = second;
  assert.ok(!first._changeListeners.has(text));
  assert.ok(second._changeListeners.has(text));
  text.isDirty = false;
  second.fadeLeftStart = 2;
  assert.equal(text.isDirty, true);
  text.textWidth = 20; text.textHeight = 10;
  let depth = 0;
  second.PrepareSprites = () => {};
  second.SubmitSprites = () => { throw new Error('submission fixture'); };
  assert.throws(() => text.GatherSprites({ PushClipRectangle() { depth++; }, PopClipRectangle() { depth--; } }), /submission fixture/);
  assert.equal(depth, 0);
  text.Destroy();
  assert.ok(!second._changeListeners.has(text));
});

test('atlas view preserves texture identity, rectangle mapping, margins and notifications', async () =>
{
  const { Tr2AtlasTexture } = await import('../../npm/dist/trinity/index.js');
  const texture = new Tr2AtlasTexture(), maps = [];
  let unmapped = 0, changed = 0;
  const al = { IsValid: () => true, MapForWriting(region) { maps.push(region.m_box); return { result: 0, data: new Uint8Array(64), pitch: 16 }; }, UnmapForWriting() { unmapped++; } };
  texture.atlas = { GetTexture: () => al, GetMargin: () => 2 };
  texture._atlasArea = {};
  texture.x = 4; texture.y = 6; texture.width = 4; texture.height = 4;
  texture.atlasWidth = 32; texture.atlasHeight = 16;
  texture._FinalizePrepare();
  assert.equal(texture.GetTexture(), al);
  const window = [];
  texture.GetTextureWindow(window);
  assert.deepEqual(window, [0.125, 0.375, 0.125, 0.25]);
  texture.RegisterForChangeNotification({ AtlasTextureChanged() { changed++; } });
  assert.equal(texture.LockBuffer().pitch, 16);
  assert.equal(texture.LockBuffer(), null);
  assert.deepEqual([maps[0].left, maps[0].top, maps[0].right, maps[0].bottom], [4, 6, 8, 10]);
  texture.UnlockBuffer();
  assert.equal(texture.IsGood(), true);
  assert.equal(changed, 1);
  assert.equal(texture.LockBufferAndMargin().margin, 2);
  assert.deepEqual([maps[1].left, maps[1].top, maps[1].right, maps[1].bottom], [2, 4, 10, 12]);
  texture.UnlockBuffer();
  assert.equal(unmapped, 2);
});


// Atlas allocation, shared storage and shutdown reuse are covered with donor-derived
// values on the stub AL in texture-atlas-allocation.test.js.

test('font manager uploads a glyph once and keeps its extra shadow row transparent', async t =>
{
  browser(t);
  const { g_textureAtlasMan } = await import('../../npm/dist/trinity/index.js');
  const original = g_textureAtlasMan.atlases;
  t.after(() => { g_textureAtlasMan.atlases = original; });
  let uploads = 0, stored;
  g_textureAtlasMan.atlases = [{
    GetFormat: () => 87,
    CreateTexture(width, height) {
      stored = new Uint8Array(width * height * 4).fill(11);
      return { LockBuffer: () => ({ data: stored, pitch: width * 4 }), UnlockBuffer() { uploads++; } };
    }
  }];
  const manager = loaded(new Tr2FontManager()), face = manager.GetFaceID('evefont');
  const glyph = manager.LookupSBit(face, 0, 12, 65).sbit;
  const atlas = manager.GetAtlasTextureForSbit(glyph);
  assert.ok(atlas);
  assert.equal(manager.GetAtlasTextureForSbit(glyph), atlas);
  assert.equal(uploads, 1);
  assert.deepEqual(Array.from(stored.slice(0, 4)), [255, 255, 255, 127]);
  assert.ok(stored.slice(glyph.width * glyph.height * 4).every(value => value === 0));

  // An sbit evicted from the cache and rasterized again finds the glyph's
  // texture its old wrappers still draw: no second atlas allocation.
  manager.TrimGlyphCache(0);
  const again = manager.LookupSBit(face, 0, 12, 65).sbit;
  assert.notEqual(again, glyph);
  assert.equal(manager.GetAtlasTextureForSbit(again), atlas);
  assert.equal(uploads, 1);
  assert.equal(manager.GetNumGlyphsInUse(), 1);
  assert.equal(manager.numGlyphsCached, 1);

  // ReleaseResources forgets textures and cached glyphs for managed memory only (cpp:585-604).
  manager.ReleaseResources(0);
  assert.equal(manager.GetNumGlyphsCached(), 1);
  manager.ReleaseResources(2);
  assert.equal(manager.GetNumGlyphsCached(), 0);
  assert.equal(manager.numGlyphsInUse, 0);
});
