import test from 'node:test';
import assert from 'node:assert/strict';
import { Tr2FontManager, Tr2FontMeasurer, Tr2SBitWrapper, TR2_FONT_FALLBACK } from '../../npm/dist/trinity/index.js';
import * as fontModule from '../../npm/dist/trinity/font/Tr2FontManager.js';
import { gTriDev } from '../../npm/dist/trinity/core/device/gTriDev.js';
import { blue } from '../../npm/dist/global/blue/index.js';
import { CjsSchema } from '../../npm/dist/global/schema/index.js';

// Deterministic Canvas2D contract fixture, not evidence of browser pixel parity.
// "AV" measures 13 against 8 + 8, so the browser pair kerning is -3 px.
function browser(t)
{
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas');
  const fonts = [];
  class Canvas
  {
    constructor(width, height) { this.width = width; this.height = height; }
    getContext()
    {
      return this.context ??= {
        set font(value) { fonts.push(value); },
        measureText(text) {
          return { width: text === 'AV' ? 13 : text.length * 8, actualBoundingBoxLeft: 1, actualBoundingBoxRight: 7, actualBoundingBoxAscent: 9, actualBoundingBoxDescent: 2, fontBoundingBoxAscent: 10, fontBoundingBoxDescent: 3 };
        },
        setTransform() {},
        fillText() {},
        getImageData(_x, _y, width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; }
      };
    }
  }
  Object.defineProperty(globalThis, 'OffscreenCanvas', { configurable: true, writable: true, value: Canvas });
  t.after(() => { if (saved) Object.defineProperty(globalThis, 'OffscreenCanvas', saved); else delete globalThis.OffscreenCanvas; });
  return fonts;
}

function singleton(t)
{
  Tr2FontManager.initialize();
  t.after(() => Tr2FontManager.shutdown());
  return fontModule.g_fontManager;
}

test('TR2_FONT_FALLBACK is Carbon\'s value and face ID 0 is reserved', t =>
{
  browser(t);

  // Tr2FontManager_Blue.cpp:9.
  assert.equal(TR2_FONT_FALLBACK, 'res:/ui/fonts/arialuni.ttf');

  // cpp:129-130 pushes "dummy" first, so the first real face is 1 (cpp:163).
  const manager = new Tr2FontManager();
  assert.equal(manager.GetFaceID('evefont'), 1);
  assert.equal(manager.GetFaceID('evefont'), 1);

  // "dummy" is not in the forward map (cpp:129-130), so naming it gets a new ID.
  assert.equal(manager.GetFaceID('dummy'), 2);

  // Face 0 never loads: FT_Select_Charmap fails -> -1 (cpp:275-280), metrics error ->
  // FT_Size_Metrics() zeros (cpp:215-219), kerning error -> INT_MAX (cpp:253-256).
  assert.equal(manager.LookupGlyphIndex(0, 65), -1);
  assert.deepEqual(manager.LookupMetrics(0, 0, 12), { ascender: 0, descender: 0, height: 0 });
  assert.equal(manager.LookupKerningXP(0, 65, 86), 0x7fffffff);
  assert.throws(() => manager.LookupSBit(0, 0, 12, 65), /FTC_SBitCache_Lookup failed/);
});

test('LookupFaceIDAndGlyphIndex follows Carbon\'s fallback chain', t =>
{
  browser(t);
  const manager = singleton(t);
  const own = manager.GetFaceID('evefont');
  const fallback = manager.GetFaceID(TR2_FONT_FALLBACK);

  // cpp:710-713: an empty name uses TR2_FONT_FALLBACK.
  assert.deepEqual(manager.LookupFaceIDAndGlyphIndex('', 65), [ fallback, 65 ]);

  // cpp:720-722: a found glyph stays in the named face.
  assert.deepEqual(manager.LookupFaceIDAndGlyphIndex('evefont', 65), [ own, 65 ]);

  // cpp:724-728: glyph index <= 0 (code point 0 here) retries in the fallback face.
  assert.deepEqual(manager.LookupFaceIDAndGlyphIndex('evefont', 0), [ fallback, 0 ]);

  // LookupGlyphIndex itself takes a face ID only (cpp:271), with no name routing.
  assert.equal(manager.LookupGlyphIndex(own, 65), 65);
});

