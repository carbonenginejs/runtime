// Sprite2D shape geometry: Frame, Stretch, StretchVertical, Line and Arc, gathered through the
// real Tr2Sprite2dScene. Every expected value is computed by hand from the donor formulas
// (trinity/trinity/Sprite2d\*.cpp), cited at each block. Positions are compared
// at 1e-4 because they are stored in Float32Array vertices (one float32 ulp at 128 is 7.6e-6);
// exact values are chosen wherever the donor arithmetic is exact.
import assert from "node:assert/strict";
import test from "node:test";
import {
  Tr2Sprite2dArc, Tr2Sprite2dFrame, Tr2Sprite2dLine, Tr2Sprite2dScene, Tr2Sprite2dStretch,
  Tr2Sprite2dStretchVertical, Tr2Sprite2dTexture
} from "../../npm/dist/trinity/index.js";
import { Tr2SpriteObjectEffect } from "../../npm/dist/trinity/generated/sprite2d/enums.js";

/** Asserts each component within `tolerance`. */
function near(actual, expected, tolerance = 1e-4, label = "")
{
  assert.equal(actual.length, expected.length, label);
  for (let i = 0; i < expected.length; i++)
    assert.ok(Math.abs(actual[i] - expected[i]) <= tolerance, `${label} [${i}] ${Array.from(actual)} != ${expected}`);
}

/** A real scene whose submission is recorded: each RenderTriangleVerts call is copied out. */
function recordingScene()
{
  const scene = new Tr2Sprite2dScene();
  const draws = [];
  scene.RenderTriangleVerts = (vertices, vertexCount, indices, indexCount) =>
  {
    draws.push({
      translation: Array.from(scene.GetTranslation()),
      vertexCount,
      indexCount,
      indices: Array.from(indices).slice(0, indexCount),
      vertices: Array.from({ length: vertexCount }, (_, i) => ({
        position: Array.from(vertices[i].position),
        color: Array.from(vertices[i].color),
        texCoord: vertices[i].texCoord.map(uv => Array.from(uv)),
        tileMode: vertices[i].tileMode,
        spriteEffect: vertices[i].spriteEffect
      }))
    });
  };
  return { scene, draws };
}

/** A real Sprite2D texture whose source rectangle is the given size. */
function texture(srcWidth, srcHeight)
{
  const value = new Tr2Sprite2dTexture();
  value.srcWidth = srcWidth;
  value.srcHeight = srcHeight;
  return value;
}

