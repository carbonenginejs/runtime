import test from 'node:test';
import assert from 'node:assert/strict';
import { Tr2Sprite2dScene, Tr2Sprite2dContainer, Tr2Sprite2dTransform, Tr2Sprite2dRenderJob } from '../../npm/dist/trinity/index.js';
import { mat4 } from '../../npm/dist/global/math/index.js';

function near(actual, expected)
{
  for (let i = 0; i < expected.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-4, `${actual} != ${expected}`);
}

test('Sprite2D nested matrix and translation stacks reverse Carbon composition and restore absolute scopes', () =>
{
  const scene = new Tr2Sprite2dScene(), matrix = mat4.create();
  mat4.fromZRotation(matrix, Math.PI / 2);
  scene.PushTranslation([10, 20]);
  scene.PushTransform(matrix);
  scene.PushTranslation([3, 4]);
  near(scene.InverseTransformPoint([6, 23]), [0, 0]);
  scene.PushTransformAbsolute();
  near(scene.InverseTransformPoint([6, 23]), [6, 23]);
  scene.PopTransformAbsolute();
  near(scene.InverseTransformPoint([6, 23]), [0, 0]);
  scene.PopTranslation(); scene.PopTransform(); scene.PopTranslation();
  assert.equal(scene._transformStack.length, 0);
});

test('Sprite2D clipping intersects transformed bounds and preserves inclusive edges', () =>
{
  const scene = new Tr2Sprite2dScene(), matrix = mat4.create();
  scene.PushClipRectangle(0, 0, 100, 100);
  mat4.fromZRotation(matrix, Math.PI / 2);
  matrix[12] = 20;
  scene.PushTransform(matrix);
  scene.PushClipRectangle(0, 0, 30, 10);
  const clip = scene.GetClipRectangle();
  near([clip.left, clip.top, clip.right, clip.bottom], [10, 0, 20, 30]);
  assert.equal(scene.IsInsideClipRect([10, 0]), true);
  assert.equal(scene.IsInsideClipRect([9, 0]), false);
  assert.equal(scene.IsInside([15, 15], [0, 0], 30, 10, 0), true);
  scene.PopClipRectangle(); scene.PopTransform(); scene.PopClipRectangle();
  scene.ignoreClip = true;
  scene.PushClipRectangle(0, 0, 1, 1); scene.PopClipRectangle();
  assert.equal(scene._clipStack.length, 0);
});

test('Sprite2D scene picks real nested containers and restores traversal stacks', () =>
{
  const scene = new Tr2Sprite2dScene(), container = new Tr2Sprite2dContainer();
  const transform = new Tr2Sprite2dTransform(), leaf = new Tr2Sprite2dRenderJob();
  Object.assign(container, { displayX: 10, displayY: 20, displayWidth: 100, displayHeight: 100, clip: true });
  Object.assign(transform, { displayX: 5, displayY: 6, displayWidth: 50, displayHeight: 50 });
  Object.assign(leaf, { displayX: 2, displayY: 3, displayWidth: 10, displayHeight: 10 });
  scene.children.push(container); container.children.push(transform); transform.children.push(leaf);
  assert.equal(scene.PickObject(18, 30), leaf);
  near(scene.lastPickPos, [18, 30]);
  assert.equal(scene.PickObject(500, 500), null);
  assert.equal(scene._transformStack.length, 0);
  assert.equal(scene._clipStack.length, 0);
});

test('Sprite2D real container gathers without capture by default and restores opacity', () =>
{
  const scene = new Tr2Sprite2dScene(), container = new Tr2Sprite2dContainer(), seen = [];
  Object.assign(container, { displayX: 4, displayY: 5, displayWidth: 20, displayHeight: 30, opacity: .4, clip: true });
  container.children.push({ SetParent() {}, GatherSprites(renderer)
  {
    seen.push(renderer.GetAccumulatedAlpha());
    near(renderer.InverseTransformPoint([4, 5]), [0, 0]);
    assert.equal(renderer.GetClipRectangle().right, 24);
  } });
  container.GatherSprites(scene);
  assert.deepEqual(seen, [.4]);
  assert.equal(scene.GetAccumulatedAlpha(), 1);
  assert.equal(scene._transformStack.length, 0);
  assert.equal(scene._clipStack.length, 0);
  assert.equal(container.isDirty, false);
});

