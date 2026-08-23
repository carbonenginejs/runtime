import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_localTransform, _init_extra_localTransform, _init_worldTransform, _init_extra_worldTransform, _init__userData, _init_extra__userData, _init_viewOriented, _init_extra_viewOriented, _init_scaleByDistanceToView, _init_extra_scaleByDistanceToView, _init_color, _init_extra_color, _init_scale, _init_extra_scale, _init_effect, _init_extra_effect, _init_pickEffect, _init_extra_pickEffect, _init_name, _init_extra_name;

/** A drawable set of primitives with a world transform, sort value and bounding sphere. */
let _Tr2PrimitiveSet;
new class extends _identity {
  static [class Tr2PrimitiveSet extends CjsModel {
    static {
      ({
        e: [_init_localTransform, _init_extra_localTransform, _init_worldTransform, _init_extra_worldTransform, _init__userData, _init_extra__userData, _init_viewOriented, _init_extra_viewOriented, _init_scaleByDistanceToView, _init_extra_scaleByDistanceToView, _init_color, _init_extra_color, _init_scale, _init_extra_scale, _init_effect, _init_extra_effect, _init_pickEffect, _init_extra_pickEffect, _init_name, _init_extra_name, _initProto],
        c: [_Tr2PrimitiveSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PrimitiveSet",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.mat4], 16, "localTransform"], [[io, io.read, type, type.mat4], 16, "worldTransform"], [[io, io.readwrite, void 0, type.objectRef("PyObject")], 16, "_userData"], [[io, io.persist, type, type.boolean], 16, "viewOriented"], [[io, io.persist, type, type.boolean], 16, "scaleByDistanceToView"], [[io, io.notify, io, io.persist, type, type.color], 16, "color"], [[io, io.read, type, type.float32], 16, "scale"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "effect"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "pickEffect"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.noop], 18, "SetCurrentColor"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_name(this);
    }
    /** m_localTransform (Matrix) [READWRITE, PERSIST] */
    localTransform = (_initProto(this), _init_localTransform(this, mat4.create()));

    /** m_worldTransform (Matrix) [READ] */
    worldTransform = (_init_extra_localTransform(this), _init_worldTransform(this, mat4.create()));

    /** m_pythonUserData (PyObject*) [READWRITE] */
    _userData = (_init_extra_worldTransform(this), _init__userData(this, null));

    /** m_viewOriented (bool) [READWRITE, PERSIST] */
    viewOriented = (_init_extra__userData(this), _init_viewOriented(this, false));

    /** m_scaleByDistanceToView (bool) [READWRITE, PERSIST] */
    scaleByDistanceToView = (_init_extra_viewOriented(this), _init_scaleByDistanceToView(this, false));

    /** m_color (Color) [READWRITE, NOTIFY, PERSIST] */
    color = (_init_extra_scaleByDistanceToView(this), _init_color(this, vec4.fromValues(0.5, 0.5, 0.5, 1)));

    /** m_scale (float) [READ] */
    scale = (_init_extra_color(this), _init_scale(this, 1));

    /** m_effect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
    effect = (_init_extra_scale(this), _init_effect(this, null));

    /** m_pickEffect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
    pickEffect = (_init_extra_effect(this), _init_pickEffect(this, null));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_pickEffect(this), _init_name(this, ""));

    /** Carbon method SetCurrentColor (MAP_METHOD_AND_WRAP). */
    SetCurrentColor(_color) {}
  }];
  GetBatchesReason = Object.freeze({
    Draw: 0,
    Picking: 1
  });
  constructor() {
    super(_Tr2PrimitiveSet), _initClass();
  }
}();

export { _Tr2PrimitiveSet as Tr2PrimitiveSet };
//# sourceMappingURL=Tr2PrimitiveSet.js.map
