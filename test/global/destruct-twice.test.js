import assert from "node:assert/strict";
import test from "node:test";
import { ImportAllDistModules } from "../support/allDistClasses.js";
import { blue, BlueResMan } from "../../npm/dist/blue/index.js";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { getClassRegistrations } from "../../npm/dist/blue/exposure/classes/registry.js";
import { Tr2RenderContext_GetMainThreadRenderContext, Tr2Renderer } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";

// Item 4's "an OnDestruct is safe to run twice": every registered class with its own hook
// (OnDestruct, or _Destructor on a Carbon class),
// built bare on the stub backend, survives two Destruct calls.
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
      owner.Destruct();
      assert.doesNotThrow(() => owner.Destruct(), "second Destruct");
    }
    finally
    {
      blue.resMan = previousManager;
      context.SetRenderContextAL(previousAL);
    }
  });
}
