import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_vertices, _init_extra_vertices, _init_indices, _init_extra_indices, _init_minBounds, _init_extra_minBounds, _init_maxBounds, _init_extra_maxBounds;

/** Tr2AudGeometryData (trinityAudioApi) - generated from schema shapeHash 92764465.... */
let _Tr2AudGeometryData;
class Tr2AudGeometryData extends CjsModel {
  static {
    ({
      e: [_init_vertices, _init_extra_vertices, _init_indices, _init_extra_indices, _init_minBounds, _init_extra_minBounds, _init_maxBounds, _init_extra_maxBounds],
      c: [_Tr2AudGeometryData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2AudGeometryData",
      family: "trinityAudioApi"
    })], [[type.list("Vector3"), 0, "vertices"], [type.list("uint32_t"), 0, "indices"], [[type, type.vec3], 16, "minBounds"], [[type, type.vec3], 16, "maxBounds"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_maxBounds(this);
  }
  /** m_vertices (std::vector<Vector3>) */
  vertices = _init_vertices(this, []);

  /** m_indices (std::vector<uint32_t>) */
  indices = (_init_extra_vertices(this), _init_indices(this, []));

  /** m_minBounds (Vector3) */
  minBounds = (_init_extra_indices(this), _init_minBounds(this, vec3.create()));

  /** m_maxBounds (Vector3) */
  maxBounds = (_init_extra_minBounds(this), _init_maxBounds(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _Tr2AudGeometryData as Tr2AudGeometryData };
//# sourceMappingURL=Tr2AudGeometryData.js.map
