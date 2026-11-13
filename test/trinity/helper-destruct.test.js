import assert from "node:assert/strict";
import test from "node:test";
import { Tr2StreamingBitmapSaver, TriDebugResourceHelper, TriDevice } from "../../npm/dist/trinity/index.js";
import { Tr2IntSkinnedObject } from "../../npm/dist/character/index.js";

test("streaming saver destruction ends a save in progress only", t =>
{
  // Tr2StreamingBitmapSaver.cpp:26-32.
  const idle = new Tr2StreamingBitmapSaver(), saving = new Tr2StreamingBitmapSaver();
  const idleEnd = t.mock.method(idle, "EndSaving", () => 0);
  const end = t.mock.method(saving, "EndSaving", () => 0);
  t.mock.method(saving, "IsSaving", () => true);
  idle.Destruct();
  saving.Destruct();
  assert.equal(idleEnd.mock.callCount(), 0);
  assert.equal(end.mock.callCount(), 1);
});

test("debug resource helper destruction drops its effect and unregisters, repeatably", () =>
{
  // TriDebugResourceHelper.cpp:18-21; the Tr2DeviceResource base unregisters.
  const helper = new TriDebugResourceHelper();
  const effect = helper.GetEffect(), line = helper.GetLineEffect();
  assert.ok(effect);
  for (let repeat = 0; repeat < 2; repeat++)
  {
    helper.Destruct();
    assert.equal(helper._effect, null);
    assert.equal(helper._lineEffect, line);
    assert.equal(TriDevice.GetResourcesRegistered().includes(helper), false);
  }
});

test("interior skinned-object destruction leaves the apex flag as Carbon's empty removal does", t =>
{
  // Interior/Tr2IntSkinnedObject.cpp:42-48 calls RemoveFromApexScene (cpp:164-171), whose body is empty.
  const object = new Tr2IntSkinnedObject();
  const remove = t.mock.method(object, "RemoveFromApexScene");
  object.AddToApexScene(null);
  object.Destruct();
  object.Destruct();
  assert.equal(remove.mock.callCount(), 1, "the second Destruct answers false");
  assert.equal(object._isInApexScene, true);
});
