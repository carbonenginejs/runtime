import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_selectedAxis, _init_extra_selectedAxis, _init_moveCallback, _init_extra_moveCallback, _init_captured, _init_extra_captured, _init_primitives, _init_extra_primitives, _init__userData, _init_extra__userData, _init_localTransform, _init_extra_localTransform, _init_pivot, _init_extra_pivot, _init_worldTransform, _init_extra_worldTransform;

/** The interactive manipulator base: axis selection, drag handling and the callback a move reports through. */
let _Tr2ManipulationTool;
class Tr2ManipulationTool extends CjsModel {
  static {
    ({
      e: [_init_selectedAxis, _init_extra_selectedAxis, _init_moveCallback, _init_extra_moveCallback, _init_captured, _init_extra_captured, _init_primitives, _init_extra_primitives, _init__userData, _init_extra__userData, _init_localTransform, _init_extra_localTransform, _init_pivot, _init_extra_pivot, _init_worldTransform, _init_extra_worldTransform, _initProto],
      c: [_Tr2ManipulationTool, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ManipulationTool",
      family: "trinityCore"
    })], [[[type, type.string], 16, "selectedAxis"], [type.rawStruct("BlueScriptCallback"), 0, "moveCallback"], [[io, io.readwrite, type, type.boolean], 16, "captured"], [[io, io.read, void 0, type.list("Tr2PrimitiveSet")], 16, "primitives"], [[io, io.readwrite, void 0, type.objectRef("PyObject")], 16, "_userData"], [[io, io.persist, type, type.mat4], 16, "localTransform"], [[io, io.readwrite, type, type.vec3], 16, "pivot"], [[io, io.read, type, type.mat4], 16, "worldTransform"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMoveCallback"], [[carbon, carbon.method, impl, impl.adapted], 18, "SelectAxis"], [[carbon, carbon.method, impl, impl.implemented], 18, "Init"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Move"], [[impl, impl.adapted], 18, "OnMoveCallback"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_worldTransform(this);
  }
  /** Carbon's selected primitive/axis name. */
  selectedAxis = (_initProto(this), _init_selectedAxis(this, ""));

  /** Browser callback replacing BlueScriptCallback. */
  moveCallback = (_init_extra_selectedAxis(this), _init_moveCallback(this, null));

  /** m_captured (bool) [READWRITE] */
  captured = (_init_extra_moveCallback(this), _init_captured(this, false));

  /** m_primitives (PTr2PrimitiveSetVector) [READ] */
  primitives = (_init_extra_captured(this), _init_primitives(this, []));

  /** m_pythonUserData (PyObject*) [READWRITE] */
  _userData = (_init_extra_primitives(this), _init__userData(this, null));

  /** m_localTransform (Matrix) [READWRITE, PERSIST] */
  localTransform = (_init_extra__userData(this), _init_localTransform(this, mat4.create()));

  /** m_pivot (Vector3) [READWRITE] */
  pivot = (_init_extra_localTransform(this), _init_pivot(this, vec3.create()));

  /** m_worldTransform (Matrix) [READ] */
  worldTransform = (_init_extra_pivot(this), _init_worldTransform(this, mat4.create()));

  /** Carbon method SetMoveCallback (MAP_METHOD_AND_WRAP). */
  SetMoveCallback(callback) {
    this.moveCallback = callback ?? null;
  }

  /** Carbon method SelectAxis (MAP_METHOD_AND_WRAP). */
  SelectAxis(axisName) {
    const selected = this.primitives.filter(primitive => primitive?.name === axisName);
    if (selected.length === 0) {
      return false;
    }
    this.ResetPrimitiveColors?.();
    const yellow = vec4.fromValues(1, 1, 0.01, 1);
    for (const primitive of selected) {
      primitive.SetCurrentColor?.(yellow);
    }
    this.selectedAxis = axisName;
    return true;
  }

  /** Carbon method Init (MAP_METHOD_AND_WRAP). */
  Init(initialTransform) {
    mat4.copy(this.localTransform, initialTransform);
  }

  /** Carbon method Move -> PyMove (MAP_METHOD_AND_WRAP). */
  Move(...args) {
    throw new Error("Tr2ManipulationTool.Move is not implemented in CarbonEngineJS.");
  }

  /** Invokes Carbon's move veto callback with current and proposed transforms. */
  OnMoveCallback(currentTransform, nextTransform) {
    if (!this.moveCallback) {
      return true;
    }
    if (typeof this.moveCallback === "function") {
      return this.moveCallback(currentTransform, nextTransform) !== false;
    }
    return this.moveCallback.Call?.(currentTransform, nextTransform) !== false;
  }
  static {
    _initClass();
  }
}

export { _Tr2ManipulationTool as Tr2ManipulationTool };
//# sourceMappingURL=Tr2ManipulationTool.js.map