test('Sprite2D container cache retries failed capture, replays success, and resets when disabled', () =>
{
  const node = new Tr2Sprite2dContainer();
  Object.assign(node, { displayWidth: 10, displayHeight: 10, cacheContents: true });
  node.children.push({ SetParent() {} });
  let gathers = 0, replay = 0, succeeds = false;
  node._GatherSpritesHelper = () => { gathers++; };
  const record = { Destroy() {} };
  const renderer = { IsCapturing: () => false, StartCapture: () => succeeds, EndCapture: () => record,
    ReplayCapture: value => { assert.equal(value, record); replay++; } };
  node.GatherSprites(renderer);
  assert.equal(node.isDirty, true);
  succeeds = true;
  node.GatherSprites(renderer); node.GatherSprites(renderer);
  assert.equal(gathers, 2); assert.equal(replay, 2);
  node.cacheContents = false;
  node.GatherSprites(renderer);
  assert.equal(node._cachedDisplayList, null);
  assert.equal(node.isCachingContents, false);
});
import { Tr2Sprite2dPolygon } from '../../npm/dist/trinity/index.js';

test('Sprite2D polygon picking accepts either winding and always releases its translation', () =>
{
  const scene = new Tr2Sprite2dScene(), polygon = new Tr2Sprite2dPolygon();
  polygon.displayX = 10; polygon.displayY = 20;
  polygon.AppendVertices([[0, 0], [10, 0], [0, 10]]);
  polygon.AppendTriangles([[0, 1, 2]]);
  assert.equal(polygon.PickPoint(12, 22, scene), polygon);
  assert.equal(polygon.PickPoint(19, 29, scene), null);
  polygon.triangles[0].index1 = 2; polygon.triangles[0].index2 = 1;
  assert.equal(polygon.PickPoint(12, 22, scene), polygon);
  assert.equal(scene._transformStack.length, 0);
  assert.equal(polygon.GetVertexCount(), 3);
  polygon.display = false;
  assert.equal(polygon.GetVertexCount(), 0);
});

test('Sprite2D line picking retains native midpoint endpoint bound and pixel width under scaling', () =>
{
  const scene = new Tr2Sprite2dScene(), matrix = mat4.create();
  matrix[0] = 2;
  scene.PushTransform(matrix);
  assert.equal(scene.IsInsideLineSegment([10, 1], [0, 0], [10, 0], 1), true);
  assert.equal(scene.IsInsideLineSegment([10, 2], [0, 0], [10, 0], 1), false);
  assert.equal(scene.IsInsideLineSegment([0, 1], [0, 0], [10, 0], 1), false);
  assert.equal(scene.IsInsideLineSegment([0, 0], [0, 0], [0, 0], 1), false);
  scene.PopTransform();
});

test('Sprite2D relative depth ranges compose only in a 3D render context', () =>
{
  const scene = new Tr2Sprite2dScene();
  scene._is2dRenderContext = false;
  scene._depthStack.push([.2, .8]);
  scene.PushDepthRange(-.5, .5);
  near(scene._depthStack.at(-1), [.35, .65]);
  scene.SetDepth(0);
  assert.ok(Math.abs(scene._depth - .5) < 1e-6);
  scene.PopDepthRange();
  scene._is2dRenderContext = true;
  scene.PushDepthRange(-1, 1); scene.PopDepthRange();
  assert.equal(scene._depthStack.length, 1);
});


