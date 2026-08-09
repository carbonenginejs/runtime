// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2RenderNodeSprite2dScene.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** A render-graph node that draws a sprite scene into a destination texture, over an optional background node. */
@type.define({ className: "Tr2RenderNodeSprite2dScene", family: "renderJob" })
export class Tr2RenderNodeSprite2dScene extends CjsModel
{

  /** m_scene (Tr2Sprite2dScenePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Sprite2dScene")
  scene = null;

  /** m_background (ITr2RenderNodePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2RenderNode")
  background = null;

  // Carbon Tr2RenderNodeSprite2dScene.cpp:8-26. The node refuses to run
  // without somewhere to draw and something to draw, and a background node
  // must validate against the same destinations before this one does - a
  // background that cannot render would otherwise be discovered mid-frame.
  //
  // Carbon asserts on an empty destination list and then returns false; an
  // assert is a debug-build stop, so this port returns false in both builds
  // and the caller decides how loudly to fail.
  //
  // Execute is not here: it draws the scene through the backend context.

  /**
   * Whether this node can run against the given destinations, requiring at
   * least one destination, a scene, and a background that validates first.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon asserts before returning false on an empty destination list; the port returns false without asserting and lets the caller decide.")
  Validate(destinationDimensions, outputs, realTime, simTime)
  {
    if (!destinationDimensions?.length) return false;
    if (!this.scene) return false;

    if (this.background)
    {
      return this.background.Validate?.(destinationDimensions, [], realTime, simTime) !== false;
    }

    return true;
  }

}