test('Blue LookupKerningXP shifts the pixel kerning by 6 again (CE-128)', t =>
{
  browser(t);
  const manager = singleton(t);
  const face = manager.GetFaceID('evefont');

  // Engine path: pixels, -3 from the fixture's pair advance.
  assert.equal(manager.LookupKerningXP(face, 65, 86), -3);

  // cpp:700-705: int(-3) >> 6 = -1; INT_MAX >> 6 = 33554431 for an unusable face.
  assert.equal(manager._PyLookupKerningXP(face, 65, 86), -1);
  assert.equal(manager._PyLookupKerningXP(0, 65, 86), 0x7fffffff >> 6);
});

test('AddText with no font uses TR2_FONT_FALLBACK, rendered through the CSS family list', t =>
{
  const fonts = browser(t);
  const manager = singleton(t);
  const measurer = new Tr2FontMeasurer();

  // Tr2FontMeasurer.cpp:174-181: empty m_font selects TR2_FONT_FALLBACK.
  assert.equal(measurer.AddText('A'), 1);
  assert.equal(manager._faceMap.has(TR2_FONT_FALLBACK), true);
  assert.equal(manager._faceMap.has('sans-serif'), false);
  assert.equal(fonts.at(-1), `12px "${TR2_FONT_FALLBACK}", sans-serif`);

  // A named family lists the fallback font behind it.
  measurer.font = 'evefont';
  measurer.AddText('A');
  assert.equal(fonts.at(-1), `12px evefont, "${TR2_FONT_FALLBACK}", sans-serif`);
});

test('initialize registers for Blue ticks and OnTick trims by frame age (cpp:65-70, 631-698)', t =>
{
  browser(t);
  const manager = singleton(t);
  assert.ok(blue.os._tickers.some(entry => entry.cb === manager && entry.cookie === 'fontMan'));

  const device = gTriDev.device, savedFrame = device.frameCounter;
  t.after(() => { device.frameCounter = savedFrame; });

  // Each fixture glyph is 8 x 11 = 88 bytes of coverage.
  const face = manager.GetFaceID('evefont');
  device.frameCounter = 100; manager.LookupSBit(face, 0, 12, 65);
  device.frameCounter = 105; manager.LookupSBit(face, 0, 12, 66);
  device.frameCounter = 110;
  manager.glyphCacheBudget = 100;

  // Lookups never trim; only the tick does.
  assert.equal(manager.totalGlyphsCachedSize, 176);

  // cpp:633-636: a budget covering the total returns early.
  manager.TrimGlyphCache(176);
  assert.equal(manager._glyphs.size, 2);

  // cpp:671-692: ages 10 (A) and 5 (B); oldest deleted first, stop once 88 < 100.
  manager.OnTick(0, 0, 'fontMan');
  assert.equal(manager.totalGlyphsCachedSize, 88);
  assert.equal(manager._glyphs.has(`${face}:0:12:65`), false);
  assert.equal(manager._glyphs.has(`${face}:0:12:66`), true);

  // cpp:688: the stop test is strict, so a budget equal to the remainder deletes again.
  manager.LookupSBit(face, 0, 12, 67);
  manager.TrimGlyphCache(88);
  assert.equal(manager.totalGlyphsCachedSize, 0);

  // Shutdown unregisters (cpp:78-81).
  Tr2FontManager.shutdown();
  assert.ok(!blue.os._tickers.some(entry => entry.cb === manager));
  Tr2FontManager.initialize();
});

test('Tr2SBitWrapper exposes Carbon\'s six read-only Blue properties (Tr2Sbit_Blue.cpp:198-228)', () =>
{
  const glyph = new Tr2SBitWrapper();
  glyph.sbit = { width: 6, height: 9, left: -1, top: 7, xadvance: 8, yadvance: 0 };

  // Each property reads the matching Get* (Tr2SBit.h:27-50).
  assert.equal(glyph.xOffset, -1);
  assert.equal(glyph.yOffset, 7);
  assert.equal(glyph.width, 6);
  assert.equal(glyph.height, 9);
  assert.equal(glyph.xadvance, 8);
  assert.equal(glyph.yadvance, 0);

  for (const name of [ 'xOffset', 'yOffset', 'width', 'height', 'xadvance', 'yadvance' ])
  {
    const field = CjsSchema.getField(Tr2SBitWrapper, name);
    assert.ok(field, name);
    assert.equal(field.edit.read, true, name);
    assert.notEqual(field.edit.write, true, name);
  }
});
