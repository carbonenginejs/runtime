// EveBannerSet geometry, as Carbon builds it (EveBannerSet.cpp:493-693).
import test from "node:test";
import assert from "node:assert/strict";
import { EveBannerItem, EveBannerSet } from "../../npm/dist/trinity/index.js";

function banner(values)
{
  return Object.assign(new EveBannerItem(), values);
}

test("a flat banner is one quad over the unit square, scaled and placed (cpp:515-533)", () =>
{
  const set = new EveBannerSet();
  const vertices = [];
  const indices = [];
  const item = banner({ bone: -1 });
  item.scaling.set([ 2, 1, 1 ]);
  item.position.set([ 0, 0, 5 ]);

  set.CreateBannerGeometry(vertices, indices, item);

  assert.equal(vertices.length, 4);
  assert.deepEqual(indices, [ 0, 1, 2, 2, 1, 3 ]);
  assert.deepEqual(Array.from(vertices[0].position), [ -1, -0.5, 5 ]);
  assert.deepEqual(Array.from(vertices[3].position), [ 1, 0.5, 5 ]);
  assert.deepEqual(vertices[0].texCoord, [ 0, 1 ]);
  assert.deepEqual(Array.from(vertices[0].normal), [ 0, 0, 1 ]);
  assert.equal(vertices[0].bone, -1, "packed later as the int8 byte 0xff (cpp:80-81)");
});

test("curved banners take one segment per 5 degrees plus one (cpp:535-693)", () =>
{
  const set = new EveBannerSet();

  const horizontal = { vertices: [], indices: [] };
  set.CreateBannerGeometry(horizontal.vertices, horizontal.indices, banner({ angleX: 90 }));
  assert.equal(horizontal.vertices.length, 2 * 20, "19 segments across, two rows");
  assert.equal(horizontal.indices.length, 19 * 6);

  const vertical = { vertices: [], indices: [] };
  set.CreateBannerGeometry(vertical.vertices, vertical.indices, banner({ angleY: 45 }));
  assert.equal(vertical.vertices.length, 2 * 11, "10 segments down, two columns");
  assert.equal(vertical.indices.length, 10 * 6);

  const both = { vertices: [], indices: [] };
  set.CreateBannerGeometry(both.vertices, both.indices, banner({ angleX: 10, angleY: 10 }));
  assert.equal(both.vertices.length, 4 * 4);
  assert.equal(both.indices.length, 3 * 3 * 6);

  // The arc's ends sit at the banner's half width and bow back from the crest
  // at z 0: ( cos( angle ) - 1 ) * scale is never positive.
  const row = horizontal.vertices.slice(0, 20).map(vertex => vertex.position);
  assert.ok(Math.abs(row[0][0] + 0.5) < 1e-6 && Math.abs(row[19][0] - 0.5) < 1e-6);
  assert.ok(row[0][2] < 0 && row[19][2] < 0);
  assert.ok(Math.max(...row.map(position => position[2])) > -1e-2);
});
