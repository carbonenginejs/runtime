import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { EveSpaceObjectDecal, IEveSpaceObject2ParentData } from "../../npm/dist/trinity/index.js";
import { TriFrustum } from "../../npm/dist/trinity/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";


test("EveSpaceObjectDecal fills the Carbon { vs, ps } per-object composite (cpp:346-386)", () =>
{
  const decal = new EveSpaceObjectDecal();
  decal.position.set([1, 2, 3]);
  decal.Initialize();

  // Carbon copies the parent state inside UpdateVisibility (cpp:145/178).
  const parent = new IEveSpaceObject2ParentData();
  mat4.fromTranslation(parent.transform, [10, 20, 30]);
  parent.killCount = 4;
  parent.shipData.set([0.5, 0.6, 0.7, 0.8]);
  parent.clipSphereCenter.set([1, 2, 3]);
  parent.clipRadiusSq = 9;
  parent.clipRadius2Sq = 16;
  parent.shLighting = new Float32Array(28).fill(2);
  decal.decalEffect = {};
  assert.equal(decal.UpdateVisibility({}, parent), true);

  const store = makePerObjectStore();
  const pod = decal.GetPerObjectData({ Alloc: name => store.Alloc(name) });

  assert.deepEqual([...pod.vs.GetLayout().stages], ["vs"], "vs half binds the vertex slot");
  assert.deepEqual([...pod.ps.GetLayout().stages], ["ps"], "ps half binds the pixel slot");

  // worldMatrix is Transpose(parentData.transform): translation moves to [3],[7],[11].
  const world = pod.vs.Copy("worldMatrix", new Float32Array(16));
  assert.deepEqual([world[3], world[7], world[11]], [10, 20, 30], "world transposed");

  // invWorldMatrix is the inverse of the ALREADY-transposed world (cpp:358).
  const invWorld = pod.vs.Copy("invWorldMatrix", new Float32Array(16));
  assert.deepEqual([invWorld[3], invWorld[7], invWorld[11]], [-10, -20, -30], "inverse of the transposed world");

  // displayData packs killCount (uint widened to float) and the visibility ramp.
  const displayData = pod.ps.Copy("displayData", new Float32Array(4));
  assert.deepEqual(Array.from(displayData), [4, 1, 0, 0], "displayData = (killCount, isVisible, 0, 0)");

  // clipData packs the clip sphere centre with radius squared in w.
  const clipData = pod.ps.Copy("clipData", new Float32Array(4));
  assert.deepEqual(Array.from(clipData), [1, 2, 3, 9], "clipData = (clipSphereCenter, clipRadiusSq)");
  assert.equal(pod.ps.Copy("clipRadius2Sq", new Float32Array(1))[0], 16);

  // All seven packed SH coefficients are copied from the parent.
  const coefficients = pod.ps.Copy("shLightingCoefficients", new Float32Array(28));
  assert.ok(coefficients.every(value => value === 2), "seven coefficients copied");
});

test("EveSpaceObjectDecal zeroes the SH block when the parent supplies none (cpp:382)", () =>
{
  const decal = new EveSpaceObjectDecal();
  const store = makePerObjectStore();

  // Dirty the arena so the zero-fill is provably the decal's own work.
  const first = store.Alloc("DecalPSPerObjectData");
  first.Set("shLightingCoefficients", new Float32Array(28).fill(7));
  store.Reset();

  const parent = new IEveSpaceObject2ParentData();
  parent.shLighting = null;
  decal.decalEffect = {};
  decal.UpdateVisibility({}, parent);

  const pod = decal.GetPerObjectData({ Alloc: name => store.Alloc(name) });
  const coefficients = pod.ps.Copy("shLightingCoefficients", new Float32Array(28));
  assert.ok(coefficients.every(value => value === 0), "null shLighting zeroes the whole block");
});

test("EveSpaceObjectDecal expands the parent bone and reports its Carbon render constants", () =>
{
  const decal = new EveSpaceObjectDecal();
  assert.equal(decal.HasTransparentBatches(), true, "cpp:241-244");
  assert.equal(decal.GetSortValue(), 1, "cpp:337-340");
  assert.equal(decal.GetID(7), decal, "inline GetID returns the object (h:113-116)");

  // parentBoneIndex -1 keeps the identity bone (cpp:484-487).
  assert.equal(decal.SetBoneMatrix([new Float32Array(12)], 1), false);

  // Float4x3 is column-stride: packed rows are (v0,v4,v8,v12) of the logical
  // matrix, so a translation lands in the packed w lanes.
  decal.parentBoneIndex = 0;
  const packed = new Float32Array([1, 0, 0, 5, 0, 1, 0, 6, 0, 0, 1, 7]);
  assert.equal(decal.SetBoneMatrix([packed], 1), true);

  const store = makePerObjectStore();
  decal.decalEffect = {};
  decal.UpdateVisibility({}, new IEveSpaceObject2ParentData());
  const pod = decal.GetPerObjectData({ Alloc: name => store.Alloc(name) });
  const bone = pod.vs.Copy("parentBoneMatrix", new Float32Array(16));
  assert.deepEqual([bone[3], bone[7], bone[11]], [5, 6, 7], "bone translation expanded then transposed");

  // Out-of-range index is refused (cpp:478-481).
  decal.parentBoneIndex = 5;
  assert.equal(decal.SetBoneMatrix([packed], 1), false);
});

