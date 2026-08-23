// TriFrustum / TriFrustumOrtho / shadow-frustum adapters / EveUpdateContext
// visibility surface (ECS-VISIBILITY-SPEC-2026-07-23 PART 2). Carbon sources:
// trinity/TriFrustum.h+.cpp, trinity/TriFrustumOrtho.h+.cpp,
// trinity/Eve/IEveShadowCaster.h:28-135, trinity/Eve/EveUpdateContext.h.
//
// The visibility oracles below are computed WITHOUT the frustum's own composed
// matrix: points are pushed through the view matrix and then the projection
// matrix as two independent single-matrix transforms (where row/column operand
// order cannot go wrong), and the un-normalized plane conditions
// (w+-x >= 0, w+-y >= 0, z >= 0, w-z >= 0) are evaluated on the resulting clip
// coordinates. Any operand-order mistake in DeriveFrustum's view*projection
// composition fails these numeric fixtures (asymmetric eye/target/fov/aspect;
// identity-parent style fixtures prove nothing).
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EveLODHelper,
  EveUpdateContext,
  Tr2Lod,
  TriFrustum,
  TriFrustumOrtho,
  TriFrustumTestResult,
  TriShadowFrustum,
  TriShadowOrthoFrustum,
  TriViewport
} from "../npm/dist/index.js";

import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

const FLOAT_MAX = 3.4028234663852886e38;

// --- Fixture: deliberately asymmetric camera --------------------------------

const EYE = vec3.fromValues(3, 5, -7);
const TARGET = vec3.fromValues(10, 2, 4);
const UP = vec3.fromValues(0, 1, 0);
const FOVY = 0.9;
const ASPECT = 1.6;
const NEAR = 2;
const FAR = 500;

function MakeFixture({ width = 1280, height = 800 } = {})
{
  const view = mat4.lookAt(mat4.create(), EYE, TARGET, UP);
  const projection = mat4.perspectiveZO(mat4.create(), FOVY, ASPECT, NEAR, FAR);
  const viewport = new TriViewport();
  viewport.__init__(0, 0, width, height);
  const frustum = new TriFrustum();
  frustum.DeriveFrustum(view, EYE, projection, viewport);
  const forward = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), TARGET, EYE));
  return { view, projection, viewport, frustum, forward };
}

/** Clip coords via two independent single-matrix transforms (V then P). */
function ClipCoords(view, projection, point)
{
  const v = vec4.fromValues(point[0], point[1], point[2], 1);
  vec4.transformMat4(v, v, view);
  vec4.transformMat4(v, v, projection);
  return v;
}

/**
 * Ground-truth point visibility: the exact un-normalized plane conditions the
 * extraction encodes. cullBack=false matches Carbon's default 5-plane sphere
 * test (back plane ignored).
 */
function OraclePointVisible(view, projection, point, cullBack = false)
{
  const c = ClipCoords(view, projection, point);
  const w = c[3];
  return w + c[0] >= 0 && w - c[0] >= 0 &&
    w + c[1] >= 0 && w - c[1] >= 0 &&
    c[2] >= 0 && (!cullBack || w - c[2] >= 0);
}

