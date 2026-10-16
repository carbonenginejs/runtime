// Tr2TextureAtlas / Tr2AtlasTexture / Tr2TextureAtlasMan on Carbon's stub AL.
//
// Every expected value is derived by hand from the donor, trinity/trinity:
//   Tr2TextureAtlas.cpp (GetFreeArea :688-860, CreateTexture :1079-1164,
//   RemoveFromAtlas :194-219, PullInOutsiders :967-1034, EjectTextureHelper
//   :1287-1356, ReleasePendingFreeAreas :1393-1415, EjectAllTextures :1358-1391,
//   ConsolidateFreeAreas :223-442) and the stub AL frame counters
//   (Tr2RenderContextALStub: recording = rendered + 1, Present advances rendered).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Tr2TextureAtlas, Tr2TextureAtlasMan, Tr2TextureAtlasArea, Tr2RenderContext_GetMainThreadRenderContext } from '../../npm/dist/trinity/index.js';
import { Tr2RenderContextALStub } from '../../npm/dist/trinityal/index.js';
import { PixelFormat } from '../../npm/dist/global/consts/renderContext/index.js';

const BGRA = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;

/** Installs a stub AL with a device on the main-thread context for one test. */
function stubDevice(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  t.after(() => context.SetRenderContextAL(prior));
  return al;
}

/** Plain rectangle tuples, for comparison. */
function rects(list)
{
  return list.map(r => [r.left, r.top, r.right, r.bottom]);
}

test('best-fit allocation with eight-pixel alignment and small-region pre-split', t =>
{
  stubDevice(t);
  const atlas = new Tr2TextureAtlas();
  atlas.Initialize(BGRA, 512, 512);

  // CreateTexture(10,10): GetFreeArea(10+2*2, 10+2*2) aligns 14 -> 16 (:701-702).
  // The only free area is 512x512. minNewRegion = 128 + 2*4 = 136 (:762); 16 < 136, so
  // a vertical split leaves [0,136,512,512] (:768-779) and a horizontal one [136,0,512,136]
  // (:781-792). The stale 512x512 size (CE-135) matches neither 16, so two areas follow:
  // [16,0,136,16] and [0,16,136,136] (:822-839). Texture at area + margin = (2,2).
  const first = atlas.CreateTexture(10, 10);
  assert.deepEqual([first.x, first.y, first.width, first.height, first.atlasWidth], [2, 2, 10, 10, 512]);
  assert.deepEqual(rects(atlas.GetFreeAreas()), [[0, 136, 512, 512], [136, 0, 512, 136], [16, 0, 136, 16], [0, 16, 136, 136]]);
  assert.equal(atlas.GetFreeTexels(), 512 * 512 - 16 * 16);

  // Maxima are refreshed only if the taken area was >= the cached maxima (:843-847): the
  // pre-split 136x136 is not >= 512, so the cached 512x512 survives although no free area
  // is 512 high any more.
  assert.deepEqual([atlas.GetFreeMaxWidth(), atlas.GetFreeMaxHeight()], [512, 512]);

  // Second 16x16: metrics min(slack) are 360, 120, 0 and 104 (:724), so [16,0,136,16] wins.
  // Its height equals 16, so it splits horizontally into [32,0,136,16] (:808-819).
  const second = atlas.CreateTexture(10, 10);
  assert.deepEqual([second.x, second.y], [18, 2]);
  assert.deepEqual(rects(atlas.GetFreeAreas()), [[0, 136, 512, 512], [136, 0, 512, 136], [0, 16, 136, 136], [32, 0, 136, 16]]);
  assert.equal(first.GetTexture(), atlas.GetTexture());
  assert.equal(second.GetTexture(), atlas.GetTexture());
  assert.equal(atlas.texturesInAtlasCount, 2);
  assert.deepEqual(rects(atlas.GetUsedAreas()).sort(), [[0, 0, 16, 16], [16, 0, 32, 16]]);

  // 600x600 > m_maxTextureArea 512*512 (:1087, :1437-1446): an outsider with its own texture.
  const large = atlas.CreateTexture(600, 600);
  assert.deepEqual([large.x, large.y, large.atlasWidth, large.atlasHeight], [0, 0, 600, 600]);
  assert.notEqual(large.GetTexture(), atlas.GetTexture());
  assert.equal(atlas.texturesOutsideAtlasCount, 1);
  assert.equal(large.IsPrepared(), true);
  assert.equal(large.IsGood(), false);
});

