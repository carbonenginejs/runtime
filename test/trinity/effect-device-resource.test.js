import assert from "node:assert/strict";
import test from "node:test";
import { Tr2DeviceResource, TriDevice } from "../../npm/dist/trinity/index.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/index.js";
import { Tr2EffectTechniqueInputs } from "../../npm/dist/trinity/shader/material/Tr2EffectTechniqueInputs.js";
import { Tr2EffectPassParameters } from "../../npm/dist/trinity/shader/material/Tr2EffectPassParameters.js";
import { Tr2EffectLibraryParameters } from "../../npm/dist/trinity/shader/material/Tr2EffectLibraryParameters.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { TriStorageFlags } from "../../npm/dist/global/consts/graphics/index.js";

/** An effect with one pass and one library, each constant buffer created on the stub. */
function effectWithBuffers()
{
  const context = new Tr2RenderContext();
  context.GetRenderContextAL().CreateDevice();

  const effect = new Tr2Effect();
  const technique = new Tr2EffectTechniqueInputs();
  const pass = new Tr2EffectPassParameters(), library = new Tr2EffectLibraryParameters();
  technique.passes.push(pass);
  technique.libraries.push(library);
  effect.parametersForPasses.push(technique);

  const buffers = [ pass.stageInput[0], pass.stageInput[1], library.globalInput, library.localInput ].map(input => input.constantBuffer);
  for (const buffer of buffers) buffer.Create__Size(16, context);
  return { effect, buffers };
}

test("Tr2Effect takes Carbon's device-resource base (Tr2Effect.h:53-59)", () =>
{
  // Its own KeepAlive calls the base's and then renews its own link to its effect resource.
  assert.notEqual(Tr2Effect.prototype.KeepAlive, Tr2DeviceResource.prototype.KeepAlive);
  assert.equal(Tr2Effect.prototype.PrepareResources, Tr2DeviceResource.prototype.PrepareResources);
  assert.equal(new Tr2Effect()._OnPrepareResources(), true, "Tr2Effect.cpp:304-307");
});

test("an effect registers with the device on use and unregisters on Destruct", () =>
{
  const effect = new Tr2Effect();
  assert.equal(TriDevice.GetResourcesRegistered().includes(effect), false, "construction alone does not register");

  effect.IsGood();
  assert.equal(TriDevice.GetResourcesRegistered().includes(effect), true);

  effect.Destruct();
  assert.equal(TriDevice.GetResourcesRegistered().includes(effect), false);
  effect.IsGood();
  assert.equal(TriDevice.GetResourcesRegistered().includes(effect), false, "a destructed effect stays unregistered");
});

test("a full release resets pass and library constant buffers; a partial one keeps them (Tr2Effect.cpp:282-302)", () =>
{
  const { effect, buffers } = effectWithBuffers();

  effect.ReleaseResources(TriStorageFlags.TRISTORAGE_MANAGEDMEMORY);
  for (const buffer of buffers) assert.equal(buffer.IsValid(), true);

  effect.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  for (const buffer of buffers) assert.equal(buffer.IsValid(), false);

  effect.Destruct();
});
