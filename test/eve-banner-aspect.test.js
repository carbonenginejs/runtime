import assert from "node:assert/strict";
import { test } from "node:test";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { EveBannerItem, EveBannerSet } from "../npm/dist/index.js";


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