/** Deterministic LCG so failures reproduce. */
function MakeRandom(seed)
{
  let state = seed >>> 0;
  return () =>
  {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** ~n roughly uniform unit directions (golden spiral), deterministic. */
function UnitDirections(n)
{
  const directions = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++)
  {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    directions.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return directions;
}

const DIRECTIONS = UnitDirections(200);

/** True when any sampled point of the sphere passes the point oracle. */
function OracleSphereSampleVisible(view, projection, center, radius, cullBack = false)
{
  if (OraclePointVisible(view, projection, center, cullBack))
  {
    return true;
  }
  for (const scale of [1, 0.5])
  {
    for (const d of DIRECTIONS)
    {
      const p = [
        center[0] + d[0] * radius * scale,
        center[1] + d[1] * radius * scale,
        center[2] + d[2] * radius * scale
      ];
      if (OraclePointVisible(view, projection, p, cullBack))
      {
        return true;
      }
    }
  }
  return false;
}

/** Normalized signed distance of a point to a frustum plane. */
function PlaneDistance(plane, p)
{
  return plane[0] * p[0] + plane[1] * p[1] + plane[2] * p[2] + plane[3];
}

// --- TriFrustum: brute-force point oracle -----------------------------------

test("TriFrustum.IsPointVisible matches the independent clip-space oracle over random points", () =>
{
  const { view, projection, frustum } = MakeFixture();
  const random = MakeRandom(0xC0FFEE);
  let visibleCount = 0;
  let hiddenCount = 0;
  let tested = 0;

  for (let i = 0; i < 4000; i++)
  {
    const p = [
      (random() - 0.5) * 1200,
      (random() - 0.5) * 1200,
      (random() - 0.5) * 1200
    ];

    // Exclude near-plane-boundary points where float32 plane extraction and
    // the float64 oracle may legitimately disagree.
    let margin = Infinity;
    for (let j = 0; j < 5; j++)
    {
      margin = Math.min(margin, Math.abs(PlaneDistance(frustum.planes[j], p)));
    }
    if (margin < 0.05)
    {
      continue;
    }

    const expected = OraclePointVisible(view, projection, p);
    const actual = frustum.IsPointVisible(p);
    assert.equal(actual, expected, `point ${p} oracle=${expected} frustum=${actual}`);
    tested++;
    if (expected)
    {
      visibleCount++;
    }
    else
    {
      hiddenCount++;
    }
  }

  assert.ok(tested > 3000, `enough points tested (${tested})`);
  assert.ok(visibleCount > 50, `non-degenerate visible class (${visibleCount})`);
  assert.ok(hiddenCount > 50, `non-degenerate hidden class (${hiddenCount})`);
});

test("TriFrustum sanity: target point visible, point behind camera invisible", () =>
{
  const { frustum, forward } = MakeFixture();
  assert.equal(frustum.IsPointVisible(TARGET), true);
  const behind = vec3.scaleAndAdd(vec3.create(), EYE, forward, -20);
  assert.equal(frustum.IsPointVisible(behind), false);
});

// --- TriFrustum: spheres straddling every plane -----------------------------

test("TriFrustum.IsSphereVisible agrees with the sampling oracle for spheres straddling every plane", () =>
{
  const { view, projection, frustum, forward } = MakeFixture();
  // Interior anchor on the view ray, well away from near/far.
  const anchor = vec3.scaleAndAdd(vec3.create(), EYE, forward, 60);
  assert.equal(OraclePointVisible(view, projection, anchor), true, "anchor must be interior");

  const radius = 5;
  const delta = 0.5;

  for (let planeIndex = 0; planeIndex < 6; planeIndex++)
  {
    const cullBack = planeIndex === TriFrustum.PLANE_BACK;
    const plane = frustum.planes[planeIndex];
    const n = [plane[0], plane[1], plane[2]];
    // Project the anchor onto the plane.
    const dist = PlaneDistance(plane, anchor);
    const onPlane = [anchor[0] - n[0] * dist, anchor[1] - n[1] * dist, anchor[2] - n[2] * dist];

    // Sphere pushed fully outside the plane: invisible, and no sampled point
    // of it passes the oracle.
    const outsideCenter = [
      onPlane[0] - n[0] * (radius + delta),
      onPlane[1] - n[1] * (radius + delta),
      onPlane[2] - n[2] * (radius + delta)
    ];
    const outsideSphere = vec4.fromValues(outsideCenter[0], outsideCenter[1], outsideCenter[2], radius);
    assert.equal(
      frustum.IsSphereVisible(outsideSphere, cullBack),
      false,
      `plane ${planeIndex}: fully-outside sphere must be invisible`
    );
    assert.equal(
      OracleSphereSampleVisible(view, projection, outsideCenter, radius - delta / 2, cullBack),
      false,
      `plane ${planeIndex}: oracle confirms shrunk outside sphere has no visible samples`
    );

    // Sphere straddling the plane: visible, and the sampling oracle finds a
    // visible point (the cap that crosses back inside).
    const straddleCenter = [
      onPlane[0] - n[0] * (radius - delta),
      onPlane[1] - n[1] * (radius - delta),
      onPlane[2] - n[2] * (radius - delta)
    ];
    const straddleSphere = vec4.fromValues(straddleCenter[0], straddleCenter[1], straddleCenter[2], radius);
    assert.equal(
      frustum.IsSphereVisible(straddleSphere, cullBack),
      true,
      `plane ${planeIndex}: straddling sphere must be visible`
    );
    const probe = [
      onPlane[0] + n[0] * (delta / 2),
      onPlane[1] + n[1] * (delta / 2),
      onPlane[2] + n[2] * (delta / 2)
    ];
    assert.equal(
      OraclePointVisible(view, projection, probe, cullBack),
      true,
      `plane ${planeIndex}: oracle sees the inside probe of the straddling sphere`
    );
  }

  // Carbon parity quirk: without cullBackPlane the back plane is IGNORED - a
  // sphere far beyond the far plane still reports visible.
  const beyondFar = vec3.scaleAndAdd(vec3.create(), EYE, forward, FAR * 3);
  const beyondFarSphere = vec4.fromValues(beyondFar[0], beyondFar[1], beyondFar[2], radius);
  assert.equal(frustum.IsSphereVisible(beyondFarSphere), true, "back plane ignored by default (Carbon parity)");
  assert.equal(frustum.IsSphereVisible(beyondFarSphere, true), false, "cullBackPlane=true rejects beyond-far spheres");
  // (center, radius, cullBackPlane) overload agrees with the packed overload.
  assert.equal(frustum.IsSphereVisible(beyondFar, radius, true), false);
  assert.equal(frustum.IsSphereVisible(beyondFar, radius), true);
});

// --- TriFrustum: boxes straddling every plane -------------------------------

test("TriFrustum.IsBoxVisible agrees with corner sampling for boxes straddling every plane", () =>
{
  const { view, projection, frustum, forward } = MakeFixture();
  const anchor = vec3.scaleAndAdd(vec3.create(), EYE, forward, 60);
  const half = 4;
  const delta = 0.5;

  const cornersOf = (min, max) =>
  {
    const corners = [];
    for (const x of [min[0], max[0]])
    {
      for (const y of [min[1], max[1]])
      {
        for (const z of [min[2], max[2]])
        {
          corners.push([x, y, z]);
        }
      }
    }
    return corners;
  };

  for (let planeIndex = 0; planeIndex < 6; planeIndex++)
  {
    const plane = frustum.planes[planeIndex];
    const n = [plane[0], plane[1], plane[2]];
    const dist = PlaneDistance(plane, anchor);
    const onPlane = [anchor[0] - n[0] * dist, anchor[1] - n[1] * dist, anchor[2] - n[2] * dist];

    // Straddling box centered on the plane point: visible, and a probe nudged
    // inside the plane (still within the box) passes the oracle for the five
    // default planes.
    const min = [onPlane[0] - half, onPlane[1] - half, onPlane[2] - half];
    const max = [onPlane[0] + half, onPlane[1] + half, onPlane[2] + half];
    assert.equal(frustum.IsBoxVisible(min, max), true, `plane ${planeIndex}: straddling box visible`);
    assert.equal(frustum.IsBoxVisible({ min, max }), true, `plane ${planeIndex}: AABB duck overload`);
    if (planeIndex !== TriFrustum.PLANE_BACK)
    {
      const probe = [onPlane[0] + n[0] * 2, onPlane[1] + n[1] * 2, onPlane[2] + n[2] * 2];
      assert.equal(OraclePointVisible(view, projection, probe), true,
        `plane ${planeIndex}: oracle sees the inside probe within the straddling box`);
    }

    // Box entirely behind the plane: distance covering the positive vertex.
    const reach = half * (Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2])) + delta;
    const outMin = [min[0] - n[0] * reach, min[1] - n[1] * reach, min[2] - n[2] * reach];
    const outMax = [max[0] - n[0] * reach, max[1] - n[1] * reach, max[2] - n[2] * reach];
    assert.equal(frustum.IsBoxVisible(outMin, outMax), false, `plane ${planeIndex}: fully-outside box invisible`);
    for (const corner of cornersOf(outMin, outMax))
    {
      assert.equal(OraclePointVisible(view, projection, corner, true), false,
        `plane ${planeIndex}: oracle confirms every corner of the outside box is hidden`);
    }
  }

  // Missing/uninitialized AABB duck is not visible (Carbon cpp:225-232).
  assert.equal(frustum.IsBoxVisible(null), false);
  assert.equal(frustum.IsBoxVisible({}), false);
});

