import { IInitialize } from "../../global/blue/IInitialize.js";
// Source: trinity/trinity/Tr2PostProcess.h
// Source: trinity/trinity/Tr2PostProcess.cpp
import { meta, type, blue } from "#schema";


/**
 * Post-process described as a flat ordered list of Tr2Effect stages, in contrast
 * to Tr2PostProcess2's named effect slots.
 */
@blue.define("Tr2PostProcess")
@blue.inherit(IInitialize)
export class Tr2PostProcess
{
  @blue.read
  @blue.persist
  @type.list("Tr2Effect")
  stages = [];

  /**
   * Accepts the authored stage graph; Carbon performs no additional setup.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

}
