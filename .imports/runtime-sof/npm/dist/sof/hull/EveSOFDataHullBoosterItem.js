import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_transform, _init_extra_transform, _init_functionality, _init_extra_functionality, _init_hasTrail, _init_extra_hasTrail, _init_atlasIndex, _init_extra_atlasIndex, _init_atlasIndex2, _init_extra_atlasIndex2, _init_lightScale, _init_extra_lightScale;

/** EveSOFDataHullBoosterItem (eve) - generated from schema shapeHash 8b21bdcd.... */
let _EveSOFDataHullBooste;
class EveSOFDataHullBoosterItem extends CjsModel {
  static {
    ({
      e: [_init_transform, _init_extra_transform, _init_functionality, _init_extra_functionality, _init_hasTrail, _init_extra_hasTrail, _init_atlasIndex, _init_extra_atlasIndex, _init_atlasIndex2, _init_extra_atlasIndex2, _init_lightScale, _init_extra_lightScale],
      c: [_EveSOFDataHullBooste, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullBoosterItem",
      family: "eve"
    })], [[[io, io.persist, type, type.mat4], 16, "transform"], [[io, io.persist, type, type.vec4], 16, "functionality"], [[io, io.persist, type, type.boolean], 16, "hasTrail"], [[io, io.persist, type, type.uint32], 16, "atlasIndex0"], [[io, io.persist, type, type.uint32], 16, "atlasIndex1"], [[io, io.persist, type, type.float32], 16, "lightScale"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lightScale(this);
  }
  /** m_transform (Matrix) [READWRITE, PERSIST] */
  transform = _init_transform(this, mat4.create());

  /** m_functionality (Vector4) [READWRITE, PERSIST] */
  functionality = (_init_extra_transform(this), _init_functionality(this, vec4.fromValues(0, 1, 1, 1)));

  /** m_hasTrail (bool) [READWRITE, PERSIST] */
  hasTrail = (_init_extra_functionality(this), _init_hasTrail(this, true));

  /** m_atlasIndex0 (uint32_t) [READWRITE, PERSIST] */
  atlasIndex0 = (_init_extra_hasTrail(this), _init_atlasIndex(this, 0));

  /** m_atlasIndex1 (uint32_t) [READWRITE, PERSIST] */
  atlasIndex1 = (_init_extra_atlasIndex(this), _init_atlasIndex2(this, 0));

  /** m_lightScale (float) [READWRITE, PERSIST] */
  lightScale = (_init_extra_atlasIndex2(this), _init_lightScale(this, 1));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullBooste as EveSOFDataHullBoosterItem };
//# sourceMappingURL=EveSOFDataHullBoosterItem.js.map