// --- TriFrustum: pixel sizes -------------------------------------------------

test("TriFrustum pixel sizes: exact projection ground truth, distance ordering, viewport scaling", () =>
{
  const { view, projection, frustum, forward } = MakeFixture();
  const radius = 10;

  const expectedPixels = (center, r) =>
  {
    // Independent ground truth: depth from the view matrix (single transform),
    // projected diameter r/depth * m11 * width.
    const viewSpace = vec3.transformMat4(vec3.create(), center, view);
    const depth = -viewSpace[2];
    return (r / depth) * projection[0] * 1280;
  };

  const near100 = vec3.scaleAndAdd(vec3.create(), EYE, forward, 100);
  const far200 = vec3.scaleAndAdd(vec3.create(), EYE, forward, 200);
  const sphereNear = vec4.fromValues(near100[0], near100[1], near100[2], radius);
  const sphereFar = vec4.fromValues(far200[0], far200[1], far200[2], radius);

  const nearPixels = frustum.GetPixelSizeAccross(sphereNear);
  const farPixels = frustum.GetPixelSizeAccross(sphereFar);

  assert.ok(Math.abs(nearPixels - expectedPixels(near100, radius)) < expectedPixels(near100, radius) * 1e-4,
    `near sphere ${nearPixels} matches projection ground truth ${expectedPixels(near100, radius)}`);
  assert.ok(Math.abs(farPixels - expectedPixels(far200, radius)) < expectedPixels(far200, radius) * 1e-4);
  assert.ok(nearPixels > farPixels, "nearer sphere covers more pixels");
  assert.ok(Math.abs(nearPixels / farPixels - 2) < 1e-3, "half the distance, twice the pixels");

  // (center, radius) overload agrees with the packed vec4 overload.
  assert.equal(frustum.GetPixelSizeAccross(near100, radius), nearPixels);

  // Doubling the viewport width exactly doubles the pixel coverage.
  const wide = MakeFixture({ width: 2560 });
  assert.ok(Math.abs(wide.frustum.GetPixelSizeAccross(sphereNear) / nearPixels - 2) < 1e-6);

  // Estimate: within 1% of exact at these distances, same overload dispatch.
  const est = frustum.GetPixelSizeAccrossEst(sphereFar);
  assert.ok(Math.abs(est - farPixels) < farPixels * 0.01, `estimate ${est} tracks exact ${farPixels}`);
  assert.equal(frustum.GetPixelSizeAccrossEst(far200, radius), est);

  // Camera inside the sphere: float max (Carbon std::numeric_limits<float>::max()).
  const engulfing = vec4.fromValues(EYE[0], EYE[1], EYE[2], 50);
  assert.equal(frustum.GetPixelSizeAccross(engulfing), FLOAT_MAX);
  assert.equal(frustum.GetPixelSizeAccrossEst(engulfing), FLOAT_MAX);

  // Degenerate radii.
  assert.equal(frustum.GetPixelSizeAccross(vec4.fromValues(near100[0], near100[1], near100[2], 0)), 0);
  assert.equal(frustum.GetPixelSizeAccrossEst(vec4.fromValues(near100[0], near100[1], near100[2], -1)), 0);

  // Sphere duck { center, radius } takes Carbon's Est delegation (cpp:295-298);
  // AABB duck goes through its bounding sphere.
  assert.equal(frustum.GetPixelSizeAccross({ center: far200, radius }), est);
  const boxMin = [far200[0] - 6, far200[1] - 6, far200[2] - 6];
  const boxMax = [far200[0] + 6, far200[1] + 6, far200[2] + 6];
  const boxRadius = Math.hypot(12, 12, 12) / 2;
  const boxPixels = frustum.GetPixelSizeAccross({ min: boxMin, max: boxMax });
  const boxExpected = frustum.GetPixelSizeAccrossEst(far200, boxRadius);
  assert.ok(Math.abs(boxPixels - boxExpected) < boxExpected * 1e-6);
});

