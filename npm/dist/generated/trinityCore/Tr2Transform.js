import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { Tr2TransformModifier } from './enums.js';

let _initClass, _init_modifier, _init_extra_modifier, _init_localTransform, _init_extra_localTransform, _init_worldTransform, _init_extra_worldTransform, _init_name, _init_extra_name, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_distanceBasedScaleArg, _init_extra_distanceBasedScaleArg, _init_distanceBasedScaleArg2, _init_extra_distanceBasedScaleArg2, _init_mesh, _init_extra_mesh, _init_curveSets, _init_extra_curveSets, _init_useDistanceBasedScale, _init_extra_useDistanceBasedScale, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_sortValueMultiplier, _init_extra_sortValueMultiplier;

/** Tr2Transform (trinityCore) - generated from schema shapeHash 28d5a6ca.... */
let _Tr2Transform;
new class extends _identity {
  static [class Tr2Transform extends CjsModel {
    static {
      ({
        e: [_init_modifier, _init_extra_modifier, _init_localTransform, _init_extra_localTransform, _init_worldTransform, _init_extra_worldTransform, _init_name, _init_extra_name, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_distanceBasedScaleArg, _init_extra_distanceBasedScaleArg, _init_distanceBasedScaleArg2, _init_extra_distanceBasedScaleArg2, _init_mesh, _init_extra_mesh, _init_curveSets, _init_extra_curveSets, _init_useDistanceBasedScale, _init_extra_useDistanceBasedScale, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_sortValueMultiplier, _init_extra_sortValueMultiplier],
        c: [_Tr2Transform, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Transform",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Tr2TransformModifier")], 16, "modifier"], [[io, io.read, type, type.mat4], 16, "localTransform"], [[io, io.read, type, type.mat4], 16, "worldTransform"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.float32], 16, "distanceBasedScaleArg1"], [[io, io.persist, type, type.float32], 16, "distanceBasedScaleArg2"], [[io, io.persist, void 0, type.model("Tr2MeshBase")], 16, "mesh"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.persist, type, type.boolean], 16, "useDistanceBasedScale"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.boolean], 16, "update"], [[io, io.persist, type, type.float32], 16, "sortValueMultiplier"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_sortValueMultiplier(this);
    }
    /** m_modifier (Tr2TransformModifier - enum Tr2TransformModifier) [READWRITE, PERSIST, ENUM] */
    modifier = _init_modifier(this, 0);

    /** m_localTransform (Matrix) [READ] */
    localTransform = (_init_extra_modifier(this), _init_localTransform(this, mat4.create()));

    /** m_worldTransform (Matrix) [READ] */
    worldTransform = (_init_extra_localTransform(this), _init_worldTransform(this, mat4.create()));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_worldTransform(this), _init_name(this, ""));

    /** m_scaling (Vector3) [READWRITE, PERSIST] */
    scaling = (_init_extra_name(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_scaling(this), _init_rotation(this, quat.create()));

    /** m_translation (Vector3) [READWRITE, PERSIST] */
    translation = (_init_extra_rotation(this), _init_translation(this, vec3.create()));

    /** m_distanceBasedScaleArg1 (float) [READWRITE, PERSIST] */
    distanceBasedScaleArg1 = (_init_extra_translation(this), _init_distanceBasedScaleArg(this, 0.2));

    /** m_distanceBasedScaleArg2 (float) [READWRITE, PERSIST] */
    distanceBasedScaleArg2 = (_init_extra_distanceBasedScaleArg(this), _init_distanceBasedScaleArg2(this, 0.63));

    /** m_mesh (Tr2MeshBasePtr) [READWRITE, PERSIST] */
    mesh = (_init_extra_distanceBasedScaleArg2(this), _init_mesh(this, null));

    /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
    curveSets = (_init_extra_mesh(this), _init_curveSets(this, []));

    /** m_useDistanceBasedScale (bool) [READWRITE, PERSIST] */
    useDistanceBasedScale = (_init_extra_curveSets(this), _init_useDistanceBasedScale(this, false));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_useDistanceBasedScale(this), _init_display(this, true));

    /** m_update (bool) [READWRITE, PERSIST] */
    update = (_init_extra_display(this), _init_update(this, true));

    /** m_sortValueMultiplier (float) [READWRITE, PERSIST] */
    sortValueMultiplier = (_init_extra_update(this), _init_sortValueMultiplier(this, 1));
  }];
  Tr2TransformModifier = Tr2TransformModifier;
  constructor() {
    super(_Tr2Transform), _initClass();
  }
}();

export { _Tr2Transform as Tr2Transform };
//# sourceMappingURL=Tr2Transform.js.map
