// Source: trinity/trinity/Tr2PrimitiveSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { INotify, IsMatch } from "#blue";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../ITr2Renderable.js";

/** A drawable set of primitives with a world transform, sort value and bounding sphere. */
@meta.define({ className: "Tr2PrimitiveSet", family: "trinityCore" })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.mapInterface(INotify)
export class Tr2PrimitiveSet
{

  /** Carbon Tr2PrimitiveSet.cpp:170: propagate edited color through the virtual setter. */
  @meta.implemented
  OnModified(names)
  {
    if (IsMatch(names, "color")) this.SetCurrentColor(this.color);
    return true;
  }


  /** m_localTransform (Matrix) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.mat4
  localTransform = mat4.create();

  /** m_worldTransform (Matrix) [READ] */
  @meta.blue.read
  @meta.type.mat4
  worldTransform = mat4.create();

  /** m_pythonUserData (PyObject*) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("PyObject")
  _userData = null;

  /** m_viewOriented (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  viewOriented = false;

  /** m_scaleByDistanceToView (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  scaleByDistanceToView = false;

  /** m_color (Color) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  color = vec4.fromValues(0.5, 0.5, 0.5, 1);

  /** m_scale (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  scale = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  effect = null;

  /** m_pickEffect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  pickEffect = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Carbon method SetCurrentColor (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.noop
  SetCurrentColor(_color)
  {
  }

  static GetBatchesReason = Object.freeze({
    Draw: 0,
    Picking: 1,
  });

}