// A frustum looking down -Z from the origin, wide enough that pixel size is
// driven by distance rather than by clipping.
function MakeFrustum(viewportWidth = 1024)
{
  const frustum = new TriFrustum();
  const view = mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, -1], [0, 1, 0]);
  const projection = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 10000);
  frustum.DeriveFrustum(view, [0, 0, 0], projection, { width: viewportWidth, height: viewportWidth });
  return frustum;
}

test("EveSpaceObjectDecal.UpdateVisibility gates on display and effect, and skips LOD without a minimum (cpp:119-176)", () =>
{
  const decal = new EveSpaceObjectDecal();
  const parent = new IEveSpaceObject2ParentData();
  parent.killCount = 9;

  // No effect: culled, and the parent data is NOT copied (Carbon leaves it stale).
  assert.equal(decal.UpdateVisibility({}, parent), false);
  assert.equal(decal.GetVisibility(), 0);

  decal.decalEffect = {};
  decal.display = false;
  assert.equal(decal.UpdateVisibility({}, parent), false, "display gate");

  // minScreenSize 0 means no LOD at all: fully visible, no frustum needed.
  decal.display = true;
  assert.equal(decal.UpdateVisibility({}, parent), true);
  assert.equal(decal.GetVisibility(), 1, "no authored minimum means always visible");
});

test("EveSpaceObjectDecal.UpdateVisibility fades linearly above the minimum screen size", () =>
{
  const frustum = MakeFrustum();
  const updateContext = { GetFrustum: () => frustum, GetLodFactor: () => 1 };
  const parent = new IEveSpaceObject2ParentData();

  const VisibilityAt = (distance, minScreenSize, lodFactor = 1) =>
  {
    const decal = new EveSpaceObjectDecal();
    decal.decalEffect = {};
    decal.minScreenSize = minScreenSize;
    decal.Initialize();
    mat4.fromTranslation(parent.transform, [0, 0, -distance]);
    decal.UpdateVisibility({ ...updateContext, GetLodFactor: () => lodFactor }, parent);
    return decal.GetVisibility();
  };

  // Far away: below the minimum, culled outright.
  assert.equal(VisibilityAt(4000, 20), 0, "below the minimum is culled");

  // Close in: saturated at 1.
  assert.equal(VisibilityAt(50, 20), 1, "well above the minimum saturates");

  // The ramp spans [minScreen, minScreen * 1.5] and is monotonic in distance.
  // The decal box is the unit cube, so its circumscribing sphere has radius
  // sqrt(12)/2; against this frustum that puts the 20..30px ramp window at
  // roughly 59..89 units, giving 0.535 at 70 and 0.218 at 80.
  const near = VisibilityAt(70, 20);
  const far = VisibilityAt(80, 20);
  assert.ok(Math.abs(near - 0.535) < 1e-2, `ramp value at 70 units (${near})`);
  assert.ok(Math.abs(far - 0.218) < 1e-2, `ramp value at 80 units (${far})`);
  assert.ok(near > far, "closer fades in more");

  // lodFactor scales the THRESHOLD, so raising it lods out what was visible.
  assert.ok(VisibilityAt(70, 20, 1) > 0, "visible at factor 1");
  assert.equal(VisibilityAt(70, 20, 4), 0, "raising the lod factor lods it out");
});

test("EveSpaceObjectDecal.UpdateVisibility leaves parent data stale on a cull (cpp:123, 150, 168)", () =>
{
  const frustum = MakeFrustum();
  const decal = new EveSpaceObjectDecal();
  decal.decalEffect = {};
  decal.Initialize();

  const accepted = new IEveSpaceObject2ParentData();
  accepted.killCount = 7;
  assert.equal(decal.UpdateVisibility({}, accepted), true);

  // Now authored with a minimum and pushed far away so it culls.
  decal.minScreenSize = 50;
  const rejected = new IEveSpaceObject2ParentData();
  rejected.killCount = 99;
  mat4.fromTranslation(rejected.transform, [0, 0, -9000]);
  assert.equal(
    decal.UpdateVisibility({ GetFrustum: () => frustum, GetLodFactor: () => 1 }, rejected),
    false
  );

  // The fill still carries the ACCEPTED parent's killCount, not the rejected one.
  const store = makePerObjectStore();
  const pod = decal.GetPerObjectData({ Alloc: name => store.Alloc(name) });
  const displayData = pod.ps.Copy("displayData", new Float32Array(4));
  assert.equal(displayData[0], 7, "stale parent data is retained across a cull");
  assert.equal(displayData[1], 0, "visibility is cleared");
});


