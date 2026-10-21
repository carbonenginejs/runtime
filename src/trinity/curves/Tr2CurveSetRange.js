import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
// Source: trinity/trinity/Curves/TriCurveSet_Blue.cpp
import { type, blue } from "#schema";


/**
 * Named sub-interval of a curve set's scaled timeline, giving a start and end
 * time and whether playback loops inside it.
 */
@blue.inherit(IRoot)
@be.define("Tr2CurveSetRange")
export class Tr2CurveSetRange extends IRoot
{
  /** Authored name used by TriCurveSet.PlayTimeRange. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** First scaled-time sample in seconds. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  startTime = 0;

  /** Last scaled-time sample in seconds. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  endTime = 1;

  /** Whether playback wraps within the interval. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  looped = false;
}

// EXPOSURE_END: this plain IRoot record exposes only its concrete identity.