test('removal pulls an outsider in; stand-alone ejects it with a frame-delayed free', t =>
{
  const al = stubDevice(t);
  const atlas = new Tr2TextureAtlas();
  atlas.Initialize(BGRA, 64, 64);

  // 60+4 = 64: a perfect fit for the whole atlas (:716-720, :736-751).
  const full = atlas.CreateTexture(60, 60);
  assert.deepEqual([full.x, full.y], [2, 2]);
  assert.equal(atlas.GetFreeTexels(), 0);

  // No free area is left, so 8x8 becomes an outsider (:1116-1150).
  const outsider = atlas.CreateTexture(8, 8);
  assert.equal(atlas.texturesOutsideAtlasCount, 1);
  assert.equal(outsider.atlasWidth, 8);

  // OnShutdown -> RemoveFromAtlas frees 64x64 and, with optimizeOnRemoval, PullInOutsiders
  // (:210-213). 12 -> 16 out of 64x64: 64 is not > 136, so no pre-split; two new areas
  // [16,0,64,16] and [0,16,64,64]; the outsider lands at (2,2) inside the atlas (:1016-1017).
  full.OnShutdown();
  assert.equal(atlas.texturesInAtlasCount, 1);
  assert.equal(atlas.texturesOutsideAtlasCount, 0);
  assert.deepEqual([outsider.x, outsider.y, outsider.atlasWidth], [2, 2, 64]);
  assert.equal(outsider.GetTexture(), atlas.GetTexture());
  assert.equal(outsider._texture.IsValid(), false);
  assert.equal(atlas.GetFreeTexels(), 64 * 64 - 16 * 16);

  // SetStandAlone(true) -> EjectTexture (Tr2AtlasTexture.cpp:473-484). The area goes to the
  // pending list stamped with the recording frame (:1345); the free texel count is not
  // credited (bug, :1342-1347 + FreeArea :1417-1435).
  outsider.SetStandAlone(true);
  assert.equal(atlas.texturesInAtlasCount, 0);
  assert.equal(atlas.texturesOutsideAtlasCount, 1);
  assert.deepEqual([outsider.x, outsider.y, outsider.atlasWidth], [0, 0, 8]);
  assert.notEqual(outsider.GetTexture(), atlas.GetTexture());
  assert.equal(atlas.GetFreeTexels(), 64 * 64 - 16 * 16);
  assert.deepEqual(rects(atlas.GetFreeAreas()), [[16, 0, 64, 16], [0, 16, 64, 64], [0, 0, 16, 16]]);

  // Same frame: rendered < recording, so the pending area is not reusable (:1400). Best fit
  // for 16x16 is [16,0,64,16] (slack 0), split horizontally -> texture at (18,2).
  const sameFrame = atlas.CreateTexture(8, 8);
  assert.deepEqual([sameFrame.x, sameFrame.y], [18, 2]);

  // After Present the device has rendered the eject frame: the pending area is freed at the
  // next allocation, and 16x16 is a perfect fit for it -> (2,2).
  al.Present();
  const nextFrame = atlas.CreateTexture(8, 8);
  assert.deepEqual([nextFrame.x, nextFrame.y], [2, 2]);
  assert.deepEqual(rects(atlas.GetFreeAreas()), [[0, 16, 64, 64], [32, 0, 64, 16]]);

  // A stand-alone outsider is skipped by PullInOutsiders (:997-1001).
  sameFrame.OnShutdown();
  assert.equal(atlas.texturesOutsideAtlasCount, 1);
  assert.equal(outsider.GetTexture() === atlas.GetTexture(), false);
});