/** A decal made visible the way UpdateVisibility does, with an effect bound. */
function visibleDecal()
{
  const decal = new EveSpaceObjectDecal();

  decal.decalEffect = {};
  decal.Initialize();
  assert.equal(decal.UpdateVisibility({}, new IEveSpaceObject2ParentData()), true);

  return decal;
}

/** A hull geometry resource of the shape GetRenderables reads. */
const hullOf = (lodMask = 1, lodCount = 1) => ({
  GetMeshData: () => ({ lodMask, lods: Array.from({ length: lodCount }, () => ({})) }),
  GetLodIndexForScreenSize: () => 0
});

test("EveSpaceObjectDecal.GetRenderables adds itself once its geometry is built (cpp:182-225)", () =>
{
  // The decal is a RENDERABLE: it puts itself in the list and is asked for
  // batches later, which is why the build happens here.
  const decal = visibleDecal();

  decal.SetIndices([ [ 0, 1, 2 ] ]);

  const out = [];

  assert.equal(decal.GetRenderables(out, null, hullOf(), 100), true);
  assert.deepEqual(out, [ decal ]);
});

test("a culled decal contributes no renderable", () =>
{
  // UpdateVisibility was never accepted, so m_isVisible is still zero.
  const decal = new EveSpaceObjectDecal();

  decal.Initialize();
  decal.SetIndices([ [ 0, 1, 2 ] ]);

  const out = [];

  assert.equal(decal.GetRenderables(out, null, hullOf(), 100), false);
  assert.equal(out.length, 0);
});

test("no geometry resource yields no renderable rather than throwing", () =>
{
  // The ordinary first frame: the hull has not arrived.
  const decal = visibleDecal();

  decal.SetIndices([ [ 0, 1, 2 ] ]);

  assert.equal(decal.GetRenderables([], null, null, 100), false);
});

test("a decal whose LOD carries no triangles is not submitted", () =>
{
  // Carbon judges this on the primitive COUNT, not on the buffer, because a
  // LOD the decal does not reach is recorded with a start index and zero
  // primitives.
  const decal = visibleDecal();

  decal.SetIndices([ [] ]);

  assert.equal(decal.GetRenderables([], null, hullOf(), 100), false);
});

test("the static index lists are preferred over selecting triangles", () =>
{
  // Every decal on a shipped hull arrives with them, and Carbon checks for
  // them first (cpp:196-207). Selection would need vertex positions, which
  // this hull deliberately does not supply - so reaching it would throw or
  // select nothing, and the decal drawing proves the static path ran.
  const decal = visibleDecal();

  decal.SetIndices([ [ 5, 6, 7 ] ]);

  assert.equal(decal.GetRenderables([], null, hullOf(), 100), true);
});

test("a new hull invalidates the built geometry rather than reusing it", () =>
{
  // Carbon's own comment calls the rebuild slow and to be avoided, which is why
  // it keys on resource IDENTITY. Observed through the result rather than by
  // counting GetMeshData calls: Carbon reads the mesh every frame to compare
  // lod masks, so that call count says nothing about whether a build happened.
  const decal = visibleDecal();

  decal.SetIndices([ [ 0, 1, 2 ] ]);

  const good = hullOf();

  assert.equal(decal.GetRenderables([], null, good, 100), true);
  assert.equal(decal.GetRenderables([], null, good, 100), true, "the same hull keeps working");

  // A hull with no mesh data at all. If the old build were kept, this would
  // still report true.
  const empty = { GetMeshData: () => null, GetLodIndexForScreenSize: () => 0 };

  assert.equal(decal.GetRenderables([], null, empty, 100), false, "a new hull discards the old build");
});

test("a changed LOD mask rebuilds against the same hull", () =>
{
  // Carbon compares the mesh's lodMask with the built geometry's and rebuilds
  // when they differ, because a LOD arriving late changes what exists.
  const decal = visibleDecal();

  decal.SetIndices([ [ 0, 1, 2 ] ]);

  let mask = 1;
  const shifting = {
    GetMeshData: () => ({ lodMask: mask, lods: mask === 1 ? [ {} ] : [] }),
    GetLodIndexForScreenSize: () => 0
  };

  assert.equal(decal.GetRenderables([], null, shifting, 100), true);

  mask = 2;

  assert.equal(decal.GetRenderables([], null, shifting, 100), false, "the mask change forced a rebuild");
});

test("SetHighDetailDecalState pins the decal to LOD zero (cpp:514-517)", () =>
{
  const decal = visibleDecal();

  decal.SetIndices([ [ 0, 1, 2 ], [] ]);

  // Unfrozen, the hull picks LOD 1, which carries no triangles.
  const hull = {
    GetMeshData: () => ({ lodMask: 1, lods: [ {}, {} ] }),
    GetLodIndexForScreenSize: () => 1
  };

  assert.equal(decal.GetRenderables([], null, hull, 100), false);

  decal.SetHighDetailDecalState(true);

  assert.equal(decal.GetRenderables([], null, hull, 100), true, "frozen ignores the screen size");
});
