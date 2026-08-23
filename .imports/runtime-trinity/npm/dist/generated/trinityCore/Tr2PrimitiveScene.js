import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_primitives, _init_extra_primitives, _init_textLabels, _init_extra_textLabels, _init_manipulator, _init_extra_manipulator;

/** Tr2PrimitiveScene (trinityCore) - generated from schema shapeHash bc11ea31.... */
let _Tr2PrimitiveScene;
class Tr2PrimitiveScene extends CjsModel {
  static {
    ({
      e: [_init_primitives, _init_extra_primitives, _init_textLabels, _init_extra_textLabels, _init_manipulator, _init_extra_manipulator, _initProto],
      c: [_Tr2PrimitiveScene, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PrimitiveScene",
      family: "trinityCore"
    })], [[[io, io.persist, void 0, type.list("Tr2PrimitiveSet")], 16, "primitives"], [[io, io.persist, void 0, type.list("Tr2PrimitiveText")], 16, "textLabels"], [[io, io.readwrite, void 0, type.objectRef("Tr2ManipulationTool")], 16, "manipulator"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PickObject"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PickPointAndObject"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_manipulator(this);
  }
  /** m_primitives (PTr2PrimitiveSetVector) [READ, PERSIST] */
  primitives = (_initProto(this), _init_primitives(this, []));

  /** m_textLabels (PTr2PrimitiveTextVector) [READ, PERSIST] */
  textLabels = (_init_extra_primitives(this), _init_textLabels(this, []));

  /** m_manipulator (Tr2ManipulationToolPtr) [READWRITE] */
  manipulator = (_init_extra_textLabels(this), _init_manipulator(this, null));

  /** Carbon method PickObject -> PickObjectOnly (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  PickObject(...args) {
    throw new Error("Tr2PrimitiveScene.PickObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickPointAndObject -> PyPickPointAndObject (MAP_METHOD). */
  PickPointAndObject(...args) {
    throw new Error("Tr2PrimitiveScene.PickPointAndObject is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2PrimitiveScene as Tr2PrimitiveScene };
//# sourceMappingURL=Tr2PrimitiveScene.js.map
