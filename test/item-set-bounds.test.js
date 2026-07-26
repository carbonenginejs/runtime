import test from "node:test";
import assert from "node:assert/strict";
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import {
  CreateItemSetBoundingBoxes,
  EveSpriteSet,
  EveSpriteSetItem,
  GetItemSetAabb,
  TriFrustum
} from "../npm/dist/index.js";


const assertBox = (bounds, min, max) =>
{
  assert.deepEqual(Array.from(box3.$min(bounds)), min);
  assert.deepEqual(Array.from(box3.$max(bounds)), max);
};

// A sprite is a sphere: position +/- maxScale on every axis.
const MakeSprite = (position, maxScale, boneIndex = -1) =>
{
  const item = new EveSpriteSetItem();
  vec3.set(item.position, ...position);
  item.maxScale = maxScale;
  item.boneIndex = boneIndex;
  return item;
};

// Float4x3 is column-stride: the translation lands at elements 3, 7 and 11.
const MakeBones = (...translations) =>
{
  const bones = new Float32Array(translations.length * 12);
  translations.forEach((translation, index) =>
  {
    const base = index * 12;
    bones[base + 0] = 1;
    bones[base + 5] = 1;
    bones[base + 10] = 1;
    bones[base + 3] = translation[0];
    bones[base + 7] = translation[1];
    bones[base + 11] = translation[2];
  });
  return bones;
};

test("CreateItemSetBoundingBoxes unions unskinned items into one static box (BoundingBox.h:60-91)", () =>
{
  const staticBounds = box3.create();
  const boneBounds = [];

  CreateItemSetBoundingBoxes(staticBounds, boneBounds, false, [
    MakeSprite([0, 0, 0], 1),
    MakeSprite([10, 0, 0], 2, 4)
  ]);

  // Not skinned: the bone index is ignored and both land in the static box.
  assertBox(staticBounds, [-1, -2, -2], [12, 2, 2]);
  assert.deepEqual(boneBounds, []);
});

test("CreateItemSetBoundingBoxes groups skinned items per bone, ascending", () =>
{
  const staticBounds = box3.create();
  const boneBounds = [];

  CreateItemSetBoundingBoxes(staticBounds, boneBounds, true, [
    MakeSprite([0, 0, 0], 1, 7),
    MakeSprite([4, 0, 0], 1, 7),
    MakeSprite([0, 0, 0], 3, 2),
    MakeSprite([100, 0, 0], 1, -1)
  ]);

  assert.deepEqual(boneBounds.map(entry => entry.boneIndex), [2, 7], "std::map order");
  assertBox(boneBounds[1].bounds, [-1, -1, -1], [5, 1, 1], "both bone-7 sprites merged");
  // A negative bone index falls through to the static box even when skinned.
  assertBox(staticBounds, [99, -1, -1], [101, 1, 1]);
});

test("GetItemSetAabb transforms each bone box, and leaves out-of-range bones alone (BoundingBox.cpp:815-834)", () =>
{
  const staticBounds = box3.create();
  const boneBounds = [];
  const out = box3.create();

  CreateItemSetBoundingBoxes(staticBounds, boneBounds, true, [
    MakeSprite([0, 0, 0], 1, 0),
    MakeSprite([0, 0, 0], 1, 5)
  ]);

  // Bone 0 moves; bone 5 is beyond boneCount so it contributes untransformed.
  GetItemSetAabb(out, staticBounds, boneBounds, MakeBones([50, 0, 0]), 1);
  assertBox(out, [-1, -1, -1], [51, 1, 1]);

  // No bone list at all: every box contributes in the parent's space.
  GetItemSetAabb(out, staticBounds, boneBounds, null, 0);
  assertBox(out, [-1, -1, -1], [1, 1, 1]);
});

test("EveSpriteSet.UpdateVisibility tests its transformed item bounds (EveSpriteSet.cpp:130-140)", () =>
{
  const frustum = new TriFrustum();
  frustum.DeriveFrustum(
    mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, -1], [0, 1, 0]),
    [0, 0, 0],
    mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100000),
    { width: 1024, height: 1024 }
  );
  const updateContext = { GetFrustum: () => frustum };

  const set = new EveSpriteSet();
  set.Rebuild();
  assert.equal(
    set.UpdateVisibility(updateContext, mat4.create()),
    false,
    "an uninitialized set is not visible"
  );

  set.sprites.push(MakeSprite([0, 0, -100], 5));
  set.Rebuild();
  assert.equal(set.UpdateVisibility(updateContext, mat4.create()), true);

  // The parent transform moves the bounds: behind the camera, it culls.
  const behind = mat4.fromTranslation(mat4.create(), [0, 0, 400]);
  assert.equal(set.UpdateVisibility(updateContext, behind), false);

  // An unskinned set ignores the bone list, so a bone cannot pull it on screen.
  const bones = MakeBones([0, 0, -1000]);
  set.sprites[0].boneIndex = 0;
  set.Rebuild();
  assert.equal(set.UpdateVisibility(updateContext, behind, bones, 1), false);

  set.skinned = true;
  set.Rebuild();
  assert.equal(
    set.UpdateVisibility(updateContext, behind, bones, 1),
    true,
    "skinned: the bone moves the sprite back into view"
  );
});