test("Frame builds Carbon's 4x4 nine-slice grid and draws 18 or 16 triangles", () =>
{
  const frame = new Tr2Sprite2dFrame();
  Object.assign(frame, { displayX: 10, displayY: 20, displayWidth: 100, displayHeight: 60, cornerSize: 8, cornerScale: 1.5, offset: 2 });
  frame.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FILL;
  frame.color.set([0.5, 0.25, 1, 0.75]);
  frame.texturePrimary = texture(32, 16);

  // Tr2Sprite2dFrame.cpp:207-226:
  //   cs = floor(0.5 + 1.5 * 8) = 12; texHorizontalCs = 8 / 32 = 0.25; texVerticalCs = 8 / 16 = 0.5
  //   offset_2 = 4; offsetWidth = 100 - 4 = 96; offsetHeight = 60 - 4 = 56
  //   offsetX = 2 + 10 = 12; offsetY = 2 + 20 = 22
  // Columns (cpp:229-262): 12, 12 + 12 = 24, 96 - 12 + 12 = 96, 96 + 12 = 108
  // Rows: 22, 34, 56 - 12 + 22 = 66, 56 + 22 = 78
  const xs = [12, 24, 96, 108], ys = [22, 34, 66, 78];
  const us = [0, 0.25, 0.75, 1], vs = [0, 0.5, 0.5, 1];

  // The source vertices carry both UV sets (cpp:233-236 and every block after).
  const source = Array.from({ length: 16 }, () => ({ position: new Float32Array(3), color: new Float32Array(4), texCoord: [new Float32Array(2), new Float32Array(2)] }));
  frame._PrepareVertices(source, 32, 16, [0, 0], [1, 1]);
  for (let i = 0; i < 16; i++)
  {
    const row = Math.floor(i / 4), column = i % 4;
    near(source[i].position, [xs[column], ys[row], 0], 0, `source ${i}`);
    near(source[i].texCoord[0], [us[column], vs[row]], 0, `uv0 ${i}`);
    near(source[i].texCoord[1], [us[column], vs[row]], 0, `uv1 ${i}`);
    near(source[i].color, [1, 1, 1, 1], 0);
  }

  const { scene, draws } = recordingScene();
  assert.equal(frame.GetVertexCount(), 48, "Tr2Sprite2dFrame.cpp:202-205: 16 * 3");
  frame.GatherSprites(scene);

  // No shadow or glow: one draw of segment 1 (cpp:170-178), 18 triangles with the centre.
  assert.equal(draws.length, 1);
  assert.equal(draws[0].vertexCount, 16);
  assert.equal(draws[0].indexCount, 54);
  assert.deepEqual(draws[0].indices.slice(48), [5, 9, 10, 5, 10, 6], "cpp:63-68: centre triangles last");
  for (let i = 0; i < 16; i++)
  {
    const vertex = draws[0].vertices[i];
    near(vertex.position, [xs[i % 4], ys[Math.floor(i / 4)], 0], 1e-4, `frame ${i}`);
    // PrepareTriangleVerts multiplies white by the scene colour, which SetRegularRenderState set
    // to m_color (Tr2Sprite2dScene.cpp:925-998); FILL < TWO_TEXTURES, so texCoord[1] becomes
    // (m_saturation, m_effectOpacity) = (1, 1) (Tr2Sprite2dFrame.cpp:153-160).
    near(vertex.color, [0.5, 0.25, 1, 0.75], 1e-6);
    near(vertex.texCoord[1], [1, 1], 0);
  }
  assert.equal(frame.isDirty, false);

  // fillCenter = false sends 16 triangles (cpp:167-168).
  frame.fillCenter = false;
  frame.isDirty = false;
  frame.GatherSprites(scene);
  assert.equal(draws[1].indexCount, 48);
});

test("Frame shadow segment is the frame shifted by the shadow offset", () =>
{
  const frame = new Tr2Sprite2dFrame();
  Object.assign(frame, { displayX: 0, displayY: 0, displayWidth: 40, displayHeight: 40, cornerSize: 4 });
  frame.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FILL;
  frame.shadowOffset.set([3, 4]);
  frame.texturePrimary = texture(16, 16);

  const { scene, draws } = recordingScene();
  frame.GatherSprites(scene);

  // Tr2Sprite2dFrame.cpp:131-136, 170-174: shadow then frame. With cs = floor(0.5 + 4) = 4 the
  // frame columns are 0, 4, 36, 40; the shadow adds vertOffset (3, 4).
  assert.equal(draws.length, 2);
  near(draws[0].vertices[5].position, [7, 8, 0]);
  near(draws[1].vertices[5].position, [4, 4, 0]);
  near(draws[0].vertices[15].position, [43, 44, 0]);
});

