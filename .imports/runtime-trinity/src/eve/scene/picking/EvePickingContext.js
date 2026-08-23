// Source: E:\carbonengine\trinity\trinity\Eve\EvePicking.h
// Source: E:\carbonengine\trinity\trinity\Eve\EvePicking.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\EvePicking_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";

/**
 * Holds the outstanding picking readbacks and the most recent pick result -
 * screen coordinates, hit object and hit area - for a scene.
 */
@type.define({ className: "EvePickingContext", family: "eve/scene" })
export class EvePickingContext extends CjsModel
{
  @type.list("EvePendingPickingReadback")
  readbacks = [];

  @type.uint32
  lastPickedX = 0;

  @type.uint32
  lastPickedY = 0;

  @type.objectRef("IRoot")
  lastPickedObject = null;

  @type.uint32
  lastPickedArea = 0;

  /**
   * Records the outcome of a resolved pick: the sampled screen coordinates, the
   * object hit (null for none) and its area index.
   */
  @carbon.method
  @impl.implemented
  UpdateResult(x, y, object, area)
  {
    this.lastPickedX = Number(x) >>> 0;
    this.lastPickedY = Number(y) >>> 0;
    this.lastPickedObject = object ?? null;
    this.lastPickedArea = Number(area) >>> 0;
  }

  /**
   * Returns the object from the last resolved pick, or null if nothing was hit;
   * the reference is borrowed and replaced by the next pick.
   */
  @carbon.method
  @impl.implemented
  GetObject()
  {
    return this.lastPickedObject;
  }

  /** Returns the area index from the last resolved pick. */
  @carbon.method
  @impl.implemented
  GetArea()
  {
    return this.lastPickedArea;
  }
}
