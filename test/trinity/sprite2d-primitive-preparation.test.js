import test from 'node:test';
import assert from 'node:assert/strict';
import { Tr2Sprite2d, Tr2Sprite2dScene, Tr2Sprite2dContainer, Tr2Sprite2dTexture, Tr2Sprite2dD3DVertex, ITr2Sprite2dTexture } from '../../npm/dist/trinity/index.js';
import { CjsSchema } from '../../npm/dist/global/schema/index.js';
import { mat4 } from '../../npm/dist/global/math/index.js';

class RecordingScene extends Tr2Sprite2dScene
{
  draws = [];
  preparations = 0;
  PrepareSpriteVerts(...args)
  {
    this.preparations++;
    return super.PrepareSpriteVerts(...args);
  }
  RenderTriangleVerts(vertices, count, indices, indexCount)
  {
    this.draws.push({ vertices: structuredClone(vertices), count, indices: Array.from(indices.slice(0, indexCount)) });
  }
}

function near(actual, expected)
{
  for (let i = 0; i < expected.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-5, `${actual} != ${expected}`);
}

test('default COPY skips a missing texture; NONE and hidden skip preparation entirely', () =>
{
  const sprite = new Tr2Sprite2d(), renderer = new RecordingScene();
  assert.equal(sprite.spriteEffect, 32);
  sprite.GatherSprites(renderer);
  assert.equal(sprite.isDirty, true);
  assert.equal(renderer.draws.length, 0);
  sprite.spriteEffect = 0xffffffff;
  sprite.GatherSprites(renderer);
  sprite.spriteEffect = 0; sprite.display = false;
  sprite.GatherSprites(renderer);
  assert.equal(renderer.preparations, 0);
});

test('texture replacements detach old notifications and propagate dirty to ancestors', () =>
{
  const sprite = new Tr2Sprite2d(), parent = new Tr2Sprite2dContainer();
  const first = new Tr2Sprite2dTexture(), second = new Tr2Sprite2dTexture();
  assert.equal(CjsSchema.cast(first, ITr2Sprite2dTexture), first);
  parent.children.Append(sprite);
  sprite.texturePrimary = first;
  sprite.isDirty = parent.isDirty = false;
  first.SetSrcWidth(20);
  assert.equal(sprite.isDirty, true); assert.equal(parent.isDirty, true);
  sprite.texturePrimary = second;
  sprite.isDirty = parent.isDirty = false;
  first.SetDirty();
  assert.equal(sprite.isDirty, false);
  sprite.texturePrimary = second;
  assert.equal(sprite.isDirty, false);
  second.SetDirty();
  assert.equal(parent.isDirty, true);
  sprite.Destroy();
  sprite.isDirty = parent.isDirty = false;
  second.SetDirty();
  assert.equal(sprite.isDirty, false);
});

test('real sprite preparation preserves shadow/base/glow order, colors and cached vertices', () =>
{
  const sprite = new Tr2Sprite2d(), renderer = new RecordingScene();
  Object.assign(sprite, { spriteEffect: 0, displayX: 10, displayY: 20, displayWidth: 30, displayHeight: 40, glowExpand: 2, saturation: 0.25, effectOpacity: 0.75 });
  sprite.shadowOffset.set([3, 4]);
  sprite.color.set([1, 0.5, 0.25, 0.5]);
  sprite.shadowColor.set([0.1, 0.2, 0.3, 0.5]);
  sprite.glowColor.set([0.3, 0.4, 0.5, 0.25]);
  sprite.GatherSprites(renderer);
  const draw = renderer.draws[0];
  assert.equal(draw.count, 12);
  assert.deepEqual(draw.indices, [0,1,3,3,1,2,4,5,7,7,5,6,8,9,11,11,9,10]);
  near(draw.vertices[0].position, [13,24,0]);
  near(draw.vertices[4].position, [10,20,0]);
  near(draw.vertices[8].position, [8,18,0]);
  near(draw.vertices[0].color, [0.1,0.2,0.3,0.25]);
  near(draw.vertices[8].color, [0.3,0.4,0.5,0.125]);
  near(draw.vertices[4].texCoord[1], [0.25,0.75]);
  assert.equal(draw.vertices[8].blendMode, 11);
  near(sprite.shadowColor, [0.1,0.2,0.3,0.5]);
  sprite.GatherSprites(renderer);
  assert.equal(renderer.preparations, 3);
  assert.deepEqual(renderer.draws[1], draw);
});

