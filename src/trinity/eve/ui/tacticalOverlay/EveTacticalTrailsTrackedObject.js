// Source: trinity/trinity/Eve/UI/EveTacticalTrails.h
// Source: trinity/trinity/Eve/UI/EveTacticalTrails.cpp
import { meta, type } from "#schema";

/**
 * Carbon EveTacticalTrails::TrackedObject (h:54-58): one ball the trails follow, as RegisterObject stores it
 * (cpp:91-96), and its trail's control points.
 */
@meta.define({"name":"EveTacticalTrails::TrackedObject","carbon":"EveTacticalTrails::TrackedObject"})
export class EveTacticalTrailsTrackedObject
{

  /**
   * ball (BlueWeakRef<ITriVectorFunction>): a WeakRef to the ball, or null once it is unregistered.
   *
   * @adapted a JavaScript WeakRef stands in for BlueWeakRef, so the member holds the WeakRef, not the ball; it
   *   has no graph type.
   * @type {WeakRef<object>|null}
   */
  ball = null;

  /** positions (std::vector<Postion>) */
  @type.object.embed.array("EveTacticalTrails::Postion")
  positions = [];

}
