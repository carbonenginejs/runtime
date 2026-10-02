import assert from "node:assert/strict";
import { test } from "node:test";

import { TriStorageFlags } from "../../../npm/dist/global/consts/graphics/index.js";
import { CjsMotherLode } from "../../../npm/dist/global/blue/CjsMotherLode.js";
import { CjsResource } from "../../../npm/dist/global/blue/CjsResource.js";
import { TriGeometryRes } from "../../../npm/dist/resource/geometry/index.js";

// One triangle is enough: the raycaster only has to build, not hit anything.
function loadedGeometry()
{
  const res = new TriGeometryRes();
  res.Initialize("res:/model/test.cmf");
  res.SetPayload({
    meshes: [ {
      name: "mesh",
      lods: [ {
        vertexCount: 3,
        primitiveCount: 1,
        positions: new Float32Array([ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]),
        indices: new Uint16Array([ 0, 1, 2 ]),
        areas: [ { name: "area", firstIndex: 0, primitiveCount: 1 } ]
      } ]
    } ]
  });
  res.MarkPrepared();
  return res;
}

test("releasing the payload takes the raycaster with it", () =>
{
  // TriGeometryRes.cpp:496-509 drops the meshes and the raycast geometry
  // together; a payload-only release must not leave one behind.
  const res = loadedGeometry();
  res.PrepareRayCaster();
  assert.equal(res.IsRayCasterReady(), true);

  res.ReleasePayload();

  assert.equal(res.HasPayload(), false);
  assert.equal(res.IsRayCasterReady(), false);
});

test("an open session sees a destroyed raycaster as a preparation failure", () =>
{
  // cpp:1597-1603 - "ReleaseResources destroyed our bvh :(". The session count
  // is untouched, so the open session learns about it here.
  const res = loadedGeometry();
  res.PrepareRayCaster();
  assert.equal(res.HasRayCasterPreparationFailed(), false);

  res.DestroyRayCaster();

  assert.equal(res.HasRayCasterPreparationFailed(), true);
  // The session is still open, so it still closes exactly once.
  res.ResetRayCaster();
  assert.equal(res.HasRayCasterPreparationFailed(), false);
});

test("ReleaseResources honours Carbon's storage mask", () =>
{
  // cpp:496-509 gates the whole body on TRISTORAGE_MANAGEDMEMORY.
  const kept = loadedGeometry();
  kept.ReleaseResources(TriStorageFlags.TRISTORAGE_VIDEOMEMORY);
  assert.equal(kept.HasPayload(), true);
  assert.equal(kept.IsPrepared(), true);

  const released = loadedGeometry();
  released.ReleaseResources();
  assert.equal(released.HasPayload(), false);
  assert.equal(released.IsGood(), false, "TriGeometryRes.cpp:507-508 clears both prepared and good");
  assert.equal(released.state, CjsResource.State.PURGED, "released geometry must remain eligible for automatic recovery");
});

test("payload-only expiry preserves geometry while ordinary payloads still expire", () =>
{
  const cache = new CjsMotherLode({now: () => 0});
  const geometry = loadedGeometry();
  const payload = geometry.GetPayload();
  const ordinary = new CjsResource(); ordinary.Initialize("res:/synthetic/ordinary.bin"); ordinary.SetPayload({value: 1});
  cache.Insert(geometry.GetPath(), geometry, {time: 0});
  cache.Insert(ordinary.GetPath(), ordinary, {time: 0});
  const result = cache.PurgeInactive({time: 10, maxIdleMilliseconds: 100, payloadMaxIdleMilliseconds: 5});
  assert.equal(result.payloadsReleased, 1);
  assert.equal(ordinary.HasPayload(), false);
  assert.equal(geometry.GetPayload(), payload, "TriGeometryRes.cpp:496-509 releases meshes and readiness together");
  assert.equal(geometry.IsGood(), true);
  assert.equal(geometry.GetMeshCount(), 1);
});

test("released geometry requests recovery through its inherited reload hook", () =>
{
  const geometry = loadedGeometry(); let reloads = 0;
  geometry.SetReloadHook(() => {reloads++; geometry.MarkRequested(); return true;});
  geometry.ReleaseResources();
  assert.equal(geometry.IsGood(), false, "released geometry is not ready during recovery");
  assert.equal(reloads, 1, "TriGeometryRes.cpp:1863 delegates Reload to BlueAsyncRes");
  geometry.IsGood();
  assert.equal(reloads, 1, "an in-flight reload is not restarted");
});