test('base-only submission starts from base vertices with zero-based indices', () =>
{
  const sprite = new Tr2Sprite2d(), renderer = new RecordingScene();
  Object.assign(sprite, { spriteEffect: 0, displayX: 7, displayY: 9, displayWidth: 5, displayHeight: 6 });
  sprite.GatherSprites(renderer);
  near(renderer.draws[0].vertices[0].position, [7,9,0]);
  assert.deepEqual(renderer.draws[0].indices, [0,1,3,3,1,2]);
  assert.equal(renderer.draws[0].count, 4);
});

test('texture validation requires both slots and clean draws reapply bindings', () =>
{
  const sprite = new Tr2Sprite2d(), renderer = new RecordingScene(), calls = [];
  const texture = good => ({ RegisterForChangeNotification() {}, UnregisterForChangeNotification() {}, IsGood() { return good; }, Apply(_renderer, index) { calls.push(index); } });
  sprite.spriteEffect = 64;
  sprite.texturePrimary = texture(true);
  sprite.textureSecondary = texture(false);
  sprite.GatherSprites(renderer);
  assert.equal(sprite.isDirty, true);
  assert.equal(renderer.draws.length, 0);
  sprite.textureSecondary = texture(true);
  // Provide ready atlas inputs to the scene independently of the wrapper contract under test.
  renderer._texture = [{ IsGood: () => true }, { IsGood: () => true }];
  sprite.GatherSprites(renderer);
  assert.equal(sprite.isDirty, false);
  assert.deepEqual(calls, [0,0,1,0,1]);
  sprite.GatherSprites(renderer);
  assert.deepEqual(calls.slice(-2), [0,1]);
  assert.equal(renderer.preparations, 1);
});

test('UV preparation applies tile scale, transform, then atlas window', () =>
{
  const renderer = new Tr2Sprite2dScene();
  renderer.SetSpriteEffect(32);
  renderer._texture[0] = { IsGood: () => true, GetWidthReciprocal: () => 1/10, GetHeightReciprocal: () => 1/20 };
  const setting = renderer._textureSettings[0];
  setting.tileX = setting.tileY = true;
  setting.textureWindow.set([0.25,0.125,0.5,0.25]);
  const transform = mat4.create();
  mat4.fromTranslation(transform, [0.1,0.2,0]);
  renderer.SetTextureTransform(0, transform);
  const vertices = Array.from({length:4}, () => new Tr2Sprite2dD3DVertex());
  assert.equal(renderer.PrepareSpriteVerts(vertices, [3,4], 20, 60, 32), true);
  near(vertices[0].texCoord[0], [0.3,0.175]);
  near(vertices[2].texCoord[0], [1.3,0.925]);
  assert.notEqual(vertices[0].clipRect, vertices[1].clipRect);
});

test('glow expands by one atlas texel and outline retains the opposite original UV', () =>
{
  const renderer = new Tr2Sprite2dScene();
  renderer._texture[0] = { IsGood: () => true, GetTextureWidth: () => 100, GetTextureHeight: () => 200 };
  const vertices = Array.from({length:4}, () => new Tr2Sprite2dD3DVertex());
  renderer.SetSpriteEffect(42);
  renderer.PrepareSpriteVerts(vertices, [10,20], 30,40,42);
  near(vertices[0].position, [9,19,0]);
  near(vertices[0].texCoord[0], [-0.01,-0.005]);
  near(vertices[0].texCoord[1], [1,1]);
  renderer.SetSpriteEffect(36); renderer.SetOutlineColor([1,0.5,0.25,0.75]); renderer.SetOutlineThreshold(0.25);
  renderer.PrepareSpriteVerts(vertices, [10,20], 30,40,36);
  near(vertices[0].position, [10,20,0]);
  near(vertices[0].outlineColor, [1,0.5,0.25,0.75]);
  assert.equal(vertices[0].outlineThreshold, 0.25);
});
