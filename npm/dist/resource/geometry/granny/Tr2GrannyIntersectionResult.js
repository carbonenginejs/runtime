import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_position, _init_extra_position, _init_hasPosition, _init_extra_hasPosition, _init_normal, _init_extra_normal, _init_hasNormal, _init_extra_hasNormal, _init_uv, _init_extra_uv, _init_hasUv, _init_extra_hasUv, _init_boneIndex, _init_extra_boneIndex, _init_hasBoneIndex, _init_extra_hasBoneIndex, _init_meshIndex, _init_extra_meshIndex, _init_areaIndex, _init_extra_areaIndex;

/** Tr2GrannyIntersectionResult (resources) - maintained from schema shapeHash f0ccc62b.... */
let _Tr2GrannyIntersectio;
class Tr2GrannyIntersectionResult extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_hasPosition, _init_extra_hasPosition, _init_normal, _init_extra_normal, _init_hasNormal, _init_extra_hasNormal, _init_uv, _init_extra_uv, _init_hasUv, _init_extra_hasUv, _init_boneIndex, _init_extra_boneIndex, _init_hasBoneIndex, _init_extra_hasBoneIndex, _init_meshIndex, _init_extra_meshIndex, _init_areaIndex, _init_extra_areaIndex],
      c: [_Tr2GrannyIntersectio, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GrannyIntersectionResult",
      family: "resources"
    })], [[[io, io.readwrite, type, type.vec3], 16, "position"], [[io, io.readwrite, type, type.boolean], 16, "hasPosition"], [[io, io.readwrite, type, type.vec3], 16, "normal"], [[io, io.readwrite, type, type.boolean], 16, "hasNormal"], [[io, io.readwrite, type, type.vec2], 16, "uv"], [[io, io.readwrite, type, type.boolean], 16, "hasUv"], [[io, io.readwrite, type, type.int32], 16, "boneIndex"], [[io, io.readwrite, type, type.boolean], 16, "hasBoneIndex"], [[io, io.readwrite, type, type.int32], 16, "meshIndex"], [[io, io.readwrite, type, type.int32], 16, "areaIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_areaIndex(this);
  }
  /** m_result.position (Vector3) [READWRITE] */
  position = _init_position(this, vec3.create());

  /** m_result.hasPosition (bool) [READWRITE] */
  hasPosition = (_init_extra_position(this), _init_hasPosition(this, false));

  /** m_result.normal (Vector3) [READWRITE] */
  normal = (_init_extra_hasPosition(this), _init_normal(this, vec3.create()));

  /** m_result.hasNormal (bool) [READWRITE] */
  hasNormal = (_init_extra_normal(this), _init_hasNormal(this, false));

  /** m_result.uv (Vector2) [READWRITE] */
  uv = (_init_extra_hasNormal(this), _init_uv(this, vec2.create()));

  /** m_result.hasUv (bool) [READWRITE] */
  hasUv = (_init_extra_uv(this), _init_hasUv(this, false));

  /** m_result.boneIndex (int32_t) [READWRITE] */
  boneIndex = (_init_extra_hasUv(this), _init_boneIndex(this, 0));

  /** m_result.hasBoneIndex (bool) [READWRITE] */
  hasBoneIndex = (_init_extra_boneIndex(this), _init_hasBoneIndex(this, false));

  /** m_result.meshIndex (int32_t) [READWRITE] */
  meshIndex = (_init_extra_hasBoneIndex(this), _init_meshIndex(this, 0));

  /** m_result.areaIndex (int32_t) [READWRITE] */
  areaIndex = (_init_extra_meshIndex(this), _init_areaIndex(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2GrannyIntersectio as Tr2GrannyIntersectionResult };
//# sourceMappingURL=Tr2GrannyIntersectionResult.js.map
