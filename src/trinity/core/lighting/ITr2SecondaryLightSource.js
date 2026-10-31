import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Tr2ShLightingManager.h:105-110
//
// A secondary light source for Tr2ShLightingManager: an object that lights its
// neighbours' SH lighting. EveEffectRoot2, EvePlanet and EveSpaceObject2
// implement it; the scene registers each as it enters the scene's objects
// (EveSpaceScene::OnListModified, cpp:3450-3456).

/** Contract for a secondary light source Tr2ShLightingManager can register. */
@be.interface("ITr2SecondaryLightSource")
@be.inherit(IRoot)
export class ITr2SecondaryLightSource extends IRoot
{
  /**
   * Adds this object to the manager's secondary light sources.
   *
   * @abstract
   * @param {import("./Tr2ShLightingManager.js").Tr2ShLightingManager} _manager The scene's manager.
   */
  @be.abstract
  RegisterSecondaryLightSource(manager)
  {
  }

  /**
   * Removes this object from the manager's secondary light sources.
   *
   * @abstract
   * @param {import("./Tr2ShLightingManager.js").Tr2ShLightingManager} _manager The scene's manager.
   */
  @be.abstract
  UnregisterSecondaryLightSource(manager)
  {
  }
}
