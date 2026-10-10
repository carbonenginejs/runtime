import test from 'node:test';
import assert from 'node:assert/strict';
import { Tr2Sprite2dTransform, Tr2SpriteObjectPickState } from '../../npm/dist/trinity/index.js';

 test('Sprite2D transform includes translation and rounded, rotated nonuniform scaling pivots', () =>
{
  const node = new Tr2Sprite2dTransform();
  Object.assign(node, { displayX: 17, displayY: -8, displayWidth: 103, displayHeight: 77, rotation: .7, scalingRotation: -.35 });
  node.rotationCenter.set([.5, .25]);
  node.scalingCenter.set([.2, .7]);
  node.scale.set([2, .4]);
  const matrix = node._GetTransformationMatrix();
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [32, -12]])
  {
    const point = node.TransformPoint(x, y);
    assert.ok(Math.abs(matrix[0] * x + matrix[4] * y + matrix[12] - point[0] - 17) < 1e-4);
    assert.ok(Math.abs(matrix[1] * x + matrix[5] * y + matrix[13] - point[1] + 8) < 1e-4);
  }
});

test('Sprite2D transform gathers backgrounds before children, each in reverse order, and restores renderer state', () =>
{
  const node = new Tr2Sprite2dTransform(), calls = [];
  let alpha = .6;
  node.opacity = .5;
  const child = name => ({ SetParent() {}, GatherSprites() { calls.push([name, alpha]); } });
  node.background.push(child('back0'), child('back1'));
  node.children.push(child('front0'), child('front1'));
  const renderer = {
    PushTransform() { calls.push('push'); }, PopTransform() { calls.push('pop'); },
    GetAccumulatedAlpha() { return alpha; }, SetAccumulatedAlpha(value) { alpha = value; }
  };
  node.GatherSprites(renderer);
  assert.deepEqual(calls, ['push', ['back1', .3], ['back0', .3], ['front1', .3], ['front0', .3], 'pop']);
  assert.equal(alpha, .6);
  node.display = false;
  calls.length = 0;
  node.GatherSprites(renderer);
  assert.deepEqual(calls, []);
});

test('Sprite2D transform picks children forward and routes auxiliary mouseover to its owner', () =>
{
  const node = new Tr2Sprite2dTransform(), calls = [];
  Object.assign(node, { displayX: 5, displayY: 6, displayWidth: 40, displayHeight: 30 });
  const hit = { IsAuxMouseover() { return true; } };
  node.children.push({ SetParent() {}, PickPoint() { calls.push('first'); return hit; } }, { SetParent() {}, PickPoint() { throw new Error('must stop'); } });
  const renderer = {
    PushTranslation(value) { assert.deepEqual(value, [5, 6]); calls.push('bounds'); },
    PopTranslation() { calls.push('bounds end'); },
    IsInside() { return true; }, PushTransform() { calls.push('content'); }, PopTransform() { calls.push('content end'); }
  };
  assert.equal(node.PickPoint(10, 11, renderer), node);
  assert.equal(node.auxMouseover, hit);
  assert.deepEqual(calls, ['bounds', 'bounds end', 'content', 'first', 'content end']);
  node.pickState = Tr2SpriteObjectPickState.TR2_SPS_CHILDREN;
  assert.equal(node.PickPoint(10, 11, renderer), hit);
  renderer.IsInside = () => false;
  assert.equal(node.PickPoint(10, 11, renderer), null);
  node.pickState = Tr2SpriteObjectPickState.TR2_SPS_OFF;
  assert.equal(node.PickPoint(10, 11, {}), null);
});