test("TriFrustum recovers the projection parameters (DeconstructProjectionMatrix)", () =>
{
  const { frustum } = MakeFixture();
  assert.ok(Math.abs(frustum.fov - FOVY) < 1e-5, `fov ${frustum.fov}`);
  assert.ok(Math.abs(frustum.aspectRatio - ASPECT) < 1e-5, `aspect ${frustum.aspectRatio}`);
  assert.ok(Math.abs(frustum.zNear - NEAR) < 1e-4, `zNear ${frustum.zNear}`);
  assert.ok(Math.abs(frustum.zFar - FAR) < FAR * 1e-3, `zFar ${frustum.zFar}`);
  assert.ok(Math.abs(frustum.halfWidthProjection - frustum.projectionMatrix[0] * 1280 * 0.5) < 1e-6);
});

test("TriFrustum.SphereTest classifies Inside/Intersect/Outside with all six planes", () =>
{
  const { frustum, forward } = MakeFixture();
  const anchor = vec3.scaleAndAdd(vec3.create(), EYE, forward, 60);

  assert.equal(frustum.SphereTest({ center: anchor, radius: 1 }), TriFrustumTestResult.Inside);
  // Straddling the near plane region: big radius reaching behind the camera.
  assert.equal(frustum.SphereTest({ center: anchor, radius: 59 }), TriFrustumTestResult.Intersect);
  const behind = vec3.scaleAndAdd(vec3.create(), EYE, forward, -50);
  assert.equal(frustum.SphereTest({ center: behind, radius: 5 }), TriFrustumTestResult.Outside);

  // Unlike IsSphereVisible, SphereTest DOES consult the back plane.
  const beyondFar = vec3.scaleAndAdd(vec3.create(), EYE, forward, FAR * 3);
  assert.equal(frustum.SphereTest({ center: beyondFar, radius: 5 }), TriFrustumTestResult.Outside);
  assert.equal(frustum.IsSphereVisible(vec4.fromValues(beyondFar[0], beyondFar[1], beyondFar[2], 5)), true);

  // Packed vec4 form dispatches identically.
  assert.equal(frustum.SphereTest(vec4.fromValues(anchor[0], anchor[1], anchor[2], 1)), TriFrustumTestResult.Inside);
});

