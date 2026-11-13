import assert from "node:assert/strict";
import test from "node:test";
import { ImportAllDistModules } from "../support/allDistClasses.js";
import { blue, BlueAsyncRes, BlueResMan } from "../../npm/dist/blue/index.js";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { getClassRegistrations } from "../../npm/dist/blue/exposure/classes/registry.js";
import { Tr2RenderContext_GetMainThreadRenderContext, Tr2Renderer } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

// Every registered class with its own hook (OnDestruct, or _Destructor on a Carbon class): Destruct runs once
// and a second call answers false; a resource refuses; and the runner may run the destructors again,
// each built bare on the stub backend.
await ImportAllDistModules();

/** Classes that cannot be built with no arguments, with the reason. */
const SKIP = new Map([
  [ "CjsOverlay2D", "needs the 3D canvas it overlays" ],
  [ "VideoPlaylistController", "needs at least one video path" ],
  [ "CjsWebgpuDevice", "needs a GPUDevice" ],
  [ "CjsWebgpuVideoColorSampler", "needs a GPUDevice" ],
  [ "CjsWebgpuConstantArena", "needs a GPUDevice" ],
  [ "CjsWebgpuRenderTarget", "needs a CjsWebgpuDevice" ],
  [ "TnyCameraControls", "needs a camera" ]
]);

const owners = getClassRegistrations().filter(({ type }) =>
  (Object.hasOwn(type.prototype, "OnDestruct") || Object.hasOwn(type.prototype, "_Destructor")) && !CjsSchema.getSchema(type)?.abstract);

test("discovery finds teardown hooks, and every skip names one", () =>
{
  assert.ok(owners.length > 100, `${owners.length} hooks`);
  for (const name of SKIP.keys()) assert.ok(owners.some(owner => owner.name === name), `${name} has no own hook`);
});

test("every class with an OnDestruct is destruct-capable, and none below a resource overrides its refusal", () =>
{
  const lacking = [], overriding = [];
  for (const { name, type } of getClassRegistrations())
  {
    if (!("OnDestruct" in type.prototype)) continue;
    const record = CjsGraph._classes.get(type);
    if (!record?.lifetime || !CjsGraph._compileTeardown(record).destruct) lacking.push(name);
    if (type.prototype instanceof BlueAsyncRes && Object.hasOwn(type.prototype, "OnDestruct")) overriding.push(name);
  }
  assert.deepEqual(lacking, [], "an OnDestruct only Destruct calls needs the destruct capability in its base list");
  assert.deepEqual(overriding, [], "BlueAsyncRes.OnDestruct refuses, and a class below it must not undo that");
});

for (const { name, type: Owner } of owners)
{
  test(`${name}: Destruct is safe to run twice`, { skip: SKIP.get(name) ?? false }, t =>
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext(), previousAL = context.GetRenderContextAL();
    const al = new Tr2RenderContextALStub();
    al.CreateDevice();
    context.SetRenderContextAL(al);
    const previousManager = blue.resMan;
    blue.resMan = new BlueResMan();
    t.mock.method(Tr2Renderer, "IsResourceCreationAllowed", () => true);
    try
    {
      const owner = new Owner();
      if (typeof owner.Destruct === "function")
      {
        assert.equal(owner.Destruct(), !(owner instanceof BlueAsyncRes), "Destruct runs, unless the object is a resource");
        assert.equal(owner.Destruct(), false, "second Destruct");
      }
      else
      {
        // A value class has no Destruct and declares no destruct capability: its owner ends it through the runner.
        assert.throws(() => CjsGraph.destruct(owner), /does not declare the destruct capability/);
        assert.doesNotThrow(() => CjsGraph.finalDelete(owner), "the owner's runner call");
      }
      assert.doesNotThrow(() => CjsGraph.finalDelete(owner), "the destructors are safe to run again");
    }
    finally
    {
      blue.resMan = previousManager;
      context.SetRenderContextAL(previousAL);
    }
  });
}
