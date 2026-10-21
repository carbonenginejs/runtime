import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/EvePicking.h
// Source: trinity/trinity/Eve/EvePicking.cpp
// Source: trinity/trinity/Eve/EvePicking_Blue.cpp
import { meta, type, blue } from "#schema";

/**
 * Holds the outstanding picking readbacks and the most recent pick result -
 * screen coordinates, hit object and both extra-data words - for a scene.
 */
@be.define("EvePickingContext")
@blue.inherit(IRoot)
export class EvePickingContext
{
  @type.list("EvePendingPickingReadback")
  readbacks = [];

  @type.uint32
  lastPickedX = 0;

  @type.uint32
  lastPickedY = 0;

  @type.rootRef("IRoot")
  lastPickedObject = null;

  @type.uint32
  lastPickedExtraData1 = 0;

  @type.uint32
  lastPickedExtraData2 = 0;

  /**
   * Records the outcome of a resolved pick: the sampled screen coordinates, the
   * object hit (null for none) and its area index.
   */

  @meta.implemented
  UpdateResult(x, y, object, extraData1, extraData2)
  {
    this.lastPickedX = Number(x) >>> 0;
    this.lastPickedY = Number(y) >>> 0;
    this.lastPickedObject = object ?? null;
    this.lastPickedExtraData1 = extraData1 >>> 0;
    this.lastPickedExtraData2 = extraData2 >>> 0;
  }

  /**
   * Returns the object from the last resolved pick, or null if nothing was hit;
   * the reference is borrowed and replaced by the next pick.
   */

  @meta.implemented
  GetObject()
  {
    return this.lastPickedObject;
  }

  /** Returns the area index from the last resolved pick. */

  @meta.implemented
  GetExtraData1()
  {
    return this.lastPickedExtraData1;
  }

  /** Returns the second extra-data word from the last resolved pick. */

  @meta.implemented
  GetExtraData2()
  {
    return this.lastPickedExtraData2;
  }

  /**
   * Explicit cancellation replaces destruction of Carbon's owning vector.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  @meta.adapted
  Destruct()
  {
    for (const request of this.readbacks) request.Destruct();
    this.readbacks.length = 0;
    this.UpdateResult(0, 0, null, 0, 0);
  }
}
