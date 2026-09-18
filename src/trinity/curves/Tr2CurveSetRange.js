// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
import { CjsModel } from "#model";
import { edit, type } from "#schema";


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
  @edit.persist
  @type.string
  name = "";

  @edit.persist
  @type.float32
  startTime = 0;

  @edit.persist
  @type.float32
  endTime = 1;

  @edit.persist
  @type.boolean
  looped = false;
}
