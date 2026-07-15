import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { vec3 } from '@carbonenginejs/core-math/vec3';

let _initClass, _init_id, _init_extra_id, _init_vertices, _init_extra_vertices, _init_indices, _init_extra_indices, _init_minBounds, _init_extra_minBounds, _init_maxBounds, _init_extra_maxBounds, _init_s_nextId, _init_extra_s_nextId;

/** AudioGeometryResData (resources) - generated from schema shapeHash 89e7ddb7.... */
let _AudioGeometryResData;
class AudioGeometryResData extends CjsModel {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_vertices, _init_extra_vertices, _init_indices, _init_extra_indices, _init_minBounds, _init_extra_minBounds, _init_maxBounds, _init_extra_maxBounds, _init_s_nextId, _init_extra_s_nextId],
      c: [_AudioGeometryResData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudioGeometryResData",
      family: "resources"
    })], [[[type, type.uint64], 16, "id"], [type.list("Vector3"), 0, "vertices"], [type.list("uint32_t"), 0, "indices"], [[type, type.vec3], 16, "minBounds"], [[type, type.vec3], 16, "maxBounds"], [type.rawStruct("static std::atomic<uint64_t>"), 0, "s_nextId"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_s_nextId(this);
  }
  /** m_id (uint64_t) */
  id = _init_id(this, 0);

  /** m_vertices (std::vector<Vector3>) */
  vertices = (_init_extra_id(this), _init_vertices(this, []));

  /** m_indices (std::vector<uint32_t>) */
  indices = (_init_extra_vertices(this), _init_indices(this, []));

  /** m_minBounds (Vector3) */
  minBounds = (_init_extra_indices(this), _init_minBounds(this, vec3.create()));

  /** m_maxBounds (Vector3) */
  maxBounds = (_init_extra_minBounds(this), _init_maxBounds(this, vec3.create()));

  /** s_nextId (static std::atomic<uint64_t>) */
  s_nextId = (_init_extra_maxBounds(this), _init_s_nextId(this, null));
  static {
    _initClass();
  }
}

export { _AudioGeometryResData as AudioGeometryResData };
//# sourceMappingURL=AudioGeometryResData.js.map