test('Sprite2D native list mutations attach parents and invalidate cached ancestors', () =>
{
  const parent = new Tr2Sprite2dContainer(), child = new Tr2Sprite2dContainer(), leaf = new Tr2Sprite2dRenderJob();
  parent.children.Append(child);
  parent.isDirty = child.isDirty = false;
  child.children.Append(leaf);
  assert.equal(parent.isDirty, true);
  assert.equal(child.isDirty, true);
  parent.isDirty = child.isDirty = false;
  leaf.SetDirty();
  assert.equal(parent.isDirty, true);
  child.children.Remove(0);
  parent.isDirty = child.isDirty = false;
  leaf.SetDirty();
  assert.equal(parent.isDirty, false);
});


test('Sprite2D root rendering stacks use scene depth bounds and restore after traversal', () =>
{
  const scene = new Tr2Sprite2dScene();
  scene.depthMin = 0.2; scene.depthMax = 0.8;
  scene._is2dRenderContext = false;
  scene._PrepareStacksBeforeRender();
  scene.PushDepthRange(-0.5, 0.5);
  scene.SetDepth(0);
  assert.ok(Math.abs(scene._depth - 0.5) < 1e-6);
  assert.equal(scene.IsInsideClipRect([1e20, -1e20]), true);
  scene.PopDepthRange();
  scene._CleanUpStacksAfterRender();
  assert.equal(scene._depthStack.length, 0);
  assert.equal(scene._clipStack.length, 0);
});

test('Sprite2D basic sprites pick authored bounds and budget shadow/glow quads', async () =>
{
  const { Tr2Sprite2d } = await import('../../npm/dist/trinity/index.js');
  const sprite = new Tr2Sprite2d(), scene = new Tr2Sprite2dScene();
  Object.assign(sprite, { displayX: 4, displayY: 5, displayWidth: 10, displayHeight: 20 });
  scene.PushTranslation([100, 200]);
  assert.equal(sprite.PickPoint(105, 206, scene), sprite);
  assert.equal(sprite.PickPoint(103, 206, scene), null);
  sprite.pickingMask = { SampleMask(point, translation, width, height)
  {
    near(point, [5, 6]); near(translation, [4, 5]);
    assert.equal(width, 10); assert.equal(height, 20);
    return false;
  } };
  assert.equal(sprite.PickPoint(105, 206, scene), null);
  scene.PopTranslation();
  assert.equal(sprite.GetVertexCount(), 4);
  sprite.shadowOffset[0] = 1;
  assert.equal(sprite.GetVertexCount(), 8);
  sprite.glowExpand = 2;
  assert.equal(sprite.GetVertexCount(), 12);
  sprite.isDirty = false; sprite._vertexCount = 8;
  assert.equal(sprite.GetVertexCount(), 8);
  sprite.display = false;
  assert.equal(sprite.GetVertexCount(), 0);
});


test('Sprite2D projected picking reverses camera/world composition and preserves scene coordinates', () =>
{
  const scene = new Tr2Sprite2dScene(), leaf = new Tr2Sprite2dRenderJob();
  scene.is2dPick = false; scene.is2dRender = false;
  scene.displayWidth = scene.displayHeight = 100;
  scene.translation.set([1, 2, -10]); scene.scaling.set([2, 3, 1]);
  const projectionMatrix = mat4.create(), viewMatrix = mat4.create();
  mat4.perspective(projectionMatrix, Math.PI / 2, 1, 0.1, 100);
  mat4.fromTranslation(viewMatrix, [-1, -2, -5]);
  const projection = { GetTransform(out) { return mat4.copy(out, projectionMatrix); } };
  const view = { GetTransform(out) { return mat4.copy(out, viewMatrix); } };
  Object.assign(leaf, { displayX: 51, displayY: 47, displayWidth: 2, displayHeight: 2 });
  scene.children.Append(leaf);
  assert.equal(scene.PickObject(7 + 50 * (1 + 4 / 15), 31, projection, view, { x: 7, y: 11, width: 101, height: 101 }), leaf);
  near(scene.lastPickPos, [52, 48]);
  assert.equal(scene._transformStack.length, 0);
});
