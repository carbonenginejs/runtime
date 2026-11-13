import assert from "node:assert/strict";
import test from "node:test";
import { ImportAllDistModules } from "../support/allDistClasses.js";
import { blue, BlueResMan } from "../../npm/dist/blue/index.js";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { getClassRegistrations } from "../../npm/dist/blue/exposure/classes/registry.js";
import { Tr2DeviceResource, Tr2Renderer, Tr2RenderContext_GetMainThreadRenderContext, TriDevice } from "../../npm/dist/trinity/index.js";
import { Tr2BaseDeviceResourceAL, Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { TriStorageFlags } from "../../npm/dist/global/consts/graphics/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

// The idle sweep releases TRISTORAGE_ALL (device-resource-registration.md, 2026-11-12), so everything it can
// reach must rebuild after ALL: OnPrepareResources creates what is missing (Tr2DeviceResource.h:47-62).
// Sweepable = registered with TriDevice after use and not _neverPurge. The sweep is mimicked directly
// (unregister, ReleaseResources(ALL)); the next use must prepare again with the same live AL object count.
await ImportAllDistModules();

const prepare = Tr2DeviceResource.prototype.PrepareResources;

/** Sweepable classes that cannot be prepared bare, with the reason. */
const SKIP = new Map([
  [ "Tr2DeviceResource", "the base itself; its _OnPrepareResources is abstract" ],
  [ "EveLineSet", "bare set has no line effect, so it never prepares (before or after release)" ],
  [ "Tr2LineGraph", "_OnPrepareResources is @notImplemented (line-graph vertex buffer unported)" ]
]);

/** Runs body on a fresh stub device and resource manager with resource creation allowed. */
function onStub(t, body)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext(), previousAL = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  al.CreateDevice();
  context.SetRenderContextAL(al);
  const previousManager = blue.resMan;
  blue.resMan = new BlueResMan();
  t.mock.method(Tr2Renderer, "IsResourceCreationAllowed", () => true);
  try { return body(); }
  finally
  {
    blue.resMan = previousManager;
    context.SetRenderContextAL(previousAL);
  }
}

const candidates = getClassRegistrations().filter(({ type }) =>
  (type.prototype instanceof Tr2DeviceResource || type.prototype.PrepareResources === prepare) &&
  !CjsSchema.getSchema(type)?.abstract);

test("discovery finds sweepable device resources, and every skip names one", () =>
{
  assert.ok(candidates.length > 40, `${candidates.length} device-resource classes`);
  for (const name of SKIP.keys()) assert.ok(candidates.some(entry => entry.name === name), `${name} is not a device resource`);
});

for (const { name, type: Resource } of candidates)
{
  test(`${name}: rebuilds after ReleaseResources(TRISTORAGE_ALL)`, { skip: SKIP.get(name) ?? false }, t => onStub(t, () =>
  {
    const resource = new Resource();
    try
    {
      resource.IsGood();
      if (resource._neverPurge || !TriDevice.GetResourcesRegistered().includes(resource))
      {
        t.diagnostic("not sweepable: _neverPurge or unregistered after use");
        return;
      }
      assert.equal(resource.PrepareResources(), true, "prepares bare");
      const prepared = Tr2BaseDeviceResourceAL.GetResourceCount();

      TriDevice.UnregisterResource(resource);
      resource.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);

      resource.IsGood();
      assert.ok(TriDevice.GetResourcesRegistered().includes(resource), "use registers it again");
      assert.equal(resource.PrepareResources(), true, "prepares again after ALL");
      assert.equal(Tr2BaseDeviceResourceAL.GetResourceCount(), prepared, "same live AL objects as the first prepare");
    }
    // A resource refuses graph Destruct; its manager runs its destruction.
    finally { if (!resource.Destruct()) CjsGraph.finalDelete(resource); }
  }));
}
