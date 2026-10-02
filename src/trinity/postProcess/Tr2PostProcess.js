// Source: trinity/trinity/Tr2PostProcess.h
// Source: trinity/trinity/Tr2PostProcess.cpp
import { meta } from "#schema";


/**
 * Post-process described as a flat ordered list of Tr2Effect stages, in contrast
 * to Tr2PostProcess2's named effect slots.
 */
@meta.define({ className: "Tr2PostProcess", family: "postProcess" })
export class Tr2PostProcess
{
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2Effect")
  stages = [];

  /**
   * Accepts the authored stage graph; Carbon performs no additional setup.
   */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

}