test("Stretch builds local vertices and draws them under its pushed translation", () =>
{
  const stretch = new Tr2Sprite2dStretch();
  Object.assign(stretch, { displayX: 5, displayY: 7, displayWidth: 120, displayHeight: 30, leftEdgeSize: 10, rightEdgeSize: 20, edgeScale: 2, offset: 3 });
  stretch.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FILL;
  stretch.texturePrimary = texture(64, 16);

  // Tr2Sprite2dStretch.cpp:171-191:
  //   offset_2 = 6; scaledWidth = 120 - 6 = 114; scaledHeight = 30 - 3 = 27
  //   offsetX = offsetY = 3; y1 = 27 + 3 = 30
  // Columns (cpp:199-240): 3, 3 + 10 * 2 = 23, 3 + 114 - 20 * 2 = 77, 3 + 114 = 117
  // u: 0, 10 / 64 = 0.15625, 1 - 20 / 64 = 0.6875, 1; v: 0 (row 0), 1 (row 1)
  const xs = [3, 23, 77, 117], ys = [3, 30], us = [0, 0.15625, 0.6875, 1];
  const source = Array.from({ length: 8 }, () => ({ position: new Float32Array(3), color: new Float32Array(4), texCoord: [new Float32Array(2), new Float32Array(2)] }));
  stretch._PrepareVertices(source, 64, [0, 0], [1, 1]);
  for (let i = 0; i < 8; i++)
  {
    near(source[i].position, [xs[i % 4], ys[Math.floor(i / 4)], 0], 0, `source ${i}`);
    near(source[i].texCoord[0], [us[i % 4], Math.floor(i / 4)], 0, `uv ${i}`);
  }

  const { scene, draws } = recordingScene();
  assert.equal(stretch.GetVertexCount(), 24, "Tr2Sprite2dStretch.cpp:161-169");
  stretch.GatherSprites(scene);

  // cpp:120-137: PushTranslation(m_translation), 6 triangles with the centre, PopTranslation.
  assert.equal(draws.length, 1);
  assert.deepEqual(draws[0].translation, [5, 7]);
  assert.equal(draws[0].indexCount, 18);
  near(draws[0].vertices[6].position, [77, 30, 0]);
  assert.equal(scene._transformStack.length, 0, "translation popped");

  stretch.display = false;
  assert.equal(stretch.GetVertexCount(), 0, "hidden stretch counts no vertices (cpp:163-166)");
});

test("Stretch picks through Carbon's radius -1 ellipse when it has no mask", () =>
{
  const stretch = new Tr2Sprite2dStretch();
  Object.assign(stretch, { displayX: 5, displayY: 7, displayWidth: 120, displayHeight: 30 });
  const frame = new Tr2Sprite2dFrame();
  Object.assign(frame, { displayX: 5, displayY: 7, displayWidth: 120, displayHeight: 30 });
  const scene = new Tr2Sprite2dScene();

  // Tr2Sprite2dStretch.cpp:149 passes radius -1 without a mask. Local point (2, 2): ellipse
  // semi-axes 60 and 15, centre offset (58, 13): 58^2/60^2 + 13^2/15^2 = 0.934 + 0.751 > 1, so
  // it misses; the centre (65, 22) hits. Frame passes radius 0 (Tr2Sprite2dFrame.cpp:189), so
  // the same corner point hits the frame.
  assert.equal(stretch.PickPoint(7, 9, scene), null);
  assert.equal(stretch.PickPoint(65, 22, scene), stretch);
  assert.equal(frame.PickPoint(7, 9, scene), frame);
});

test("StretchVertical reproduces Carbon's offset quirk in its vertex layout", () =>
{
  const stretch = new Tr2Sprite2dStretchVertical();
  Object.assign(stretch, { displayWidth: 40, displayHeight: 100, topEdgeSize: 10, bottomEdgeSize: 20, edgeScale: 1.5 });
  stretch._offset = 4;

  // Tr2Sprite2dStretchVertical.cpp:162-172: scaledWidth = 40 - 4 = 36,
  // scaledHeight = 100 - 4 * 2 = 92, offsetY = 4. Vertex 1 takes y = 0 (cpp:190) and vertices
  // 6 and 7 take y = scaledHeight = 92 with no offsetY (cpp:254, 265).
  //   top y = 4 + 10 * 1.5 = 19; bottom y = 4 + 92 - 20 * 1.5 = 66
  //   v: 10 / 80 = 0.125 and 1 - 20 / 80 = 0.75
  const expected = [
    [0, 4, 0, 0], [36, 0, 1, 0],
    [0, 19, 0, 0.125], [36, 19, 1, 0.125],
    [0, 66, 0, 0.75], [36, 66, 1, 0.75],
    [0, 92, 0, 1], [36, 92, 1, 1]
  ];
  const source = Array.from({ length: 8 }, () => ({ position: new Float32Array(3), color: new Float32Array(4), texCoord: [new Float32Array(2), new Float32Array(2)] }));
  stretch._PrepareVertices(source, 80, [0, 0], [1, 1]);
  expected.forEach(([x, y, u, v], i) =>
  {
    near(source[i].position, [x, y, 0], 0, `vertex ${i}`);
    near(source[i].texCoord[0], [u, v], 0, `uv ${i}`);
  });

  // The gathered vertices are the same local positions; fillCenter = false sends 4 triangles.
  stretch.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FILL;
  stretch.texturePrimary = texture(16, 80);
  stretch.fillCenter = false;
  const { scene, draws } = recordingScene();
  stretch.GatherSprites(scene);
  assert.equal(draws[0].indexCount, 12);
  near(draws[0].vertices[1].position, [36, 0, 0]);
  assert.deepEqual(draws[0].indices, [0, 2, 3, 0, 3, 1, 4, 6, 7, 4, 7, 5], "cpp:11-26");
});

