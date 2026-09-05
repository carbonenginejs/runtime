// The scene-drive visibility shells: EvePlanet.UpdateZOnlyVisibility
// (EvePlanet.cpp:133-139) + the EveEffectRoot2.GetWorldTransform accessor,
// EveLensflare.UpdateVisibility (EveLensflare.cpp:298-311), and the
// EveSceneStaticParticles renderable surface (EveSceneStaticParticles.cpp:
// 90-174, PARTICLE_CLUSTER_MIN_SIZE cpp:14).
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import {
  EveLensflare,
  EvePlanet,
  EveSceneStaticParticles,
  Tr2Lod,
  TriRenderBatchAccumulator
} from "../../npm/dist/trinity/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";

function makeAccumulator()
{
  return new TriRenderBatchAccumulator().SetTriPoolAllocator(makePerObjectStore());
}


const EPSILON = 1e-5;

function assertClose(actual, expected, message, epsilon = EPSILON)
{
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${message}: expected ${expected}, got ${actual}`
  );
}

test("EvePlanet.UpdateZOnlyVisibility forwards the unscaled world transform and LOD, with no gates (EvePlanet.cpp:133-139)", () =>
{
  const planet = new EvePlanet();
  const calls = [];
  planet.zOnlyModel = {
    UpdateVisibility: (...args) => calls.push(args)
  };

  // No display/update gate: Carbon calls unconditionally from the scene loop.
  planet.display = false;
  const context = {};
  planet.UpdateZOnlyVisibility(context);
  assert.equal(calls.length, 1, "no gates - always forwarded");
  assert.equal(calls[0][0], context, "context threaded");
  assert.ok(mat4.equals(calls[0][1], mat4.create()), "unscaled world transform (identity before curves run)");
  assert.equal(calls[0][2], Tr2Lod.TR2_LOD_HIGH, "planet LOD defaults HIGH");

  // Null model is the only implicit gate (cpp:135).
  planet.zOnlyModel = null;
  planet.UpdateZOnlyVisibility(context);
  assert.equal(calls.length, 1, "null model no-ops");
});

test("EveLensflare.UpdateVisibility: >= 0 dot test, first-frame zero direction visible, flare fan-out (EveLensflare.cpp:298-311)", () =>
{
  const lensflare = new EveLensflare();
  const flareCalls = [];
  lensflare.flares.push({ UpdateVisibility: (...args) => flareCalls.push(args) });

  const MakeContext = viewDir => ({ GetFrustum: () => ({ viewDir }) });

  // First frame: direction is zero, dot = 0, and >= 0 counts as VISIBLE.
  // No display gate - runs even when hidden (the gate lives in GetRenderables).
  lensflare.display = false;
  lensflare.UpdateVisibility(MakeContext([0, 0, 1]));
  assert.equal(lensflare.isVisible, true, "zero direction dots to 0 -> visible");
  assert.equal(flareCalls.length, 1, "flares updated regardless");
  assert.equal(flareCalls[0][1], lensflare.transform, "lensflare transform is the flare parent");

  vec3.set(lensflare.direction, 0, 0, -1);
  lensflare.UpdateVisibility(MakeContext([0, 0, 1]));
  assert.equal(lensflare.isVisible, false, "opposed direction -> hidden");

  vec3.set(lensflare.direction, 1, 0, 0);
  lensflare.UpdateVisibility(MakeContext([0, 0, 1]));
  assert.equal(lensflare.isVisible, true, "perpendicular sun (dot exactly 0) IS visible");
});

test("EveSceneStaticParticles.Update: camera-relative world matrix from the double-precision offset (cpp:90-105)", () =>
{
  const particles = new EveSceneStaticParticles();
  particles.clusters.push({});
  particles.mesh = {};
  particles.centerOfClusters.set([1000, 2000, 3000]);
  particles.boundingSphere.set([10, 0, 0, 50]);

  mat4.fromTranslation(particles.worldMatrix, [7, 7, 7]);
  particles.Update({ GetOrigin: () => new Float64Array([999, 1998, 2997]) });

  assertClose(particles.worldMatrix[12], 1, "offset x");
  assertClose(particles.worldMatrix[13], 2, "offset y");
  assertClose(particles.worldMatrix[14], 3, "offset z");
  assertClose(particles.lastWorldMatrix[12], 7, "previous matrix stashed first");
  // center = TransformCoord(sphere.xyz, worldMatrix).
  assertClose(particles.center[0], 11, "world center x");
  assertClose(particles.center[1], 2, "world center y");

  // The triple early-out leaves everything untouched (cpp:93-96).
  particles.mesh = null;
  particles.Update({ GetOrigin: () => new Float64Array([0, 0, 0]) });
  assertClose(particles.worldMatrix[12], 1, "gated Update leaves the matrix");
});

test("EveSceneStaticParticles.UpdateVisibility: local-sphere pixel size, inside-sphere bypass, strict > gate (cpp:107-123)", () =>
{
  const particles = new EveSceneStaticParticles();
  particles.clusters.push({});
  particles.mesh = {};
  particles.boundingSphere.set([0, 0, 0, 100]);
  vec3.set(particles.center, 5000, 0, 0);

  const seenSpheres = [];
  const MakeContext = ({ pixelSize, lodFactor = 1, viewPos = [0, 0, 0], sphereVisible = true, lowQuality = false }) => ({
    lowQuality,
    GetLodFactor: () => lodFactor,
    GetFrustum: () => ({
      viewPos,
      GetPixelSizeAccross: sphere => (seenSpheres.push(Array.from(sphere)), pixelSize),
      IsSphereVisible: () => sphereVisible
    })
  });

  // Pixel size measured on the UNTRANSLATED LOCAL sphere (cpp:117), while the
  // frustum/inside tests use the world center - preserved asymmetry.
  particles.UpdateVisibility(MakeContext({ pixelSize: 250, lodFactor: 2 }));
  assert.equal(particles.visible, true, "250 > 100 * 2");
  assertClose(seenSpheres[0][0], 0, "pixel size uses the LOCAL sphere center");
  assertClose(particles.estimatedSize, 250, "estimatedSize stamped for GetBatches");

  particles.UpdateVisibility(MakeContext({ pixelSize: 200, lodFactor: 2 }));
  assert.equal(particles.visible, false, "strict >: 200 is NOT > 200");

  // Camera inside the cluster sphere bypasses BOTH the frustum test and the
  // size gate (cpp:120-122).
  particles.UpdateVisibility(MakeContext({ pixelSize: 1, viewPos: [4950, 0, 0], sphereVisible: false }));
  assert.equal(particles.visible, true, "inside-sphere bypass");

  // Low quality drops the system the same frame and skips the estimator.
  particles.UpdateVisibility(MakeContext({ pixelSize: 999, lowQuality: true }));
  assert.equal(particles.visible, false, "low-quality drop");
});

test("EveSceneStaticParticles.GetRenderables pushes itself iff visible; the frustum arg is unused (cpp:129-135)", () =>
{
  const particles = new EveSceneStaticParticles();
  const out = [];
  assert.equal(particles.GetRenderables(undefined, out), out, "returns the out list");
  assert.equal(out.length, 0, "invisible pushes nothing");
  particles.visible = true;
  particles.GetRenderables(undefined, out);
  assert.deepEqual(out, [particles], "the object itself IS the renderable");
});

test("EveSceneStaticParticles renderable surface: batches, shadow no-op, per-object matrices (cpp:137-168)", () =>
{
  const particles = new EveSceneStaticParticles();
  assert.equal(particles.Initialize(), true);
  particles.estimatedSize = 123;
  const calls = [];
  // The mesh fake needs GetAreas as well as GetBatches: EveSceneStaticParticles
  // resolves the areas from the batch type before delegating (cpp:137-140), and
  // it no longer hedges that call because Tr2MeshBase declares the method.
  particles.mesh = {
    GetAreas: () => null,
    GetBatches: (...args) => (calls.push(args), true)
  };
  assert.equal(particles.GetBatches({}, 0, null, 0), true, "delegates to the mesh");
  assertClose(calls[0][3], 123, "estimatedSize is the LOD screen size (cpp:139)");

  assert.equal(particles.GetShadowBatches({}, null, 1), false, "never casts shadows (cpp:142-145)");
  assert.equal(particles.HasTransparentBatches(), false, "opaque only (cpp:160-163)");
  assert.equal(particles.GetSortValue(), 0, "sort value 0 (cpp:165-168)");

  mat4.fromTranslation(particles.worldMatrix, [1, 2, 3]);
  mat4.fromTranslation(particles.lastWorldMatrix, [4, 5, 6]);
  const data = particles.GetPerObjectData(makeAccumulator());
  // The store transposes on Set: logical translation [12..14] lands at [3],[7],[11].
  const world = new Float32Array(16);
  const lastWorld = new Float32Array(16);
  data.Copy("world", world);
  data.Copy("lastWorld", lastWorld);
  assertClose(world[3], 1, "transposed world");
  assertClose(lastWorld[7], 5, "transposed lastWorld");
  assert.equal(particles.GetPerObjectData({ Alloc: () => null }), null);
});

test("EveSceneStaticParticles publishes and renders Carbon's bounding-sphere debug option", () =>
{
  const particles = new EveSceneStaticParticles();
  particles.boundingSphere.set([1, 2, 3, 4]);
  mat4.fromTranslation(particles.worldMatrix, [10, 20, 30]);

  const options = particles.GetDebugOptions();
  assert.deepEqual([...options], ["Bounding Sphere"]);

  const calls = [];
  const renderer = {
    HasOption: (owner, option) => owner === particles && option === "Bounding Sphere",
    DrawSphere: (...args) => calls.push(args),
  };
  particles.RenderDebugInfo(renderer);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], particles);
  assert.deepEqual(Array.from(calls[0][1]), [11, 22, 33]);
  assert.deepEqual(calls[0].slice(2), [4, 10, 0, 0xffffff00]);

  calls.length = 0;
  particles.RenderDebugInfo({ ...renderer, HasOption: () => false });
  assert.equal(calls.length, 0);
});
