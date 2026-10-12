import test from "node:test";
import assert from "node:assert/strict";
import { Tr2Sprite2dPolygon } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dPolygon.js";
import { Tr2Sprite2dLineTrace } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dLineTrace.js";
import { Tr2SpriteObjectEffect } from "../../npm/dist/trinity/generated/sprite2d/enums.js";

// Donor: E:\carbonengine\trinity\trinity\Sprite2d\Tr2Sprite2dPolygon.cpp, Tr2Sprite2dPolygon_Blue.cpp,
// Tr2Sprite2dLineTrace_Blue.cpp. Expected values are computed by hand from the donor formulas below.

/**
 * Records what Tr2Sprite2dPolygon/LineTrace hand to the scene. PrepareTriangleVerts copies position and colour as
 * Tr2Sprite2dScene::PrepareTriangleVerts does (Tr2Sprite2dScene.cpp:948-955, scene colour left white) and copies
 * the UVs through an identity texture window (cpp:974-976 with window (0, 0, 1, 1)).
 */
class RecordingRenderer
{
  constructor(maxIndexCount = 6000, maxVertexCount = 4000)
  {
    this.maxIndexCount = maxIndexCount;
    this.maxVertexCount = maxVertexCount;
    this.draws = [];
    this.translations = [];
    this.prepared = 0;
  }

  SetSpriteEffect(value) { this.spriteEffect = value; }
  SetTileMode(value) { this.tileMode = value; }
  SetBlendmode() {}
  SetSpriteTarget() {}
  SetGlowBrightness() {}
  SetColor() {}
  SetDepth() {}
  GetMaxIndexCountPerDrawCall() { return this.maxIndexCount; }
  GetMaxVertexCountPerDrawCall() { return this.maxVertexCount; }
  PushTranslation(t) { this.translations.push([t[0], t[1]]); }
  PopTranslation() { this.translations.push("pop"); }

  PrepareTriangleVerts(destVerts, verts, stride, vertexCount)
  {
    assert.equal(stride, 44, "sizeof( Tr2Sprite2dVertexBase )");
    for (let i = 0; i < vertexCount; i++)
    {
      destVerts[i].position.set(verts[i].position);
      destVerts[i].color.set(verts[i].color);
      destVerts[i].texCoord[0].set(verts[i].texCoord[0]);
      destVerts[i].texCoord[1].set(verts[i].texCoord[1]);
    }
    this.prepared += vertexCount;
    return true;
  }

  RenderTriangleVerts(vertices, vertexCount, indices, indexCount)
  {
    this.draws.push({
      positions: vertices.slice(0, vertexCount).map(v => [...v.position]),
      indices: [...indices].slice(0, indexCount),
      vertexCount,
      indexCount
    });
  }
}

function near(actual, expected, tolerance = 1e-5)
{
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) <= tolerance, `${[...actual]} != ${expected}`);
}

function fillPolygon()
{
  const polygon = new Tr2Sprite2dPolygon();
  polygon.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FILL;
  return polygon;
}

test("polygon GatherSprites submits one batch with the authored indices under the translation", () =>
{
  // Square (0,0) (10,0) (10,10) (0,10), triangles (0,1,2) (0,2,3).
  // cpp:52-66: one batch; indices are the triangle indices in order, render vertices are all authored vertices.
  const polygon = fillPolygon(), renderer = new RecordingRenderer();
  polygon.displayX = 7; polygon.displayY = -3;
  polygon.AppendVertices([[0, 0], [10, 0], [10, 10], [0, 10]], null, [1, 1, 1, 1]);
  polygon.AppendTriangles([[0, 1, 2], [0, 2, 3]]);
  polygon.GatherSprites(renderer);

  assert.equal(polygon.isDirty, false);
  assert.equal(renderer.tileMode, 0);
  assert.deepEqual(renderer.translations, [[7, -3], "pop"]);
  assert.equal(renderer.draws.length, 1);
  assert.deepEqual(renderer.draws[0].indices, [0, 1, 2, 0, 2, 3]);
  assert.deepEqual(renderer.draws[0].positions, [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]]);

  // Not dirty: the cached batch is submitted again without re-preparing (cpp:102-112).
  const prepared = renderer.prepared;
  polygon.GatherSprites(renderer);
  assert.equal(renderer.prepared, prepared);
  assert.equal(renderer.draws.length, 2);
});

test("polygon GatherSprites splits triangles into remapped batches when a draw call is full", () =>
{
  // Pentagon fan: vertices 0..4, triangles (0,1,2) (0,2,3) (0,3,4).
  // maxTriangles = min( 6 / 3, 6 / 3 ) = 2 (cpp:48); batches = (3 + 2 - 1) / 2 = 2 (cpp:49).
  // Batch 0, cpp:82-94: (0,1,2) maps 0->0 1->1 2->2; (0,2,3) reuses 0 and 2, maps 3->3: indices 0 1 2 0 2 3,
  //   local vertices v0 v1 v2 v3.
  // Batch 1: indexMap reset; (0,3,4) maps 0->0 3->1 4->2: indices 0 1 2, local vertices v0 v3 v4.
  const positions = [[0, 0], [10, 0], [12, 8], [5, 14], [-2, 8]];
  const polygon = fillPolygon(), renderer = new RecordingRenderer(6, 6);
  polygon.AppendVertices(positions, null, [1, 1, 1, 1]);
  polygon.AppendTriangles([[0, 1, 2], [0, 2, 3], [0, 3, 4]]);
  polygon.GatherSprites(renderer);

  assert.equal(renderer.draws.length, 2);
  assert.deepEqual(renderer.draws[0].indices, [0, 1, 2, 0, 2, 3]);
  assert.deepEqual(renderer.draws[0].positions, [0, 1, 2, 3].map(i => [...positions[i], 0]));
  assert.deepEqual(renderer.draws[1].indices, [0, 1, 2]);
  assert.deepEqual(renderer.draws[1].positions, [0, 3, 4].map(i => [...positions[i], 0]));
});