test("Line builds Carbon's anti-aliased quad along the segment normal", () =>
{
  const line = new Tr2Sprite2dLine();
  Object.assign(line, { displayX: 10, displayY: 20, widthFrom: 2, widthTo: 6, textureWidth: 10, textureOffsetBase: 0.5, textureOffset: 0.25 });
  line.translationTo.set([30, 40]);
  line.colorFrom.set([1, 0, 0, 1]);
  line.colorTo.set([0, 0, 1, 1]);
  line.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FILL_AA;

  const { scene, draws } = recordingScene();
  line.GatherSprites(scene);

  // Tr2Sprite2dLine.cpp:52-84: from = (10, 20), to = (40, 60), d = (30, 40), length 50,
  // d = (0.6, 0.8), normal = (0.8, -0.6). AA: halfWidthFrom = 1 + 2 = 3, halfWidthTo = 3 + 2 = 5,
  // pixelWidthFromInTexels = 1 / 6, pixelWidthToInTexels = 1 / 10.
  // texOffset1 = 0.5 - 0.25 = 0.25; texOffset2 = 0.5 + 50 / 10 - 0.25 = 5.25.
  // cpp:88-147: v0 = from - n*3, v1 = from + n*3, v2 = to + n*5, v3 = to - n*5. FILL_AA makes
  // PrepareTriangleVerts copy both UV sets unchanged (Tr2Sprite2dScene.cpp:925-998).
  const expected = [
    { position: [7.6, 21.8, 0], color: [1, 0, 0, 1], uv0: [0.25, 0], uv1: [-1 / 6, 2] },
    { position: [12.4, 18.2, 0], color: [1, 0, 0, 1], uv0: [0.25, 1], uv1: [1 + 1 / 6, 2] },
    { position: [44, 57, 0], color: [0, 0, 1, 1], uv0: [5.25, 1], uv1: [1.1, 6] },
    { position: [36, 63, 0], color: [0, 0, 1, 1], uv0: [5.25, 0], uv1: [-0.1, 6] }
  ];
  assert.equal(draws.length, 1);
  assert.equal(draws[0].vertexCount, 4);
  assert.deepEqual(draws[0].indices, [0, 1, 3, 3, 1, 2], "cpp:8-15");
  expected.forEach((vertex, i) =>
  {
    near(draws[0].vertices[i].position, vertex.position, 1e-4, `position ${i}`);
    near(draws[0].vertices[i].color, vertex.color, 1e-6, `color ${i}`);
    near(draws[0].vertices[i].texCoord[0], vertex.uv0, 1e-6, `uv0 ${i}`);
    near(draws[0].vertices[i].texCoord[1], vertex.uv1, 1e-6, `uv1 ${i}`);
    // SetTileMode( S2D_TS_TILE_X | S2D_TS_TILE_Y ) = 8 | 16 (cpp:48).
    assert.equal(draws[0].vertices[i].tileMode, 24);
  });
  assert.equal(line.GetVertexCount(), 4);
  assert.equal(line.PickPoint(12, 20, scene), null, "cpp:159-163: TODO, never picked");
});

