import assert from "node:assert/strict";

/** Proves a retained list loses its owner observer, without depending on an empty-clear event. */
export function assertListObserverDestruct(t, owner, fields, hook = owner._Destructor ?? owner.OnDestruct)
{
  const lists = fields.map(field => owner[field]);
  const notifications = t.mock.method(owner, "OnListModified", () => {});
  for (const list of lists)
  {
    const info = {};
    list.GetInfo(info);
    assert.equal(info.notify, owner);
    list.ReplaceItems([]);
  }
  assert.equal(notifications.mock.callCount(), lists.length);
  hook.call(owner);
  hook.call(owner);
  for (let index = 0; index < lists.length; index++)
  {
    const info = {};
    lists[index].GetInfo(info);
    assert.equal(info.notify, null);
    assert.equal(owner[fields[index]], lists[index]);
    lists[index].ReplaceItems([]);
  }
  assert.equal(notifications.mock.callCount(), lists.length);
}