test('EjectAllTextures resets the free list while ejected areas stay pending', t =>
{
  const al = stubDevice(t);
  const atlas = new Tr2TextureAtlas();
  atlas.Initialize(BGRA, 64, 64);
  const a = atlas.CreateTexture(8, 8), b = atlas.CreateTexture(8, 8);
  assert.deepEqual([[a.x, a.y], [b.x, b.y]], [[2, 2], [18, 2]]);

  // Both eject; the in-atlas set empties, so the free list becomes one 64x64 area
  // (:1373-1386) while the two 16x16 areas are still pending. GetFreeAreas lists both
  // kinds (:1216-1228).
  atlas.EjectAllTextures();
  assert.equal(atlas.texturesInAtlasCount, 0);
  assert.equal(atlas.texturesOutsideAtlasCount, 2);
  assert.deepEqual(rects(atlas.GetFreeAreas()), [[0, 0, 64, 64], [0, 0, 16, 16], [16, 0, 32, 16]]);

  // bug: once released they overlap the full area, so the free list holds overlapping
  // rectangles. Force the release through an allocation that needs 64x64.
  al.Present();
  atlas.SetMargin(0);
  const whole = atlas.CreateTexture(64, 64);
  assert.deepEqual([whole.x, whole.y], [0, 0]);
  assert.deepEqual(rects(atlas.GetFreeAreas()), [[0, 0, 16, 16], [16, 0, 32, 16]]);
});

test('ConsolidateFreeAreas only merges an area with the one directly above it', t =>
{
  stubDevice(t);
  const atlas = new Tr2TextureAtlas();
  atlas.Initialize(BGRA, 64, 64);

  // i below j: rect_i.top == rect_j.bottom with equal left/right -> merged (:264-285).
  atlas._freeAreas = [new Tr2TextureAtlasArea(0, 16, 32, 32), new Tr2TextureAtlasArea(0, 0, 32, 16)];
  atlas.ConsolidateFreeAreas();
  assert.deepEqual(rects(atlas.GetFreeAreas()), [[0, 0, 32, 32]]);

  // i above j: quirk, the test reads rect_i.bottom == rect_i.top (:264), so nothing merges.
  atlas._freeAreas = [new Tr2TextureAtlasArea(0, 0, 32, 16), new Tr2TextureAtlasArea(0, 16, 32, 32)];
  atlas.ConsolidateFreeAreas();
  assert.deepEqual(rects(atlas.GetFreeAreas()), [[0, 0, 32, 16], [0, 16, 32, 32]]);
});

test('without a device the atlas stays unprepared and creates no outsiders', t =>
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  context.SetRenderContextAL(null);
  t.after(() => context.SetRenderContextAL(prior));

  // PrepareResources skips OnPrepareResources (Tr2DeviceResource.cpp:21-33); no free area
  // exists, and the outsider branch returns E_DEVICELOST (:1118-1122) -> null here.
  const atlas = new Tr2TextureAtlas();
  atlas.Initialize(BGRA, 64, 64);
  assert.equal(atlas.GetTexture().IsValid(), false);
  assert.equal(atlas.CreateTexture(8, 8), null);
});

test('AddAtlas appends a duplicate format as a release build does; FindAtlas returns the first', t =>
{
  stubDevice(t);
  const manager = new Tr2TextureAtlasMan();
  manager.AddAtlas(BGRA, 64, 64);
  manager.AddAtlas(BGRA, 32, 32);
  assert.equal(manager.atlases.length, 2);
  assert.equal(manager.FindAtlas(BGRA), manager.atlases[0]);
  manager.RemoveAtlas(BGRA);
  assert.equal(manager.atlases.length, 1);
  assert.equal(manager.FindAtlas(BGRA).width, 32);
});

test('a collected texture is reclaimed and a collected outsider loses its AL texture', { skip: typeof globalThis.gc !== 'function' && 'needs node --expose-gc' }, async t =>
{
  stubDevice(t);
  const atlas = new Tr2TextureAtlas();
  atlas.Initialize(BGRA, 64, 64);
  let outsiderTexture = null;
  (() =>
  {
    atlas.CreateTexture(60, 60);
    outsiderTexture = atlas.CreateTexture(8, 8)._texture;
  })();
  assert.equal(outsiderTexture.IsValid(), true);

  await new Promise(resolve => setImmediate(resolve));
  globalThis.gc();
  await new Promise(resolve => setImmediate(resolve));

  // The next allocation sweeps: the 64x64 area returns, and the outsider's texture is destroyed.
  const reused = atlas.CreateTexture(60, 60);
  assert.deepEqual([reused.x, reused.y], [2, 2]);
  assert.equal(outsiderTexture.IsValid(), false);
  assert.equal(atlas.texturesOutsideAtlasCount, 0);
});
