import test from "node:test";
import assert from "node:assert/strict";
import { Tr2Sprite2dLineTrace } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dLineTrace.js";
import { Tr2Sprite2dScene } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dScene.js";
import { Tr2SpriteObjectEffect, Tr2SpriteObjectPickState } from "../../npm/dist/trinity/generated/sprite2d/enums.js";

// Donor: E:\carbonengine\trinity\trinity\Sprite2d\Tr2Sprite2dLineTrace.cpp. Expected values are computed by hand
// from the donor formulas quoted beside each assertion.

/**
 * Records the geometry Tr2Sprite2dLineTrace hands to the scene. PrepareTriangleVerts copies position and colour
 * as Tr2Sprite2dScene::PrepareTriangleVerts does (Tr2Sprite2dScene.cpp:948-955, scene colour left white) and the
 * UVs through an identity texture window (cpp:974-976, window (0, 0, 1, 1)).
 */
class RecordingRenderer
{
  constructor(maxIndexCount = 6000, maxVertexCount = 4000)
  {
    this.maxIndexCount = maxIndexCount;
    this.maxVertexCount = maxVertexCount;
    this.draws = [];
    this.translations = [];
  }

  SetSpriteEffect() {}
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
    return true;
  }

  RenderTriangleVerts(vertices, vertexCount, indices, indexCount)
  {
    this.draws.push({
      positions: vertices.slice(0, vertexCount).map(v => [...v.position]),
      uv0: vertices.slice(0, vertexCount).map(v => [...v.texCoord[0]]),
      indices: [...indices].slice(0, indexCount)
    });
  }
}

