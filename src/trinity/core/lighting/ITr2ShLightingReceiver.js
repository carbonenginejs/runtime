// Source: trinity/trinity/Tr2ShLightingManager.h:117-122
//
// A receiver of SH lighting from Tr2ShLightingManager. EveSpaceObject2
// implements it; the scene clears a receiver's lighting as it leaves the
// scene's objects (EveSpaceScene::OnListModified, cpp:3474-3488).
import { CjsSchema, compose, impl } from "#schema";

/** Contract for an object that receives SH lighting from Tr2ShLightingManager. */
export class ITr2ShLightingReceiver
{
  /**
   * Refreshes this object's SH lighting from the manager.
   *
   * @param {import("./Tr2ShLightingManager.js").Tr2ShLightingManager} _manager The scene's manager.
   * @param {object} _updateContext The frame's EveUpdateContext.
   */
  UpdateShLighting(_manager, _updateContext)
  {
  }

  /** Drops this object's SH lighting. */
  ClearShLighting()
  {
  }
}

for (const method of [ "UpdateShLighting", "ClearShLighting" ])
{
  CjsSchema.decorateMethod(ITr2ShLightingReceiver, method, compose.abstract, impl.abstract);
}
CjsSchema.define(ITr2ShLightingReceiver, { className: "ITr2ShLightingReceiver", carbon: "ITr2ShLightingReceiver", fields: {} });
