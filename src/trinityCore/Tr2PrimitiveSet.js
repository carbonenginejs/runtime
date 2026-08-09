// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2PrimitiveSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** A drawable set of primitives with a world transform, sort value and bounding sphere. */
@type.define({ className: "Tr2PrimitiveSet", family: "trinityCore" })
export class Tr2PrimitiveSet extends CjsModel
{

  /** m_localTransform (Matrix) [READWRITE, PERSIST] */
  @io.persist
  @type.mat4
  localTransform = mat4.create();

  /** m_worldTransform (Matrix) [READ] */
  @io.read
  @type.mat4
  worldTransform = mat4.create();

  /** m_pythonUserData (PyObject*) [READWRITE] */
  @io.readwrite
  @type.objectRef("PyObject")
  _userData = null;

  /** m_viewOriented (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  viewOriented = false;

  /** m_scaleByDistanceToView (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  scaleByDistanceToView = false;

  /** m_color (Color) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.color
  color = vec4.fromValues(0.5, 0.5, 0.5, 1);

  /** m_scale (float) [READ] */
  @io.read
  @type.float32
  scale = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  effect = null;

  /** m_pickEffect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  pickEffect = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
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
