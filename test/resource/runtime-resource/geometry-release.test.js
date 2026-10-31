import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

import { TriStorageFlags } from "../../../npm/dist/global/consts/graphics/index.js";
import { MotherLode } from "../../../npm/dist/global/blue/MotherLode.js";
import { blue, BlueResMan, CjsLoadingObject } from "../../../npm/dist/global/blue/index.js";
import { TriGeometryRes } from "../../../npm/dist/trinity/resources/geometry/index.js";
import { CjsCmfFormat } from "../../../npm/dist/resource/formats/cmf/CjsCmfFormat.js";
import { configureResourceManager } from "../../support/configuredResMan.js";
import "../../support/frameLoop.js";

// One triangle is enough: the raycaster only has to build, not hit anything.
function loadedGeometry()
{
  const res = new TriGeometryRes();
  res._path = "res:/model/test.cmf";
  res.ReadCMFFile({
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
  res._SetPrepared(true);
  res._SetGood(true);
  return res;
}

test("releasing the payload takes the raycaster with it", () =>
{
  // TriGeometryRes.cpp:496-509 drops the meshes and the raycast geometry
  // together; a payload-only release must not leave one behind.
  const res = loadedGeometry();
  res.PrepareRayCaster();
  assert.equal(res.IsRayCasterReady(), true);

  res.Shutdown();

  assert.equal(res.GetCMFData() !== null, false);
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
  assert.equal(kept.GetCMFData() !== null, true);
  assert.equal(kept.IsPrepared(), true);

  const released = loadedGeometry();
  released.ReleaseResources();
  assert.equal(released.GetCMFData() !== null, false);
  assert.equal(released.IsGood(), false, "TriGeometryRes.cpp:507-508 clears both prepared and good");
  assert.equal(released.IsPrepared(), false);
  assert.equal(blue.resMan.GetResourceStatus(released).purged, false, "device release is distinct from a cache purge");
});

test("payload-only expiry preserves geometry while ordinary payloads still expire", () =>
{
  const cache = new MotherLode({now: () => 0});
  const geometry = loadedGeometry();
  const payload = geometry.GetCMFData();
  const ordinary = plainResource("res:/synthetic/ordinary.bin", {value: 1});
  cache.Insert(geometry.GetPath(), geometry, {time: 0});
  cache.Insert(ordinary.GetPath(), ordinary, {time: 0});
  const result = cache.PurgeInactive({time: 10, maxIdleMilliseconds: 100, payloadMaxIdleMilliseconds: 5});
  assert.equal(result.payloadsReleased, 1);
  assert.equal(blue.resMan.HasResourcePayload(ordinary), false);
  assert.equal(geometry.GetCMFData(), payload, "TriGeometryRes.cpp:496-509 releases meshes and readiness together");
  assert.equal(geometry.IsGood(), true);
  assert.equal(geometry.GetMeshCount(), 1);
});

test("device-released geometry waits for the native explicit Reload", async () =>
{
  const geometry = loadedGeometry();
  let reads = 0;
  // CMF is unrouted by default (configuration.js:27-29); an application routes it
  // through CjsLibrary's configuration, as here.
  await configureResourceManager(blue.resMan, { formats: {
    cmf: { Format: CjsCmfFormat, routes: [ { extension: "cmf", Res: TriGeometryRes } ] }
  } });
  const bytes = CjsCmfFormat.writeShared({ meshes: [ {
    name: "mesh", minBounds: [ 0, 0, 0 ], maxBounds: [ 1, 1, 0 ],
    vertex: { position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ] },
    indices: [ { name: "area", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
  } ] });
  blue.resMan.SetSource({Read() { reads++; return bytes; }});
  geometry.ReleaseResources();
  assert.equal(geometry.IsGood(), false);
  assert.equal(reads, 0, "device release does not masquerade as policy purge");
  geometry.Reload();
  await blue.resMan.Ready(geometry);
  assert.equal(reads, 1);
  assert.equal(geometry.IsGood(), true);
});

let previous;
beforeEach(() => { previous = blue.resMan; blue.resMan = new BlueResMan(); });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previous; } });

/** Plain-data fixture for MotherLode's separate data lease. */
function plainResource(path, value)
{
  const resource = new CjsLoadingObject();
  resource._path = path;
  resource._SetPrepared(true);
  resource._SetGood(true);
  blue.resMan._GetResourceRecord(resource).payload = value;
  return resource;
}
