import assert from "node:assert/strict";
import test from "node:test";
import { blue, BlueResMan } from "../../npm/dist/blue/index.js";
import { EveShip2, EveSpaceObject2, EveChildTransform, TriGeometryRes } from "../../npm/dist/trinity/index.js";
import { assertControllerDestruct } from "../support/controllerDestruct.js";

test("space-object teardown closes only its raycast session and detaches controllers, notify and effect children", () =>
{
  const previous = blue.resMan, manager = new BlueResMan();
  blue.resMan = manager;
  const geometry = new TriGeometryRes();
  geometry.PrepareRayCaster();
  geometry.PrepareRayCaster();
  try
  {
    const owner = new EveShip2(), peer = new EveShip2();
    const child = new EveChildTransform(), peerChild = new EveChildTransform();
    owner._geometryResFromMesh = peer._geometryResFromMesh = geometry;
    manager.notify.Add(owner, geometry, owner, "_geometryResFromMesh");
    manager.notify.Add(peer, geometry, peer, "_geometryResFromMesh");
    owner._damageFilterState = 2;
    owner._damageFilterOccluders.push({ geometry });
    owner._damageFilterAreas.push(0);
    owner.effectChildren.push(child);
    peer.effectChildren.push(peerChild);
    child.SetOwner(owner);
    peerChild.SetOwner(peer);
    assert.equal(geometry._raycastUsers, 2);
    assertControllerDestruct(owner, EveSpaceObject2.prototype._Destructor);
    assert.equal(geometry._raycastUsers, 1);
    assert.equal(owner._damageFilterOccluders.length, 0);
    assert.equal(owner._damageFilterAreas.length, 0);
    assert.equal(child.GetOwner(), null);
    assert.equal(peerChild.GetOwner(), peer);
    assert.equal(owner._geometryResFromMesh, geometry);
    assert.deepEqual(Array.from(owner.effectChildren), [child]);
    assert.deepEqual(manager.notify.GetByOwner(owner), []);
    assert.equal(manager.notify.GetByOwner(peer).length, 1);
  }
  finally
  {
    while (geometry._raycastUsers) geometry.ResetRayCaster();
    blue.resMan = previous;
  }
});
