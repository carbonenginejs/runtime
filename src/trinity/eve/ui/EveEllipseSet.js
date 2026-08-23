// Source: trinity/trinity/Eve/UI/EveEllipseSet.h
//   trinity/trinity/Eve/UI/EveEllipseSet.cpp
import { vec3 } from "#math/vec3";
import { carbon, io, type } from "#schema";
import { EveChildTransform } from "../child/EveChildTransform.js";
import { EveEllipseDefinition } from "./EveEllipseDefinition.js";


/**
 * Transform child that owns a list of ellipse definitions and the effect they
 * are drawn with, used for the ribbon rings of UI overlays.
 */
@type.define({ className: "EveEllipseSet", family: "eve/ui" })
export class EveEllipseSet extends EveChildTransform
{
  #geometryDirty = true;

  @io.notify
  @io.persist
  @type.uint32
  ribbonSegmentCount = 128;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.boolean
  enablePicking = true;

  @io.persist
  @type.float32
  depthOffset = 0;

  @io.persist
  @type.list("EveEllipseDefinition")
  ellipses = [];

  @io.persist
  @type.model("Tr2Effect")
  effect = null;

  /**
   * Appends an ellipse to the set, binds its dirty callback and marks the ribbon geometry for rebuild.
   * @param {vec3} center Centre in the set's local space
   * @param {Number} semiMajor
   * @param {Number} semiMinor
   * @param {vec3} planeNormal Normal of the plane the ellipse lies in
   * @param {Number} rotationDegrees In-plane rotation, in degrees
   * @returns {Boolean} Always true
   */
  @carbon.method
  AddEllipse(center, semiMajor, semiMinor, planeNormal, rotationDegrees)
  {
    const ellipse = new EveEllipseDefinition();
    vec3.copy(ellipse.center, center);
    ellipse.semiMajor = semiMajor;
    ellipse.semiMinor = semiMinor;
    vec3.copy(ellipse.planeNormal, planeNormal);
    ellipse.rotationDegrees = rotationDegrees;
    this.#BindEllipse(ellipse);
    this.ellipses.push(ellipse);
    this.#MarkGeometryDirty();
    return true;
  }

  /**
   * Rebinds every persisted ellipse's dirty callback after hydration; unlike
   * Carbon it does not create the default effect, since resource lookup is left
   * to the engine layer.
   */
  @carbon.method
  __init__()
  {
    // Carbon creates the configured default effect here. Resource lookup is
    // runtime-resource/engine work; a persisted or caller-assigned effect is
    // retained and the CPU definitions are rebound after hydration.
    for (const ellipse of this.ellipses)
    {
      this.#BindEllipse(ellipse);
    }
  }

  /**
   * Removes every ellipse, unbinding their dirty callbacks first so discarded
   * definitions can no longer invalidate this set, and marks the geometry for
   * rebuild.
   */
  @carbon.method
  ClearEllipses()
  {
    for (const ellipse of this.ellipses)
    {
      ellipse?.SetDirtyFlag?.(null);
    }
    this.ellipses.length = 0;
    this.#MarkGeometryDirty();
  }

  /**
   * Marks the ribbon geometry for rebuild when a notifying field such as the
   * segment count changes.
   */
  OnModified(_value = null)
  {
    this.#MarkGeometryDirty();
    return true;
  }

  /**
   * Flags the ribbon geometry as stale so it is regenerated before the next
   * draw.
   */
  #MarkGeometryDirty()
  {
    this.#geometryDirty = true;
  }

  /**
   * Points an ellipse definition's dirty callback back at this set, so editing
   * the definition invalidates the set's geometry.
   */
  #BindEllipse(ellipse)
  {
    ellipse?.SetDirtyFlag?.(() => this.#MarkGeometryDirty());
  }
}
