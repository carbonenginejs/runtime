import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_position, _init_extra_position, _init_hasPosition, _init_extra_hasPosition, _init_normal, _init_extra_normal, _init_hasNormal, _init_extra_hasNormal, _init_uv, _init_extra_uv, _init_hasUv, _init_extra_hasUv, _init_boneIndex, _init_extra_boneIndex, _init_hasBoneIndex, _init_extra_hasBoneIndex, _init_meshIndex, _init_extra_meshIndex, _init_areaIndex, _init_extra_areaIndex;

/** Tr2GrannyIntersectionResult (resources) - generated from schema shapeHash f0ccc62b.... */
let _Tr2GrannyIntersectio;
class Tr2GrannyIntersectionResult extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_hasPosition, _init_extra_hasPosition, _init_normal, _init_extra_normal, _init_hasNormal, _init_extra_hasNormal, _init_uv, _init_extra_uv, _init_hasUv, _init_extra_hasUv, _init_boneIndex, _init_extra_boneIndex, _init_hasBoneIndex, _init_extra_hasBoneIndex, _init_meshIndex, _init_extra_meshIndex, _init_areaIndex, _init_extra_areaIndex],
      c: [_Tr2GrannyIntersectio, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GrannyIntersectionResult",
      family: "resources"
    })], [[[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "position"], [[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "hasPosition"], [[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "normal"], [[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "hasNormal"], [[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "uv"], [[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "hasUv"], [[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "boneIndex"], [[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "hasBoneIndex"], [[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "meshIndex"], [[io, io.readwrite, void 0, type.rawStruct("Result")], 16, "areaIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_areaIndex(this);
  }
  /** m_result.position (Result) [READWRITE] */
  position = _init_position(this, null);

  /** m_result.hasPosition (Result) [READWRITE] */
  hasPosition = (_init_extra_position(this), _init_hasPosition(this, null));

  /** m_result.normal (Result) [READWRITE] */
  normal = (_init_extra_hasPosition(this), _init_normal(this, null));

  /** m_result.hasNormal (Result) [READWRITE] */
  hasNormal = (_init_extra_normal(this), _init_hasNormal(this, null));

  /** m_result.uv (Result) [READWRITE] */
  uv = (_init_extra_hasNormal(this), _init_uv(this, null));

  /** m_result.hasUv (Result) [READWRITE] */
  hasUv = (_init_extra_uv(this), _init_hasUv(this, null));

  /** m_result.boneIndex (Result) [READWRITE] */
  boneIndex = (_init_extra_hasUv(this), _init_boneIndex(this, null));

  /** m_result.hasBoneIndex (Result) [READWRITE] */
  hasBoneIndex = (_init_extra_boneIndex(this), _init_hasBoneIndex(this, null));

  /** m_result.meshIndex (Result) [READWRITE] */
  meshIndex = (_init_extra_hasBoneIndex(this), _init_meshIndex(this, null));

  /** m_result.areaIndex (Result) [READWRITE] */
  areaIndex = (_init_extra_meshIndex(this), _init_areaIndex(this, null));
  static {
    _initClass();
  }
}

export { _Tr2GrannyIntersectio as Tr2GrannyIntersectionResult };
//# sourceMappingURL=Tr2GrannyIntersectionResult.js.map
