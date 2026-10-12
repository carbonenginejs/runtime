// Sprite2D text in 3D: a Tr2Sprite2dTextObject gathered by a Tr2Sprite2dScene with
// is2dRender = false, under a rotated, non-uniformly scaled scene transform.
//
// Expected values are derived by hand from Carbon, never from our output:
// - Glyph quad (Tr2FontMeasurer.cpp PrepareSprites, 800-900): x = translation.x + bitmap.x +
//   sbit.left, y = translation.y + bitmap.y - sbit.top, width = sbit.width,
//   height = sbit.height + 1; corners TL, TR, BR, BL.
// - 3D vertices take z = m_depth (Tr2Sprite2dScene.cpp:1883-1889), and SetDepth maps a
//   relative depth into the active range: min + 0.5 * (d + 1) * (max - min).
// - World transform (Tr2Sprite2dScene.cpp:2336-2352): TransformationMatrix(scaling,
//   rotation, translation) = ScalingMatrix * RotationMatrix * TranslationMatrix
//   (math/include/Matrix_inline.h:662-668), with RotationMatrix(q) at :365-385. Row-vector.
// - UberShader3d's vertex stage (res:/Graphics/Effect/UI/UberShader3d.fx, translated WGSL,
//   transform index 0) places a vertex at (x - W/2, -(y - H/2), z) and multiplies by world.
// The row-vector Carbon math below is written out independently of gl-matrix, so a
// composition-order mistake in the port cannot also be in the expectation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Tr2Sprite2dScene, Tr2Sprite2dTextObject, Tr2FontMeasurer, g_textureAtlasMan, Tr2RenderContext_GetMainThreadRenderContext } from '../../npm/dist/trinity/index.js';
import { Tr2RenderContextALStub } from '../../npm/dist/trinityal/index.js';
import { PixelFormat } from '../../npm/dist/global/consts/renderContext/index.js';
import { vec3 } from '../../npm/dist/global/math/index.js';

const EPSILON = 1e-5;

/** Installs a stub AL with a device on the main-thread context for one test. */
function stubDevice(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  t.after(() => context.SetRenderContextAL(prior));
  return context;
}

/** Carbon RotationMatrix(q), Matrix_inline.h:365-385, as m[row][column]. */
function carbonRotation([x, y, z, w])
{
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
    [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
    [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)]
  ];
}

/** Carbon TransformCoord(p, ScalingMatrix(s) * RotationMatrix(q) * TranslationMatrix(t)), row-vector. */
function carbonWorldPoint(p, s, q, t)
{
  const r = carbonRotation(q);
  const scaled = [p[0] * s[0], p[1] * s[1], p[2] * s[2]];
  return [0, 1, 2].map(j => scaled[0] * r[0][j] + scaled[1] * r[1][j] + scaled[2] * r[2][j] + t[j]);
}

test('3D text: glyph vertices take Carbon positions and depth, and land at Carbon world positions', t =>
{
  const context = stubDevice(t);

  // Scene placed in 3D: rotated about a skew axis and scaled non-uniformly.
  const W = 200, H = 100;
  const angle = 0.7, axis = vec3.normalize([], [1, 2, 3]);
  const rotation = [axis[0] * Math.sin(angle / 2), axis[1] * Math.sin(angle / 2), axis[2] * Math.sin(angle / 2), Math.cos(angle / 2)];
  const scaling = [2, 0.5, 1.5], translation = [10, -5, 3];

  const scene = new Tr2Sprite2dScene();
  Object.assign(scene, { is2dRender: false, isFullscreen: false, displayWidth: W, displayHeight: H, depthMin: 0.2, depthMax: 0.6 });
  scene.rotation.set(rotation);
  scene.scaling.set(scaling);
  scene.translation.set(translation);
  assert.equal(scene._OnPrepareResources(), true);

  // A text object with one committed glyph, drawn from a real atlas view.
  const atlas = g_textureAtlasMan.FindAtlas(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  const glyphTexture = atlas.CreateTexture(2, 3);
  const measurer = new Tr2FontMeasurer();
  measurer._committedRenderData = [{
    color: 0xffffffff, underline: false,
    bitmaps: [{ x: 4, y: 10, atlasTexture: glyphTexture, sbit: { width: 2, height: 3, left: 0, top: 3, xadvance: 2 } }]
  }];
  const text = new Tr2Sprite2dTextObject();
  Object.assign(text, { displayX: 30, displayY: 40, textWidth: 50, textHeight: 20 });
  text.SetFontMeasurer(measurer);

  // Carbon Render order (Tr2Sprite2dScene.cpp:250-280): world transform, stacks, gather.
  scene._DetermineWorldTransform();
  scene._PrepareStacksBeforeRender();
  scene.SetDepth(0.5);
  text.GatherSprites(scene);

  // Depth: 0.2 + 0.5 * (0.5 + 1) * (0.6 - 0.2) = 0.5.
  const depth = 0.5;
  // Quad: x0 = 30 + 4 + 0 = 34, y0 = 40 + 10 - 3 = 47, width 2, height 3 + 1 = 4.
  const expected = [[34, 47], [36, 47], [36, 51], [34, 51]];

  assert.equal(scene._vertexCount, 4);
  const view = scene._vertexView;
  const world = context.GetWorldTransform();

  for (let i = 0; i < 4; i++)
  {
    const x = view.getFloat32(i * 88, true), y = view.getFloat32(i * 88 + 4, true), z = view.getFloat32(i * 88 + 8, true);
    assert.ok(Math.abs(x - expected[i][0]) < EPSILON, `vertex ${i} x ${x}`);
    assert.ok(Math.abs(y - expected[i][1]) < EPSILON, `vertex ${i} y ${y}`);
    assert.ok(Math.abs(z - depth) < EPSILON, `vertex ${i} z ${z}`);

    // Shader-space point, then Carbon's world placement.
    const local = [x - W / 2, -(y - H / 2), z];
    const carbon = carbonWorldPoint(local, scaling, rotation, translation);
    const ours = vec3.transformMat4([], local, world);
    for (let j = 0; j < 3; j++) assert.ok(Math.abs(ours[j] - carbon[j]) < EPSILON, `vertex ${i} world[${j}] ${ours[j]} != ${carbon[j]}`);
  }

  scene._CleanUpStacksAfterRender();
});
