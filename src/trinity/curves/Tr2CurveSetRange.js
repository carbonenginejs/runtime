// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
// Source: trinity/trinity/Curves/TriCurveSet_Blue.cpp
import { type, blue } from "#schema";


/**
 * Named sub-interval of a curve set's scaled timeline, giving a start and end
 * time and whether playback loops inside it.
 */
@blue.define("Tr2CurveSetRange")
export class Tr2CurveSetRange
{
  /** Authored name used by TriCurveSet.PlayTimeRange. */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** First scaled-time sample in seconds. */
  @blue.readwrite
  @blue.persist
  @type.float32
  startTime = 0;

  /** Last scaled-time sample in seconds. */
  @blue.readwrite
  @blue.persist
  @type.float32
  endTime = 1;

  /** Whether playback wraps within the interval. */
  @blue.readwrite
  @blue.persist
  @type.boolean
  looped = false;
}

// EXPOSURE_END: this plain IRoot record exposes only its concrete identity.
blue.interface()(Tr2CurveSetRange);
