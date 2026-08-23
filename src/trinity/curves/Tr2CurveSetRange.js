// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
import { CjsModel } from "#model";
import { io, type } from "#schema";


/**
 * Named sub-interval of a curve set's scaled timeline, giving a start and end
 * time and whether playback loops inside it.
 */
@type.define({
  className: "Tr2CurveSetRange",
  family: "curves"
})
export class Tr2CurveSetRange extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.float32
  startTime = 0;

  @io.persist
  @type.float32
  endTime = 1;

  @io.persist
  @type.boolean
  looped = false;
}