test("polygon SetColor stores the colour without dirtying (Carbon quirk CE-127)", () =>
{
  // Tr2Sprite2dPolygon.cpp:153-156: m_color = val, no SetDirty.
  const polygon = fillPolygon();
  polygon.isDirty = false;
  polygon.SetColor([0.25, 0.5, 0.75, 1]);
  assert.equal(polygon.isDirty, false);
  near(polygon.GetColor(), [0.25, 0.5, 0.75, 1]);
});

// A rotated (30 degrees), non-uniformly scaled (2, 0.5) positionTransform with a translation and a non-trivial
// third column. Rows as Python passes them: a0, a1, a2.
const angle = Math.PI / 6, c = Math.cos(angle), s = Math.sin(angle);
const rows = [[2 * c, 2 * s, 0.25], [-0.5 * s, 0.5 * c, -0.5], [10, -4, 3]];

// Carbon writes a0 -> _11.._13, a1 -> _21.._23, a2 -> _41.._43 of an identity Matrix (Polygon_Blue.cpp:74-77).
// XMVector2TransformCoord(v, M) = (x*row0 + y*row1 + row3) / w, w = x*_14 + y*_24 + _44 = 0 + 0 + 1 = 1. So for
// (x, y) = (3, -2):
//   x' = 3*2c + (-2)(-0.5s) + 10 = 6c + s + 10      = 15.6961524...
//   y' = 3*2s + (-2)(0.5c) - 4  = 6s - c - 4        = -1.8660254...
//   z' = 3*0.25 + (-2)(-0.5) + 3 = 0.75 + 1 + 3     = 4.75
const expectedX = 6 * c + s + 10, expectedY = 6 * s - c - 4, expectedZ = 4.75;

test("polygon positionTransform routes the third column to z, never to w", () =>
{
  const polygon = fillPolygon();
  polygon.AppendVertices([3, -2], rows, [1, 1, 1, 1]);
  near(polygon.vertices[0].position, [expectedX, expectedY, expectedZ]);

  // None keeps the identity Matrix: _43 = 0, so z = 0.
  polygon.AppendVertices([3, -2], null, [1, 1, 1, 1]);
  near(polygon.vertices[1].position, [3, -2, 0]);

  // An identity 3x3 tuple writes _43 = 1, so z = 1.
  polygon.AppendVertices([3, -2], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [1, 1, 1, 1]);
  near(polygon.vertices[2].position, [3, -2, 1]);

  // SetVertices uses the same transform (Polygon_Blue.cpp:334).
  polygon.SetVertices([3, -2], rows);
  for (const vertex of polygon.vertices) near(vertex.position, [expectedX, expectedY, expectedZ]);
});

test("polygon z reaches the prepared vertex", () =>
{
  // Tr2Sprite2dScene::PrepareTriangleVerts copies position.z (Tr2Sprite2dScene.cpp:948-950).
  const polygon = fillPolygon(), renderer = new RecordingRenderer();
  polygon.AppendVertices([[3, -2], [0, 0], [1, 0]], rows, [1, 1, 1, 1]);
  polygon.AppendTriangles([[0, 1, 2]]);
  polygon.GatherSprites(renderer);
  near(renderer.draws[0].positions[0], [expectedX, expectedY, expectedZ]);
  near(renderer.draws[0].positions[1], [10, -4, 3]);
});

test("line trace positionTransform is affine in x and y and drops z", () =>
{
  // LineTrace_Blue.cpp:153: m_position is a Vector2, so only x' and y' survive.
  const trace = new Tr2Sprite2dLineTrace();
  trace.AppendVertices([3, -2], rows, [1, 1, 1, 1]);
  near(trace.vertices[0].position, [expectedX, expectedY]);
  trace.SetVertices([3, -2], rows);
  near(trace.vertices[0].position, [expectedX, expectedY]);
});

test("polygon AppendVertices follows Carbon's argument and stop rules", () =>
{
  const polygon = fillPolygon();

  // "OOO|OO": positionTransform and colors are required (Polygon_Blue.cpp:59).
  assert.throws(() => polygon.AppendVertices([[0, 0]]), TypeError);

  // Constant inputs append one vertex (cpp:202-205); the shortest sequence ends the loop (cpp:130-135).
  polygon.AppendVertices([1, 2], null, [[1, 0, 0, 1], [0, 1, 0, 1]], [[0, 0], [1, 1], [2, 2]]);
  assert.equal(polygon.vertices.length, 2);

  // Vertices before a bad item stay appended, then TypeError (cpp:136-142).
  assert.throws(() => polygon.AppendVertices([[5, 5], [6]], null, [1, 1, 1, 1]), TypeError);
  assert.equal(polygon.vertices.length, 3);

  // Carbon quirk (cpp:96-104): AppendVertices does not map None texture coordinates to "absent".
  assert.throws(() => polygon.AppendVertices([1, 2], null, [1, 1, 1, 1], null), TypeError);

  // AppendTriangles keeps triangles before a bad item (Polygon_Blue.cpp:417-442) and truncates to uint16.
  assert.throws(() => polygon.AppendTriangles([[0, 1, 65538], [0, 1]]), TypeError);
  assert.equal(polygon.triangles.length, 1);
  assert.equal(polygon.triangles[0].index2, 2);
});