test("TriFrustum.frustumCullingDisabled forces sphere visibility (debug setting)", () =>
{
  const { frustum, forward } = MakeFixture();
  const behind = vec3.scaleAndAdd(vec3.create(), EYE, forward, -50);
  const sphere = vec4.fromValues(behind[0], behind[1], behind[2], 1);
  assert.equal(frustum.IsSphereVisible(sphere), false);
  TriFrustum.frustumCullingDisabled = true;
  try
  {
    assert.equal(frustum.IsSphereVisible(sphere), true);
  }
  finally
  {
    TriFrustum.frustumCullingDisabled = false;
  }
});

// --- TriFrustumOrtho ---------------------------------------------------------

/** World->sun-view matrix with +z along dir (Carbon shadow convention). */
function BuildSunView(eye, dir, upHint)
{
  const z = vec3.normalize(vec3.create(), dir);
  const x = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), upHint, z));
  const y = vec3.cross(vec3.create(), z, x);
  const m = mat4.create();
  m[0] = x[0];
  m[4] = x[1];
  m[8] = x[2];
  m[1] = y[0];
  m[5] = y[1];
  m[9] = y[2];
  m[2] = z[0];
  m[6] = z[1];
  m[10] = z[2];
  m[12] = -vec3.dot(x, eye);
  m[13] = -vec3.dot(y, eye);
  m[14] = -vec3.dot(z, eye);
  return m;
}

const SUN_EYE = vec3.fromValues(-40, 200, 30);
const SUN_DIR = vec3.normalize(vec3.create(), vec3.fromValues(0.3, -1, 0.15));

function MakeOrtho(boundsMin = [-30, -20, 5], boundsMax = [40, 25, 300])
{
  const view = BuildSunView(SUN_EYE, SUN_DIR, [0, 0, 1]);
  const ortho = new TriFrustumOrtho();
  ortho.DeriveFrustum(view, boundsMin, boundsMax);
  return { view, ortho, boundsMin, boundsMax };
}

/** A world point at the given sun-view coordinates. */
function SunViewPoint(view, x, y, z)
{
  const inverse = mat4.invert(mat4.create(), view);
  return vec3.transformMat4(vec3.create(), [x, y, z], inverse);
}

