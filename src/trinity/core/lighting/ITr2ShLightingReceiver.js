import { exposure as be } from "#be";
import { IRoot } from "../../../blue/blueexposure/IRoot.js";
// Source: trinity/trinity/Tr2ShLightingManager.h:117-122
//
// A receiver of SH lighting from Tr2ShLightingManager. EveSpaceObject2
// implements it; the scene clears a receiver's lighting as it leaves the
// scene's objects (EveSpaceScene::OnListModified, cpp:3474-3488).

/** Contract for an object that receives SH lighting from Tr2ShLightingManager. */
@be.interface("ITr2ShLightingReceiver")
@be.inherit(IRoot)
export class ITr2ShLightingReceiver extends IRoot
{
  /**
   * Refreshes this object's SH lighting from the manager.
   *
   * @abstract
   * @param {import("./Tr2ShLightingManager.js").Tr2ShLightingManager} _manager The scene's manager.
   * @param {object} _updateContext The frame's EveUpdateContext.
   */
  @be.abstract
  UpdateShLighting(manager, updateContext)
  {
  }

  /**
   * Drops this object's SH lighting.
   *
   * @abstract
   */
  @be.abstract
  ClearShLighting()
  {
  }
}
