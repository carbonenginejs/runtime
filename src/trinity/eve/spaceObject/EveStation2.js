// Source: trinity/trinity/Eve/SpaceObject/EveStation2.h
// Source: trinity/trinity/Eve/SpaceObject/EveStation2.cpp
import { meta, blue } from "#schema";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";

import { EveSpaceObject2 } from "./EveSpaceObject2.js";

/**
 * Concrete station space-object root. Carbon adds no Blue fields. Station
 * activation scales the prepared shader data; the native GetBatches override
 * only forwards to the inherited implementation.
 */
@blue.define("EveStation2")
@blue.interface(IEveSpaceObject2, ITr2Renderable)
@blue.chainTo(EveSpaceObject2)
export class EveStation2 extends EveSpaceObject2
{
  /**
   * Applies station activation after the base damage-overlay contribution.
   * Carbon EveStation2.cpp:32-37; the base refreshes the value every frame.
   * @param {EveUpdateContext} updateContext Scene update context.
   * @returns {void}
   */
  @meta.implemented
  PrepareShaderData(updateContext)
  {
    super.PrepareShaderData(updateContext);
    this.spaceObjectShipData[1] *= this.activationStrength;
  }
}

// EveStation2_Blue.cpp: native exposure.