test("TriFrustumOrtho sphere tests agree with a view-space AABB sampling oracle", () =>
{
  const { view, ortho, boundsMin, boundsMax } = MakeOrtho();

  const oracleInside = (worldPoint, ignoreFar) =>
  {
    const p = vec3.transformMat4(vec3.create(), worldPoint, view);
    for (let i = 0; i < 3; i++)
    {
      if (p[i] < boundsMin[i])
      {
        return false;
      }
      if (!(ignoreFar && i === 2) && p[i] > boundsMax[i])
      {
        return false;
      }
    }
    return true;
  };
  const sampleVisible = (center, radius, ignoreFar) =>
  {
    if (oracleInside(center, ignoreFar))
    {
      return true;
    }
    return DIRECTIONS.some(d => oracleInside([
      center[0] + d[0] * radius,
      center[1] + d[1] * radius,
      center[2] + d[2] * radius
    ], ignoreFar));
  };

  // Deep interior sphere.
  const inside = SunViewPoint(view, 5, 2, 100);
  assert.equal(ortho.IsSphereVisibleAndInsideNearPlane(inside, 3), true);
  assert.equal(ortho.IsSphereVisibleIgnoreFarPlane(inside, 3), true);
  assert.equal(ortho.SphereTestIgnoreFarPlane({ center: inside, radius: 3 }), TriFrustumTestResult.Inside);
  assert.equal(sampleVisible(inside, 3, true), true);

  // Beyond the far bound: rejected by the near-plane variant, accepted when
  // the far plane is ignored (the shadow-caster behind-the-view case).
  const beyondFar = SunViewPoint(view, 5, 2, 350);
  assert.equal(ortho.IsSphereVisibleAndInsideNearPlane(beyondFar, 10), false);
  assert.equal(ortho.IsSphereVisibleIgnoreFarPlane(beyondFar, 10), true);
  assert.equal(ortho.SphereTestIgnoreFarPlane({ center: beyondFar, radius: 10 }), TriFrustumTestResult.Inside);
  assert.equal(sampleVisible(beyondFar, 10, false), false);
  assert.equal(sampleVisible(beyondFar, 10, true), true);

  // Before the near bound (z < min.z) by more than the radius: outside both.
  const beforeNear = SunViewPoint(view, 5, 2, 2);
  assert.equal(ortho.IsSphereVisibleAndInsideNearPlane(beforeNear, 1), false);
  assert.equal(ortho.IsSphereVisibleIgnoreFarPlane(beforeNear, 1), false);
  assert.equal(ortho.SphereTestIgnoreFarPlane({ center: beforeNear, radius: 1 }), TriFrustumTestResult.Outside);
  assert.equal(sampleVisible(beforeNear, 0.9, true), false);

  // Straddling the near bound: visible, classified Intersect.
  const straddleNear = SunViewPoint(view, 5, 2, 4.5);
  assert.equal(ortho.IsSphereVisibleAndInsideNearPlane(straddleNear, 1), true);
  assert.equal(ortho.IsSphereVisibleIgnoreFarPlane(straddleNear, 1), true);
  assert.equal(ortho.SphereTestIgnoreFarPlane({ center: straddleNear, radius: 1 }), TriFrustumTestResult.Intersect);
  assert.equal(sampleVisible(straddleNear, 1, true), true);

  // Outside +x beyond the radius (corner distance in x alone).
  const outsideX = SunViewPoint(view, boundsMax[0] + 5, 2, 100);
  assert.equal(ortho.IsSphereVisibleAndInsideNearPlane(outsideX, 3), false);
  assert.equal(ortho.IsSphereVisibleIgnoreFarPlane(outsideX, 3), false);
  assert.equal(sampleVisible(outsideX, 3, true), false);
  // ...but a radius covering the gap straddles back in.
  assert.equal(ortho.IsSphereVisibleIgnoreFarPlane(outsideX, 7), true);
  assert.equal(ortho.SphereTestIgnoreFarPlane({ center: outsideX, radius: 7 }), TriFrustumTestResult.Intersect);
  assert.equal(sampleVisible(outsideX, 7, true), true);

  // Packed vec4 dispatch.
  const packed = vec4.fromValues(inside[0], inside[1], inside[2], 3);
  assert.equal(ortho.IsSphereVisibleAndInsideNearPlane(packed), true);
  assert.equal(ortho.IsSphereVisibleIgnoreFarPlane(packed), true);
  assert.equal(ortho.SphereTestIgnoreFarPlane(packed), TriFrustumTestResult.Inside);
});

test("TriFrustumOrtho.GetPixelSize and GetEyePos", () =>
{
  const { view, ortho, boundsMin, boundsMax } = MakeOrtho();
  const width = boundsMax[0] - boundsMin[0];
  const height = boundsMax[1] - boundsMin[1];
  const sphere = vec4.fromValues(0, 0, 0, 7);
  const expected = Math.max((14 / width), (14 / height)) * 1024;
  assert.ok(Math.abs(ortho.GetPixelSize(sphere, 1024) - expected) < 1e-9);

  const eyePos = ortho.GetEyePos();
  assert.deepEqual(Array.from(eyePos), [view[12], view[13], view[14]]);
});

// --- Shadow-frustum adapters -------------------------------------------------