test("Arc outline and fill follow Carbon's step count, positions, colours and indices", () =>
{
  const arc = new Tr2Sprite2dArc();
  Object.assign(arc, { displayX: 50, displayY: 40, radius: 20, startAngle: 0, endAngle: Math.PI / 2, lineWidth: 2 });
  arc.color.set([0.5, 1, 1, 1]);
  arc.lineColor.set([1, 0.5, 1, 1]);
  arc.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FILL;

  // Tr2Sprite2dArc.cpp:27-47: arcLength = (pi/2) * 20 = 31.4159; numSteps = 31 / 4 = 7;
  // outline 7 * 2 + 2 = 16 vertices.
  assert.equal(arc.GetVertexCount(), 16);

  const { scene, draws } = recordingScene();
  arc.GatherSprites(scene);

  // cpp:117-180: 8 pairs, stepSize = (pi/2) / 7, outer radius 21, inner 19; 7 quads = 42 indices.
  // Colour = lineColor * scene colour (= m_color): (0.5, 0.5, 1, 1).
  const step = (Math.PI / 2) / 7;
  assert.equal(draws[0].vertexCount, 16);
  assert.equal(draws[0].indexCount, 42);
  assert.deepEqual(draws[0].indices.slice(0, 6), [0, 1, 2, 2, 3, 1]);
  for (let k = 0; k < 8; k++)
  {
    const a = k * step;
    near(draws[0].vertices[2 * k].position, [Math.cos(a) * 21 + 50, Math.sin(a) * 21 + 40, 0], 1e-4, `outer ${k}`);
    near(draws[0].vertices[2 * k + 1].position, [Math.cos(a) * 19 + 50, Math.sin(a) * 19 + 40, 0], 1e-4, `inner ${k}`);
    near(draws[0].vertices[2 * k].color, [0.5, 0.5, 1, 1], 1e-6);
  }

  // Filled: GetVertexCount adds 1 + 7 + 1 + 8 = 17 (cpp:38-44), 33 in all; the fan writes the
  // centre and 8 rim vertices (cpp:203-388), so 25 are used, plus 7 fan triangles = 63 indices.
  arc.fill = true;
  arc.isDirty = true;
  assert.equal(arc.GetVertexCount(), 33);
  arc.GatherSprites(scene);
  const filled = draws[1];
  assert.equal(filled.vertexCount, 25);
  assert.equal(filled.indexCount, 63);
  assert.deepEqual(filled.indices.slice(42, 45), [17, 18, 16], "first fan triangle: rim 1, rim 2, centre");
  near(filled.vertices[16].position, [50, 40, 0], 1e-4, "centre");
  near(filled.vertices[17 + 3].position, [Math.cos(3 * step) * 19 + 50, Math.sin(3 * step) * 19 + 40, 0], 1e-4, "rim 3");
  // Fill vertices take m_color and are multiplied by the scene colour m_color again
  // (cpp:225, Tr2Sprite2dScene.cpp:925-998): (0.25, 1, 1, 1).
  near(filled.vertices[16].color, [0.25, 1, 1, 1], 1e-6);
  assert.equal(arc.PickPoint(50, 40, scene), null, "cpp:393-396");
});

test("Arc anti-aliasing widens the outline by 2 pixels each side and stores the AA texels", () =>
{
  const arc = new Tr2Sprite2dArc();
  Object.assign(arc, { radius: 20, startAngle: 0, endAngle: 1, lineWidth: 2 });
  arc.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FILL_AA;

  const { scene, draws } = recordingScene();
  arc.GatherSprites(scene);

  // Tr2Sprite2dArc.cpp:123-160: outer = 20 + 1 + 2 = 23, inner = 20 - 1 - 2 = 17,
  // pixelWidthInTexels = 1 / (2 + 4); v0.texCoord[1] = (1 + 1/6, 2), v1.texCoord[1] = (-1/6, 2).
  // arcLength = 20 -> 5 steps -> 6 pairs.
  assert.equal(draws[0].vertexCount, 12);
  near(draws[0].vertices[0].position, [23, 0, 0]);
  near(draws[0].vertices[1].position, [17, 0, 0]);
  near(draws[0].vertices[0].texCoord[1], [1 + 1 / 6, 2], 1e-6);
  near(draws[0].vertices[1].texCoord[1], [-1 / 6, 2], 1e-6);
});
