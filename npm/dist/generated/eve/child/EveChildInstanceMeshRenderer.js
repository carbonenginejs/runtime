import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildMesh as _EveChildMesh } from '../../../eve/child/EveChildMesh.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { RotationalConstraints } from './enums.js';

let _initProto, _initClass, _init_rotationConstraint, _init_extra_rotationConstraint, _init_staticOffsetRotation, _init_extra_staticOffsetRotation, _init_staticOffsetTranslation, _init_extra_staticOffsetTranslation, _init_distribution, _init_extra_distribution, _init_staticOffsetScale, _init_extra_staticOffsetScale;

/** EveChildInstanceMeshRenderer (eve/child) - generated from schema shapeHash 61c42c4d.... */
let _EveChildInstanceMesh;
new class extends _identity {
  static [class EveChildInstanceMeshRenderer extends _EveChildMesh {
    static {
      ({
        e: [_init_rotationConstraint, _init_extra_rotationConstraint, _init_staticOffsetRotation, _init_extra_staticOffsetRotation, _init_staticOffsetTranslation, _init_extra_staticOffsetTranslation, _init_distribution, _init_extra_distribution, _init_staticOffsetScale, _init_extra_staticOffsetScale, _initProto],
        c: [_EveChildInstanceMesh, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildInstanceMeshRenderer",
        family: "eve/child"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("RotationalConstraints")], 16, "rotationConstraint"], [[io, io.persist, type, type.quat], 16, "staticOffsetRotation"], [[io, io.persist, type, type.vec3], 16, "staticOffsetTranslation"], [[io, io.persist, void 0, type.model("IEveDistributionMethod")], 16, "distribution"], [[io, io.persist, type, type.vec3], 16, "staticOffsetScale"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RefreshStaticGeometry"]], 0, void 0, _EveChildMesh));
    }
    constructor(...args) {
      super(...args);
      _init_extra_staticOffsetScale(this);
    }
    /** m_rotationConstraint (RotationalConstraints - enum RotationalConstraints) [READWRITE, PERSIST, ENUM] */
    rotationConstraint = (_initProto(this), _init_rotationConstraint(this, 0));

    /** m_staticOffsetRotation (Quaternion) [READWRITE, PERSIST] */
    staticOffsetRotation = (_init_extra_rotationConstraint(this), _init_staticOffsetRotation(this, quat.create()));

    /** m_staticOffsetTranslation (Vector3) [READWRITE, PERSIST] */
    staticOffsetTranslation = (_init_extra_staticOffsetRotation(this), _init_staticOffsetTranslation(this, vec3.create()));

    /** m_distribution (IEveDistributionMethodPtr) [READWRITE, PERSIST] */
    distribution = (_init_extra_staticOffsetTranslation(this), _init_distribution(this, null));

    /** m_staticOffsetScale (Vector3) [READWRITE, PERSIST] */
    staticOffsetScale = (_init_extra_distribution(this), _init_staticOffsetScale(this, vec3.fromValues(1, 1, 1)));

    /** Carbon method RefreshStaticGeometry (MAP_METHOD_AND_WRAP). */
    RefreshStaticGeometry(...args) {
      throw new Error("EveChildInstanceMeshRenderer.RefreshStaticGeometry is not implemented in CarbonEngineJS.");
    }
  }];
  RotationalConstraints = RotationalConstraints;
  constructor() {
    super(_EveChildInstanceMesh), _initClass();
  }
}();

export { _EveChildInstanceMesh as EveChildInstanceMeshRenderer };
//# sourceMappingURL=EveChildInstanceMeshRenderer.js.map
