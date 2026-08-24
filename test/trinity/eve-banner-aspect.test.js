import assert from "node:assert/strict";
import { test } from "node:test";
import { box3 } from "../../npm/dist/global/math/box3.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { EveBannerItem, EveBannerSet, IEveSpaceObjectAttachment, TriFrustum } from "../../npm/dist/trinity/index.js";


function assertClose(actual, expected, tolerance = 1e-5)
{
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected}, got ${actual}`
  );
}

function nontrivialBanner()
{
  const banner = new EveBannerItem();
  banner.position.set([7, -3, 11]);
  banner.scaling.set([2, 4, 3]);
  quat.setAxisAngle(
    banner.rotation,
    vec3.normalize(vec3.create(), [1, 2, 3]),
    0.73
  );
  return banner;
}

test("EveBannerSet.GetBannerAspectRatio handles flat authored scale", () =>
{
  assert.ok(new EveBannerSet() instanceof IEveSpaceObjectAttachment);
  const banner = nontrivialBanner();
  assert.equal(EveBannerSet.GetBannerAspectRatio(banner), 0.5);
  assert.equal(
    CjsSchema.getMethod(EveBannerSet, "GetBannerAspectRatio")?.impl?.status,
    "implemented"
  );
});

test("EveBannerSet.GetBannerAspectRatio matches Carbon's transformed curved chord lengths", () =>
{
  const horizontal = nontrivialBanner();
  horizontal.angleX = 90;
  assertClose(EveBannerSet.GetBannerAspectRatio(horizontal), 0.6130863513180185);

  const vertical = nontrivialBanner();
  vertical.angleY = 90;
  assertClose(EveBannerSet.GetBannerAspectRatio(vertical), 0.46960260108861696);

  const curved = nontrivialBanner();
  curved.angleX = 70;
  curved.angleY = 110;
  assertClose(EveBannerSet.GetBannerAspectRatio(curved), 0.48561270097731224);
});

test("EveBannerSet.GetBannerAspectRatio clamps curved angles to 180 degrees", () =>
{
  const clamped = nontrivialBanner();
  clamped.angleX = 180;
  const oversized = nontrivialBanner();
  oversized.angleX = 270;

  assertClose(
    EveBannerSet.GetBannerAspectRatio(oversized),
    EveBannerSet.GetBannerAspectRatio(clamped)
  );
});


// A frustum at the origin looking down -Z, square viewport, 90 degree fov.
function MakeBannerFrustum()
{
  const frustum = new TriFrustum();
  frustum.DeriveFrustum(
    mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, -1], [0, 1, 0]),
    [0, 0, 0],
    mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100000),
    { width: 1024, height: 1024 }
  );
  return frustum;
}

function MakeBannerSet(...banners)
{
  const set = new EveBannerSet();
  set.effect = {};
  for (const banner of banners) set.banners.push(banner);
  set.Rebuild();
  return set;
}

function MakeBanner(position, scale = 1, bone = -1)
{
  const banner = new EveBannerItem();
  vec3.set(banner.position, ...position);
  vec3.set(banner.scaling, scale, scale, scale);
  banner.bone = bone;
  return banner;
}

test("EveBannerSet.Rebuild builds no bounds at all without an effect (cpp:406-409)", () =>
{
  const set = new EveBannerSet();
  set.banners.push(MakeBanner([0, 0, 0]));
  set.Rebuild();

  assert.equal(box3.isEmpty(set.GetAabb(box3.create())), true);
  assert.equal(set.GetMaxBannerRadius(), 0);

  set.effect = {};
  set.Rebuild();
  assert.equal(box3.isEmpty(set.GetAabb(box3.create())), false);
});

test("EveBannerSet tracks the largest SINGLE banner radius, not the set's (cpp:421)", () =>
{
  const set = MakeBannerSet(MakeBanner([0, 0, 0], 1), MakeBanner([1000, 0, 0], 4));

  // The unit box is (-0.5,-0.5,-0.5)..(0.5,0.5,0), so a scale-4 banner spans
  // 4 x 4 x 2: half its diagonal is sqrt(16+16+4)/2 = 3.
  assertClose(set.GetMaxBannerRadius(), 3);
  // The set's own bounds are far larger, and deliberately not what LOD uses.
  assert.ok(box3.radius(set.GetAabb(box3.create())) > 500);
});

test("EveBannerSet.UpdateVisibility lods on the closest point of the set sphere (cpp:117-161)", () =>
{
  const frustum = MakeBannerFrustum();
  // One banner of half-diagonal 0.75 at 50 units covers ~15px on a 1024 square
  // viewport, comfortably over half of a threshold of 5.
  const set = MakeBannerSet(MakeBanner([0, 0, -50], 1));
  const context = { GetFrustum: () => frustum, GetVisibilityThreshold: () => 5 };

  assert.equal(set.UpdateVisibility(context, mat4.create()), true);
  assert.equal(set.GetVisibility(), true);

  // Same geometry, an absurd threshold: in frustum, but lodded out.
  const strict = { GetFrustum: () => frustum, GetVisibilityThreshold: () => 1e9 };
  assert.equal(set.UpdateVisibility(strict, mat4.create()), false, "lodded out");

  // Out of frustum entirely.
  const behind = mat4.fromTranslation(mat4.create(), [0, 0, 2000]);
  assert.equal(set.UpdateVisibility(context, behind), false);

  // No banners: not visible, and no LOD work attempted.
  const empty = MakeBannerSet();
  assert.equal(empty.UpdateVisibility(context, mat4.create()), false);
});

test("EveBannerSet reports the screen size to its effect on every path, culled or not", () =>
{
  const frustum = MakeBannerFrustum();
  const reports = [];
  const set = MakeBannerSet(MakeBanner([0, 0, -500], 1));
  set.effect = { UsedWithScreenSize: (...args) => reports.push(args) };

  set.UpdateVisibility({ GetFrustum: () => frustum, GetVisibilityThreshold: () => 1e9 }, mat4.create());
  assert.equal(reports.length, 1, "reported even though the set lodded out");
  assert.ok(reports[0][0] > 0 && Number.isFinite(reports[0][0]));
  assertClose(reports[0][1], set.GetMaxBannerRadius());
  assert.deepEqual(Array.from(reports[0][2]), [1], "one flat quad");

  // A camera INSIDE the set sphere skips the gate and reports FLT_MAX.
  const inside = MakeBannerSet(MakeBanner([0, 0, -1], 100));
  inside.effect = { UsedWithScreenSize: (...args) => reports.push(args) };
  inside.UpdateVisibility({ GetFrustum: () => frustum, GetVisibilityThreshold: () => 1e9 }, mat4.create());
  assert.equal(reports[1][0], 3.4028234663852886e38, "camera inside: no LOD, FLT_MAX");
});


test("EveBannerSet publishes its three debug options and draws each (cpp:219-311)", () =>
{
  const set = MakeBannerSet(MakeBanner([0, 0, 0], 1), MakeBanner([5, 0, 0], 1, 9));
  assert.deepEqual(
    Array.from(set.GetDebugOptions()),
    ["Banner Sets", "Banner Sets Bounds", "Banner Sets Lights"]
  );

  const boxes = [];
  const renderer = {
    HasOption: (owner, option) => option !== "Banner Sets Lights",
    DrawBox: (owner, index, transform, min, max, effect, color) =>
      boxes.push({ index, effect, color: Array.from(color?.length ? color : [color]) }),
    DrawSphere: () => assert.fail("lights option was off")
  };

  set.RenderDebugInfo(renderer, mat4.create());

  // Two banners drawn wireframe THEN solid, plus one bounds box.
  assert.deepEqual(boxes.map(box => box.index), [0, 0, 1, 1, -1]);
  assert.deepEqual(boxes.map(box => box.effect), [
    EveBannerSet.DebugEffect.Wireframe,
    EveBannerSet.DebugEffect.Solid,
    EveBannerSet.DebugEffect.Wireframe,
    EveBannerSet.DebugEffect.Solid,
    EveBannerSet.DebugEffect.Wireframe
  ]);

  // Banner 1 asks for bone 9 with no bone list, so it is drawn red, not blue.
  assert.deepEqual(boxes[0].color, [0.1, 0.1, 0.7, 0.5]);
  assert.deepEqual(boxes[2].color, [0.7, 0.1, 0.1, 0.5]);
});