function near(actual, expected, tolerance = 1e-5)
{
  assert.equal(actual.length, expected.length, `${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  for (let i = 0; i < expected.length; i++)
  {
    if (Array.isArray(expected[i])) near(actual[i], expected[i], tolerance);
    else assert.ok(Math.abs(actual[i] - expected[i]) <= tolerance, `${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

function makeTrace(points)
{
  const trace = new Tr2Sprite2dLineTrace();
  trace.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FILL;
  trace.lineWidth = 2;
  trace.depth = 0.5;
  trace.AppendVertices(points, null, [1, 1, 1, 1]);
  return trace;
}

test("straight line trace is one quad with Carbon's corner order and indices", () =>
{
  // (0,0) -> (10,0), lineWidth 2: CalcLength = 10, relativeLength = 1, not > end, no next vertex: capAngleTo = 0.
  // AddSegment (cpp:297-341): d = (1,0), halfWidth = 1, normal = (d.y, -d.x) = (0,-1), no shortening.
  //   v0 = from - n = (0,1)   v1 = from + n = (0,-1)   v2 = to + n = (10,-1)   v3 = to - n = (10,1), z = m_depth.
  //   texOffset1 = 0 / 1 - 0 = 0, texOffset2 = 10: uv0 = (0,0) (0,1) (10,1) (10,0) (cpp:442-472).
  //   indices 0 1 3 3 1 2 (cpp:488-493).
  const trace = makeTrace([[0, 0], [10, 0]]), renderer = new RecordingRenderer();
  trace.displayX = 4; trace.displayY = 5;
  trace.GatherSprites(renderer);

  assert.equal(trace.isDirty, false);
  assert.equal(renderer.tileMode, 8 | 16, "S2D_TS_TILE_X | S2D_TS_TILE_Y (cpp:67)");
  assert.deepEqual(renderer.translations, [[4, 5], "pop"]);
  assert.equal(renderer.draws.length, 1);
  near(renderer.draws[0].positions, [[0, 1, 0.5], [0, -1, 0.5], [10, -1, 0.5], [10, 1, 0.5]]);
  near(renderer.draws[0].uv0, [[0, 0], [0, 1], [10, 1], [10, 0]]);
  assert.deepEqual(renderer.draws[0].indices, [0, 1, 3, 3, 1, 2]);
});

test("right-angle line trace adds Carbon's miter joint", () =>
{
  // (0,0) -> (10,0) -> (10,10), lineWidth 2, miter corners. CalcLength = 20.
  // Segment 1: relativeLength 0.5; capAngleTo = atan2(1,0) - atan2(0,1) = pi/2 (cpp:156-159).
  //   halfWidth 1; adjustedTo = to - tan(pi/4) * d = (9,0) (cpp:328-329); normal (0,-1).
  //   v0 (0,1) v1 (0,-1) v2 (9,-1) v3 (9,1); uv0 x: 0 0 10 10; indices 0 1 3 3 1 2.
  // Miter (cpp:637-740): capAngleTo > 0: fanBase = 3 + 4 - 4 = 3, basePoint = v3 (9,1), topPoint = v2 (9,-1).
  //   startAngle = atan2(-1,0) = -pi/2, endAngle = 0. GetMiterPoint (cpp:742-753): k = 2;
  //   p1 = (9,1) + (0,-2) = (9,-1), line 1 runs through p1 and p1 - (2,0): y = -1;
  //   p2 = (9,1) + (2,0) = (11,1), line 2 runs through p2 and p2 - (0,2): x = 11. Intersection (11,-1).
  //   Not AA: arcLength = |(11,-1) - (9,-1)| = 2, accum = 10 + 2 = 12, uv0 = (12, 1).
  //   sign 1: indices (-2+4) 3 4, (2+4) 3 4 = 2 3 4 6 3 4.
  // Segment 2: from (10,0) to (10,10), capAngleFrom pi/2, capAngleTo 0. d = (0,1), normal (1,0),
  //   adjustedFrom = from + tan(pi/4) * d = (10,1). texOffset1 = 12, texOffset2 = 22.
  //   v0 (9,1) v1 (11,1) v2 (11,10) v3 (9,10); oldSize 5: indices 5 6 8 8 6 7.
  const trace = makeTrace([[0, 0], [10, 0], [10, 10]]), renderer = new RecordingRenderer();
  trace.GatherSprites(renderer);

  assert.equal(renderer.draws.length, 1);
  const draw = renderer.draws[0];
  near(draw.positions, [
    [0, 1, 0.5], [0, -1, 0.5], [9, -1, 0.5], [9, 1, 0.5],
    [11, -1, 0.5],
    [9, 1, 0.5], [11, 1, 0.5], [11, 10, 0.5], [9, 10, 0.5]
  ]);
  near(draw.uv0.map(uv => uv[0]), [0, 0, 10, 10, 12, 12, 12, 22, 22]);
  assert.deepEqual(draw.indices, [0, 1, 3, 3, 1, 2, 2, 3, 4, 6, 3, 4, 5, 6, 8, 8, 6, 7]);
});

test("line trace start and end trim the walked segments", () =>
{
  // (0,0) -> (10,0), start 0.25, end 0.75. relativeLength 1 > start: portion = (0.25 - 0) / 1 = 0.25,
  // adjustedFromPos = to * 0.25 + from * 0.75 = (2.5,0) (cpp:113-121). 1 > end: portion = (0.75 - 0) / 1,
  // adjustedToPos = (7.5,0) (cpp:130-138). Quad: (2.5,1) (2.5,-1) (7.5,-1) (7.5,1).
  const trace = makeTrace([[0, 0], [10, 0]]), renderer = new RecordingRenderer();
  trace.start = 0.25; trace.end = 0.75;
  trace.GatherSprites(renderer);
  near(renderer.draws[0].positions, [[2.5, 1, 0.5], [2.5, -1, 0.5], [7.5, -1, 0.5], [7.5, 1, 0.5]]);
});

test("line trace picking hits and misses the prepared triangles, ignoring its translation (Carbon quirk)", () =>
{
  // Quad (0,1) (0,-1) (10,-1) (10,1) from the straight-line test. Tr2Sprite2dScene::IsInsideTriangle accepts a
  // point when Sign(p, a, b) >= 0 for every edge (Tr2Sprite2dScene.cpp:1517-1520, 1577-1588). For (5, 0.5) and
  // triangle v0 v1 v3: Sign = 5*2 - 0 = 10, (5-10)(-1-1) - (0-10)(0.5-1) = 5, (5-0)(1-1) - (10-0)(0.5-1) = 5.
  const trace = makeTrace([[0, 0], [10, 0]]), scene = new Tr2Sprite2dScene();

  // No prepared vertices yet: m_renderVertices.size() < 2 (cpp:214-217).
  assert.equal(trace.PickPoint(5, 0.5, scene), null);

  trace.displayX = 100;
  trace.GatherSprites(new RecordingRenderer());
  assert.equal(trace.PickPoint(5, 0.5, scene), trace, "hit at the untranslated position: no PushTranslation (cpp:219-240)");
  assert.equal(trace.PickPoint(105, 0.5, scene), null, "miss at the translated position");
  assert.equal(trace.PickPoint(5, 3, scene), null, "miss outside the stroke");
  assert.equal(trace.PickPoint(12, 0, scene), null, "miss past the end");

  trace.pickState = Tr2SpriteObjectPickState.TR2_SPS_OFF;
  assert.equal(trace.PickPoint(5, 0.5, scene), null);
  trace.pickState = Tr2SpriteObjectPickState.TR2_SPS_ON;
  trace.display = false;
  assert.equal(trace.PickPoint(5, 0.5, scene), null);
});

test("line trace AppendVertices and SetVertices reproduce Carbon's names handling", () =>
{
  // AppendVertices stops after one vertex when positions and colours are constant, whatever names holds
  // (LineTrace_Blue.cpp:159-162).
  const trace = new Tr2Sprite2dLineTrace();
  trace.AppendVertices([1, 2], null, [1, 1, 1, 1], ["a", "b", "c"]);
  assert.equal(trace.vertices.length, 1);
  assert.equal(trace.vertices[0].name, "a");

  trace.AppendVertices([[3, 4], [5, 6]], null, [1, 1, 1, 1], ["b", "c"]);
  assert.deepEqual(trace.vertices.map(v => v.name), ["a", "b", "c"]);

  // SetVertices with a constant string never assigns `name`, so names become "" (LineTrace_Blue.cpp:232-305).
  trace.SetVertices(null, null, null, "renamed");
  assert.deepEqual(trace.vertices.map(v => v.name), ["", "", ""]);

  trace.SetVertices(null, null, null, ["x", "y"]);
  assert.deepEqual(trace.vertices.map(v => v.name), ["x", "y", ""]);
});
