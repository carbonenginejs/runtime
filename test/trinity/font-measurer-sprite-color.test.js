import test from 'node:test';
import assert from 'node:assert/strict';
import { Tr2FontMeasurer } from '../../npm/dist/trinity/index.js';

// Carbon: Tr2FontMeasurer::PrepareSprites builds `Color finalColor( rd->color )` and
// multiplies it channel-wise by the pass colour (Tr2FontMeasurer.cpp:805-809).
// Color(uint32) is ARGB: r = dw >> 16, g = dw >> 8, b = dw >> 0, a = dw >> 24
// (math/include/Color_inline.h:15-21). Expected values below are derived from that
// decode, not from our output.

const atlas = {
  GetTexture() { return 'texture'; },
  GetTextureWindow(window) { window[0] = 0; window[1] = 0; window[2] = 1; window[3] = 1; },
  GetTextureWidth() { return 64; },
  GetTextureHeight() { return 64; }
};

function measurerWith(color)
{
  const measurer = new Tr2FontMeasurer();
  measurer._committedRenderData = [{
    color,
    underline: false,
    bitmaps: [{ x: 4, y: 10, atlasTexture: atlas, sbit: { width: 2, height: 3, left: 0, top: 3, xadvance: 2 } }]
  }];
  return measurer;
}

test('sprite text decodes the packed colour as Carbon ARGB, then multiplies by the pass colour', () =>
{
  const measurer = measurerWith(0x80ff4020);
  measurer.PrepareSprites(null, [0, 0], [0.5, 1, 1, 1], 0, 0, 0, 0, false, [0, 0], [0, 0, 0, 0], 0);

  const expected = [0xff / 255 * 0.5, 0x40 / 255, 0x20 / 255, 0x80 / 255];
  assert.equal(measurer._vertices.length, 4);
  for (const vertex of measurer._vertices)
  {
    for (let i = 0; i < 4; i++) assert.ok(Math.abs(vertex.color[i] - expected[i]) < 1e-6, `channel ${i}: ${vertex.color[i]} != ${expected[i]}`);
  }
});

test('the shadow pass applies the same ARGB decode to its own colour', () =>
{
  const measurer = measurerWith(0xff0000ff);
  measurer.PrepareSprites(null, [0, 0], [1, 1, 1, 1], 0, 0, 0, 0, true, [1, 1], [0.25, 0.25, 0.25, 0.5], 0);

  // Shadow quad first, then the base quad: pure blue, full alpha.
  assert.equal(measurer._vertices.length, 8);
  const shadow = measurer._vertices[0].color, base = measurer._vertices[4].color;
  assert.deepEqual([...shadow].map(value => Math.round(value * 1e6) / 1e6), [0, 0, 0.25, 0.5]);
  assert.deepEqual([...base].map(value => Math.round(value * 1e6) / 1e6), [0, 0, 1, 1]);
});
