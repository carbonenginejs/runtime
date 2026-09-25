// Source: trinity/trinity/Tr2PrimitiveSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../ITr2Renderable.js";

/** A drawable set of primitives with a world transform, sort value and bounding sphere. */
@type.define({ className: "Tr2PrimitiveSet", family: "trinityCore" })
@carbon.inherit(ITr2Renderable)
export class Tr2PrimitiveSet extends CjsModel
{

  /** m_localTransform (Matrix) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.mat4
  localTransform = mat4.create();

  /** m_worldTransform (Matrix) [READ] */
  @edit.read
  @type.mat4
  worldTransform = mat4.create();

  /** m_pythonUserData (PyObject*) [READWRITE] */
  @edit.readwrite
  @type.objectRef("PyObject")
  _userData = null;

  /** m_viewOriented (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  viewOriented = false;

  /** m_scaleByDistanceToView (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  scaleByDistanceToView = false;

  /** m_color (Color) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.color
  color = vec4.fromValues(0.5, 0.5, 0.5, 1);

  /** m_scale (float) [READ] */
  @edit.read
  @type.float32
  scale = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.model("Tr2Effect")
  effect = null;

  /** m_pickEffect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.model("Tr2Effect")
  pickEffect = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** Carbon method SetCurrentColor (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.noop
  SetCurrentColor(_color)
  {
  }

  static GetBatchesReason = Object.freeze({
    Draw: 0,
    Picking: 1,
  });

}