test("TriShadowOrthoFrustum culls with the ortho frustum and the sun-facing camera planes", () =>
{
  const camera = MakeFixture();
  // Huge ortho bounds so only the camera-plane logic decides the cull cases.
  const { ortho } = MakeOrtho([-2000, -2000, -2000], [2000, 2000, 2000]);
  const shadow = new TriShadowOrthoFrustum(ortho, 2048, SUN_DIR);

  // Interior sphere: visible in the shadow.
  const anchor = vec3.scaleAndAdd(vec3.create(), EYE, camera.forward, 60);
  const anchorSphere = vec4.fromValues(anchor[0], anchor[1], anchor[2], 5);
  assert.equal(shadow.IsVisible(camera.frustum, anchorSphere), true);
  assert.equal(shadow.SphereTest(camera.frustum, { center: anchor, radius: 5 }), TriFrustumTestResult.Inside);

  // Sphere fully outside a tight ortho frustum: invisible regardless of camera.
  const { ortho: tightOrtho } = MakeOrtho();
  const tightShadow = new TriShadowOrthoFrustum(tightOrtho, 2048, SUN_DIR);
  const outsideOrtho = SunViewPoint(BuildSunView(SUN_EYE, SUN_DIR, [0, 0, 1]), 500, 500, 100);
  const outsideSphere = vec4.fromValues(outsideOrtho[0], outsideOrtho[1], outsideOrtho[2], 5);
  assert.equal(tightShadow.IsVisible(camera.frustum, outsideSphere), false);
  assert.equal(tightShadow.SphereTest(camera.frustum, { center: outsideOrtho, radius: 5 }), TriFrustumTestResult.Outside);

  // Sun-dependent camera-plane cull: pick a camera plane, push the sphere
  // fully behind it (inside the huge ortho). With a sun direction opposing the
  // plane normal (DotNormal < 0) the caster is culled; with the sun along the
  // normal it must be kept (its shadow can still reach the frustum).
  const plane = camera.frustum.planes[TriFrustum.PLANE_LEFT];
  const n = [plane[0], plane[1], plane[2]];
  const dist = plane[0] * anchor[0] + plane[1] * anchor[1] + plane[2] * anchor[2] + plane[3];
  const radius = 5;
  const behindLeft = [
    anchor[0] - n[0] * (dist + radius + 1),
    anchor[1] - n[1] * (dist + radius + 1),
    anchor[2] - n[2] * (dist + radius + 1)
  ];
  const behindSphere = vec4.fromValues(behindLeft[0], behindLeft[1], behindLeft[2], radius);

  const sunOpposing = new TriShadowOrthoFrustum(ortho, 2048, [-n[0], -n[1], -n[2]]);
  assert.equal(sunOpposing.IsVisible(camera.frustum, behindSphere), false,
    "behind an away-facing camera plane: culled");
  assert.equal(sunOpposing.SphereTest(camera.frustum, { center: behindLeft, radius }), TriFrustumTestResult.Outside);

  const sunAligned = new TriShadowOrthoFrustum(ortho, 2048, [n[0], n[1], n[2]]);
  assert.equal(sunAligned.IsVisible(camera.frustum, behindSphere), true,
    "sun along the plane normal (DotNormal >= 0): kept");

  // Straddling that camera plane demotes the classification to Intersect.
  const straddleCenter = [
    anchor[0] - n[0] * (dist + radius - 1),
    anchor[1] - n[1] * (dist + radius - 1),
    anchor[2] - n[2] * (dist + radius - 1)
  ];
  assert.equal(
    sunOpposing.SphereTest(camera.frustum, { center: straddleCenter, radius }),
    TriFrustumTestResult.Intersect
  );

  // Size and eye position delegate to the ortho frustum.
  assert.equal(shadow.GetSizeInShadow(anchorSphere), ortho.GetPixelSize(anchorSphere, 2048));
  assert.deepEqual(Array.from(shadow.GetEyePos()), Array.from(ortho.GetEyePos()));
});

test("TriShadowFrustum delegates to its perspective shadow frustum", () =>
{
  const camera = MakeFixture();

  // Light camera at a different asymmetric pose.
  const lightEye = vec3.fromValues(120, 80, -40);
  const lightView = mat4.lookAt(mat4.create(), lightEye, [10, 2, 4], [0, 1, 0]);
  const lightProjection = mat4.perspectiveZO(mat4.create(), 1.1, 1, 1, 800);
  const lightViewport = new TriViewport();
  lightViewport.__init__(0, 0, 1024, 1024);
  const lightFrustum = new TriFrustum();
  lightFrustum.DeriveFrustum(lightView, lightEye, lightProjection, lightViewport);

  const shadow = new TriShadowFrustum(lightFrustum);

  const target = vec3.fromValues(10, 2, 4);
  const targetSphere = vec4.fromValues(target[0], target[1], target[2], 5);
  assert.equal(shadow.IsVisible(camera.frustum, targetSphere), true);

  const behindLight = vec3.scaleAndAdd(
    vec3.create(),
    lightEye,
    vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), target, lightEye)),
    -50
  );
  const behindSphere = vec4.fromValues(behindLight[0], behindLight[1], behindLight[2], 5);
  assert.equal(shadow.IsVisible(camera.frustum, behindSphere), false, "camera frustum is ignored (Carbon TODO parity)");
  assert.equal(shadow.SphereTest(camera.frustum, { center: behindLight, radius: 5 }), TriFrustumTestResult.Outside);
  assert.equal(shadow.SphereTest(camera.frustum, { center: target, radius: 5 }), lightFrustum.SphereTest({ center: target, radius: 5 }));

  assert.equal(shadow.GetSizeInShadow(targetSphere), lightFrustum.GetPixelSizeAccross(targetSphere));
  assert.equal(shadow.GetEyePos(), lightFrustum.viewPos);
});

