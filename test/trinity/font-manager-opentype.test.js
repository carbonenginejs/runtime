import test from 'node:test';
import assert from 'node:assert/strict';
import { Tr2FontManager, Tr2FontMeasurer, TR2_FONT_FALLBACK } from '../../npm/dist/trinity/index.js';
import * as fontModule from '../../npm/dist/trinity/font/Tr2FontManager.js';
import { CjsOpenTypeFormat } from '../../npm/dist/resource/formats/opentype/index.js';
import { clientResources } from '../support/clientResources.js';

// Font manager answers for a face parsed from the client's own font file.
// Expected values are FreeType 2.13.2's for evesansneue-regular.otf
// (FT_Set_Pixel_Sizes, FT_LOAD_DEFAULT, FT_RENDER_MODE_NORMAL, FT_Get_Kerning).
// The canvas is a recording fixture: it proves which outline is filled where,
// not the browser's anti-aliasing.

const FAMILY = 'res:/ui/fonts/evesansneue-regular.otf';

function browser(t)
{
  const saved = {
    OffscreenCanvas: Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas'),
    Path2D: Object.getOwnPropertyDescriptor(globalThis, 'Path2D')
  };
  const fills = [];
  class Path2D
  {
    commands = [];
    moveTo(...args) { this.commands.push([ 'M', ...args ]); }
    lineTo(...args) { this.commands.push([ 'L', ...args ]); }
    bezierCurveTo(...args) { this.commands.push([ 'C', ...args ]); }
  }
  class Canvas
  {
    constructor(width, height) { this.width = width; this.height = height; }
    getContext()
    {
      const canvas = this;
      return this.context ??= {
        measureText(text) { return { width: text.length * 8, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 7, actualBoundingBoxAscent: 9, actualBoundingBoxDescent: 2 }; },
        setTransform() {},
        fillText() {},
        fill(path, rule) { fills.push({ path, rule, width: canvas.width, height: canvas.height }); },
        getImageData(_x, _y, width, height)
        {
          const data = new Uint8ClampedArray(width * height * 4);
          for (let i = 3; i < data.length; i += 4) data[i] = 200;
          return { data };
        }
      };
    }
  }
  Object.defineProperty(globalThis, 'OffscreenCanvas', { configurable: true, writable: true, value: Canvas });
  Object.defineProperty(globalThis, 'Path2D', { configurable: true, writable: true, value: Path2D });
  t.after(() =>
  {
    for (const [ name, descriptor ] of Object.entries(saved))
    {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return fills;
}

/** A manager with the client font parsed for FAMILY, as LoadFont leaves it. */
async function Manager(t, manager = new Tr2FontManager())
{
  const resources = await clientResources();
  if (resources.skip)
  {
    t.skip(resources.skip);
    return null;
  }
  manager._loadedFamilies.add(FAMILY);
  manager._fonts.set(FAMILY, CjsOpenTypeFormat.read(await resources.Read(FAMILY), { source: FAMILY }));
  return manager;
}

test('a parsed face answers glyph indices from its cmap: 0 for a character it lacks', async t =>
{
  browser(t);
  const manager = await Manager(t);
  if (!manager) return;
  const id = manager.GetFaceID(FAMILY);
  assert.equal(manager.LookupGlyphIndex(id, 'H'.codePointAt(0)), 37);
  assert.equal(manager.LookupGlyphIndex(id, 0x4e2d), 0);
  assert.equal(manager.LookupGlyphIndex(manager.GetFaceID('never-loaded'), 72), -1);
});

test('a CFF glyph is hinted, filled as an outline, and placed in FreeType\'s bitmap box', async t =>
{
  const fills = browser(t);
  const manager = await Manager(t);
  if (!manager) return;
  const id = manager.GetFaceID(FAMILY);

  // "H" at 10 px: FreeType bitmap_left 0, bitmap_top 7, 5 x 7, advance 5.
  const sbit = manager.LookupSBit(id, 0, 10, 37);
  assert.deepEqual([ sbit.GetXOffset(), sbit.GetYOffset(), sbit.GetWidth(), sbit.GetHeight(), sbit.GetXAdvance() ], [ 0, 7, 5, 7, 5 ]);
  assert.equal(sbit.sbit.buffer.length, 35);
  assert.ok(sbit.sbit.buffer.every(value => value === 200));

  // The filled outline is FreeType's, in canvas space (y down from the top).
  assert.equal(fills.length, 1);
  assert.equal(fills[0].rule, 'nonzero');
  assert.deepEqual([ fills[0].width, fills[0].height ], [ 5, 7 ]);
  assert.deepEqual(fills[0].path.commands[0], [ 'M', 294 / 64, 0 ]);
  assert.deepEqual(fills[0].path.commands[8], [ 'L', 99 / 64, 7 - 212 / 64 ]);

  // A space has no outline: no fill, FreeType's advance.
  const space = manager.LookupSBit(id, 0, 10, manager.LookupGlyphIndex(id, 32));
  assert.equal(space.GetWidth(), 0);
  assert.equal(fills.length, 1);

  // Glyph IDs outside the face fail as FreeType's sbit cache does.
  assert.throws(() => manager.LookupSBit(id, 0, 10, 573), { message: 'FTC_SBitCache_Lookup failed' });
});

test('a glyph too large for the sbit cache comes back unavailable', async t =>
{
  browser(t);
  const manager = await Manager(t);
  if (!manager) return;
  const id = manager.GetFaceID(FAMILY);
  const sbit = manager.LookupSBit(id, 0, 300, 37);
  assert.deepEqual([ sbit.GetWidth(), sbit.GetHeight(), sbit.GetXAdvance() ], [ 255, 0, 0 ]);
});

test('size metrics and kerning are FreeType\'s, at the face\'s current size', async t =>
{
  browser(t);
  const manager = await Manager(t);
  if (!manager) return;
  const id = manager.GetFaceID(FAMILY);
  const s = manager.LookupGlyphIndex(id, 's'.codePointAt(0)), tee = manager.LookupGlyphIndex(id, 't'.codePointAt(0));

  // FreeType's unsized face scales kerning to 0.
  assert.equal(manager.LookupKerningXP(id, s, tee), 0);

  assert.deepEqual(manager.LookupMetrics(id, 0, 10), { ascender: 640, descender: -192, height: 768 });
  assert.deepEqual(manager.LookupMetricsFromScript(id, 0, 24), [ 23, -7 ]);
  assert.equal(manager.LookupKerningXP(id, s, tee), -1);
  manager.LookupSBit(id, 0, 20, s);
  assert.equal(manager.LookupKerningXP(id, s, tee), 0);
  manager.LookupMetrics(id, 0, 30);
  assert.equal(manager.LookupKerningXP(id, tee, s), -1);
});

test('the measurer falls back per character when a parsed face lacks one', async t =>
{
  browser(t);
  Tr2FontManager.initialize();
  t.after(() => Tr2FontManager.shutdown());
  const manager = await Manager(t, fontModule.g_fontManager);
  if (!manager) return;
  manager._loadedFamilies.add(TR2_FONT_FALLBACK);

  const measurer = new Tr2FontMeasurer();
  measurer.font = FAMILY;
  measurer.fontSize = 10;
  assert.equal(measurer.AddText('H中'), 2);
  const [ latin, ideograph ] = measurer._renderData[0].bitmaps;
  assert.equal(latin.faceId, manager.GetFaceID(FAMILY));
  assert.equal(ideograph.faceId, manager.GetFaceID(TR2_FONT_FALLBACK));
});
