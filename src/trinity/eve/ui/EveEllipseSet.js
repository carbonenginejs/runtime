// Source: trinity/trinity/Eve/UI/EveEllipseSet.h
//   trinity/trinity/Eve/UI/EveEllipseSet.cpp
import { vec3 } from "#math/vec3";
import { carbon, CjsSchema, edit, impl, type } from "#schema";
import { BLUELISTEVENT } from "#consts/blue";
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { EveChildTransform } from "../child/EveChildTransform.js";
import { EveEllipseDefinition } from "./EveEllipseDefinition.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";


/**
 * Transform child that owns a list of ellipse definitions and the effect they
 * are drawn with, used for the ribbon rings of UI overlays.
 */
@type.define({ className: "EveEllipseSet", family: "eve/ui" })
@carbon.inherit(ITr2Renderable)
@carbon.inherit(IListNotify)
export class EveEllipseSet extends EveChildTransform
{
  #geometryDirty = true;

  @edit.notify
  @edit.persist
  @type.uint32
  ribbonSegmentCount = 128;

  @edit.persist
  @type.string
  name = "";

  @edit.persist
  @type.boolean
  display = true;

  @edit.persist
  @type.boolean
  enablePicking = true;

  @edit.persist
  @type.float32
  depthOffset = 0;

  @edit.persist
  @type.list("EveEllipseDefinition")
  ellipses = [];

  @edit.persist
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
    // resource/engine-layer work; a persisted or caller-assigned effect is
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

  /** Binds or releases definition callbacks after a list mutation. */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript represents the owner's dirty-flag pointer with a callback; list event ordering follows Carbon.")
  @impl.invalidates("#geometryDirty")
  OnListModified(event, _key, _key2, value, list)
  {
    // Source: Eve/UI/EveEllipseSet.cpp:139-175. Loading suppresses per-item
    // binding, but every notification still invalidates geometry below.
    if (list === this.ellipses && (event & BLUELISTEVENT.BELIST_LOADING) === 0)
    {
      switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
      {
        case BLUELISTEVENT.BELIST_INSERTED:
        {
          const ellipse = CjsSchema.cast(value, EveEllipseDefinition);
          if (ellipse) this.#BindEllipse(ellipse);
          break;
        }
        case BLUELISTEVENT.BELIST_REMOVED:
        {
          const ellipse = CjsSchema.cast(value, EveEllipseDefinition);
          if (ellipse) ellipse.SetDirtyFlag(null);
          break;
        }
        case BLUELISTEVENT.BELIST_LOADFINISHED:
          for (const ellipse of this.ellipses) this.#BindEllipse(ellipse);
          break;
        case BLUELISTEVENT.BELIST_UNLOADSTART:
          for (const ellipse of this.ellipses) ellipse.SetDirtyFlag(null);
          break;
      }
    }
    this.#MarkGeometryDirty();
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
    ellipse.SetDirtyFlag(() => this.#MarkGeometryDirty());
  }
}
