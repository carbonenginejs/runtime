// Source: trinity/trinity/Tr2ShLightingManager.h:105-110
//
// A secondary light source for Tr2ShLightingManager: an object that lights its
// neighbours' SH lighting. EveEffectRoot2, EvePlanet and EveSpaceObject2
// implement it; the scene registers each as it enters the scene's objects
// (EveSpaceScene::OnListModified, cpp:3450-3456).
import { CjsSchema, compose, impl } from "#schema";

/** Contract for a secondary light source Tr2ShLightingManager can register. */
export class ITr2SecondaryLightSource
{
  /**
   * Adds this object to the manager's secondary light sources.
   *
   * @param {import("./Tr2ShLightingManager.js").Tr2ShLightingManager} _manager The scene's manager.
   */
  RegisterSecondaryLightSource(_manager)
  {
  }

  /**
   * Removes this object from the manager's secondary light sources.
   *
   * @param {import("./Tr2ShLightingManager.js").Tr2ShLightingManager} _manager The scene's manager.
   */
  UnregisterSecondaryLightSource(_manager)
  {
  }
}

for (const method of [ "RegisterSecondaryLightSource", "UnregisterSecondaryLightSource" ])
{
  CjsSchema.decorateMethod(ITr2SecondaryLightSource, method, compose.abstract, impl.abstract);
}
CjsSchema.define(ITr2SecondaryLightSource, { className: "ITr2SecondaryLightSource", carbon: "ITr2SecondaryLightSource", fields: {} });