// --- EveUpdateContext getter/setter surface ---------------------------------

test("EveUpdateContext getter/setter surface and the invLodFactor invariant", () =>
{
  const context = new EveUpdateContext();

  context.SetLodFactor(4);
  assert.equal(context.GetLodFactor(), 4);
  assert.equal(context.GetInvLodFactor(), 0.25);
  assert.equal(context.invLodFactor, 0.25);
  context.SetLodFactor(0.5);
  assert.equal(context.GetInvLodFactor(), 2);

  context.SetVisibilityThreshold(3.5);
  assert.equal(context.GetVisibilityThreshold(), 3.5);
  context.SetHighDetailThreshold(300);
  assert.equal(context.GetHighDetailThreshold(), 300);
  context.SetMediumDetailThreshold(150);
  assert.equal(context.GetMediumDetailThreshold(), 150);
  context.SetLowDetailThreshold(30);
  assert.equal(context.GetLowDetailThreshold(), 30);

  const frustum = new TriFrustum();
  context.SetFrustum(frustum);
  assert.equal(context.GetFrustum(), frustum);
  context.SetFrustum(null);
  assert.equal(context.GetFrustum(), null);

  assert.equal(context.GetBallpark(), null);
  const taskGroup = {};
  context.SetTaskGroup(taskGroup);
  assert.equal(context.GetTaskGroup(), taskGroup);
  const manager = {};
  context.SetDataTextureManager(manager);
  assert.equal(context.GetDataTextureManager(), manager);
  const gpuParticles = {};
  context.SetGpuParticleSystem(gpuParticles);
  assert.equal(context.GetGpuParticleSystem(), gpuParticles);
});

// --- EveLODHelper end-to-end -------------------------------------------------

test("EveLODHelper.MergeLOD works end-to-end through a real context and derived frustum", () =>
{
  const { frustum, forward } = MakeFixture();
  const context = new EveUpdateContext();
  context.SetFrustum(frustum);

  const center = vec3.scaleAndAdd(vec3.create(), EYE, forward, 80);
  const sphere = vec4.fromValues(center[0], center[1], center[2], 10);
  const pixels = frustum.GetPixelSizeAccross(sphere);
  assert.ok(pixels > 0 && Number.isFinite(pixels));

  // Thresholds bracketed around the measured size drive the LOD choice.
  context.SetMediumDetailThreshold(pixels * 0.9);
  context.SetLowDetailThreshold(pixels * 0.5);
  assert.equal(EveLODHelper.MergeLOD(Tr2Lod.TR2_LOD_UNSPECIFIED, sphere, context), Tr2Lod.TR2_LOD_HIGH);

  context.SetMediumDetailThreshold(pixels * 1.1);
  assert.equal(EveLODHelper.MergeLOD(Tr2Lod.TR2_LOD_UNSPECIFIED, sphere, context), Tr2Lod.TR2_LOD_MEDIUM);

  context.SetLowDetailThreshold(pixels * 1.1);
  assert.equal(EveLODHelper.MergeLOD(Tr2Lod.TR2_LOD_UNSPECIFIED, sphere, context), Tr2Lod.TR2_LOD_LOW);

  // Merge keeps the higher of the two LODs.
  assert.equal(EveLODHelper.MergeLOD(Tr2Lod.TR2_LOD_ULTRA, sphere, context), Tr2Lod.TR2_LOD_ULTRA);

  // Outside the frustum: unspecified.
  const behind = vec3.scaleAndAdd(vec3.create(), EYE, forward, -50);
  const behindSphere = vec4.fromValues(behind[0], behind[1], behind[2], 1);
  assert.equal(EveLODHelper.MergeLOD(Tr2Lod.TR2_LOD_HIGH, behindSphere, context), Tr2Lod.TR2_LOD_UNSPECIFIED);
});
