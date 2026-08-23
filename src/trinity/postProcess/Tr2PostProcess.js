// Source: trinity/trinity/Tr2PostProcess.h
// Source: trinity/trinity/Tr2PostProcess.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Post-process described as a flat ordered list of Tr2Effect stages, in contrast
 * to Tr2PostProcess2's named effect slots.
 */
@type.define({ className: "Tr2PostProcess", family: "postProcess" })
export class Tr2PostProcess extends CjsModel
{
  @io.persist
  @type.list("Tr2Effect")
  stages = [];

  /**
   * Accepts the authored stage graph; Carbon performs no additional setup.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    return true;
  }

}
