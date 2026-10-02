import { INotify } from "../../../global/blue/INotify.js";
import { IEveSpaceObjectChild } from "../child/IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "../child/EveSpaceObjectChild.js";
// Source: trinity/trinity/Eve/UI/EveEllipseSet.h
//   trinity/trinity/Eve/UI/EveEllipseSet.cpp
import { vec3 } from "#math/vec3";
import { CjsSchema, meta } from "#schema";
import { quat } from "#math/quat";
import { BLUELISTEVENT } from "#consts/blue";
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { EveChildTransform } from "../child/EveChildTransform.js";
import { EveEllipseDefinition } from "./EveEllipseDefinition.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";


/**
 * Transform child that owns a list of ellipse definitions and the effect they
 * are drawn with, used for the ribbon rings of UI overlays.
 */
@meta.define({ className: "EveEllipseSet", family: "eve/ui" })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.inherit(IListNotify)
@meta.blue.inherit(IListNotify, INotify)
export class EveEllipseSet extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:22 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:23 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:24 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);
  _geometryDirty = true;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  ribbonSegmentCount = 128;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  enablePicking = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  depthOffset = 0;

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveEllipseDefinition")
  ellipses = [];

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
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
  @meta.blue.method
  AddEllipse(center, semiMajor, semiMinor, planeNormal, rotationDegrees)
  {
    const ellipse = new EveEllipseDefinition();
    vec3.copy(ellipse.center, center);
    ellipse.semiMajor = semiMajor;
    ellipse.semiMinor = semiMinor;
    vec3.copy(ellipse.planeNormal, planeNormal);
    ellipse.rotationDegrees = rotationDegrees;
    this._BindEllipse(ellipse);
    this.ellipses.push(ellipse);
    this._MarkGeometryDirty();
    return true;
  }

  /**
   * Rebinds every persisted ellipse's dirty callback after hydration; unlike
   * Carbon it does not create the default effect, since resource lookup is left
   * to the engine layer.
   */
  @meta.blue.method
  __init__()
  {
    // Carbon creates the configured default effect here. Resource lookup is
    // resource/engine-layer work; a persisted or caller-assigned effect is
    // retained and the CPU definitions are rebound after hydration.
    for (const ellipse of this.ellipses)
    {
      this._BindEllipse(ellipse);
    }
  }

  /**
   * Removes every ellipse, unbinding their dirty callbacks first so discarded
   * definitions can no longer invalidate this set, and marks the geometry for
   * rebuild.
   */
  @meta.blue.method
  ClearEllipses()
  {
    for (const ellipse of this.ellipses)
    {
      ellipse?.SetDirtyFlag?.(null);
    }
    this.ellipses.length = 0;
    this._MarkGeometryDirty();
  }

  /**
   * Marks the ribbon geometry for rebuild when a notifying field such as the
   * segment count changes.
   */
  OnModified(_value = null)
  {
    this._MarkGeometryDirty();
    return true;
  }

  /** Binds or releases definition callbacks after a list mutation. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JavaScript represents the owner's dirty-flag pointer with a callback; list event ordering follows Carbon.")
  @meta.invalidates("#geometryDirty")
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
          if (ellipse) this._BindEllipse(ellipse);
          break;
        }
        case BLUELISTEVENT.BELIST_REMOVED:
        {
          const ellipse = CjsSchema.cast(value, EveEllipseDefinition);
          if (ellipse) ellipse.SetDirtyFlag(null);
          break;
        }
        case BLUELISTEVENT.BELIST_LOADFINISHED:
          for (const ellipse of this.ellipses) this._BindEllipse(ellipse);
          break;
        case BLUELISTEVENT.BELIST_UNLOADSTART:
          for (const ellipse of this.ellipses) ellipse.SetDirtyFlag(null);
          break;
      }
    }
    this._MarkGeometryDirty();
  }

  /**
   * Flags the ribbon geometry as stale so it is regenerated before the next
   * draw.
   */
  _MarkGeometryDirty()
  {
    this._geometryDirty = true;
  }

  /**
   * Points an ellipse definition's dirty callback back at this set, so editing
   * the definition invalidates the set's geometry.
   */
  _BindEllipse(ellipse)
  {
    ellipse.SetDirtyFlag(() => this._MarkGeometryDirty());
  }
}

// EveEllipseSet_Blue.cpp: native exposure; unported contracts: ITr2Pickable.
meta.blue.interfaceTable({ interfaces: [EveEllipseSet, EveSpaceObjectChild, IEveSpaceObjectChild, ITr2Renderable, IListNotify, INotify], chainTo: null })(EveEllipseSet, { kind: "class" });
