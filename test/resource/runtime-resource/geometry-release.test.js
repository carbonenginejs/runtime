import assert from "node:assert/strict";
import { test } from "node:test";

import { TriStorage } from "../../../src/global/consts/graphics/index.js";
import { CjsResource } from "../../../src/resource/CjsResource.js";
import { TriGeometryRes } from "../../../src/resource/geometry/index.js";

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
  kept.ReleaseResources(TriStorage.TRISTORAGE_VIDEOMEMORY);
  assert.equal(kept.HasPayload(), true);
  assert.equal(kept.IsPrepared(), true);

  const released = loadedGeometry();
  released.ReleaseResources();
  assert.equal(released.HasPayload(), false);
  assert.equal(released.state, CjsResource.State.UNLOADED);
});
