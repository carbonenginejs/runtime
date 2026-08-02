import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_sourcePath, _init_extra_sourcePath, _init_sex, _init_extra_sex, _init_partPath, _init_extra_partPath, _init_resourceVersion, _init_extra_resourceVersion, _init_colorVariant, _init_extra_colorVariant, _init_partSource, _init_extra_partSource;

/** One published character type definition folded into the combined catalog. */
let _CjsCharacterPartType;
class CjsCharacterPartType extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_sourcePath, _init_extra_sourcePath, _init_sex, _init_extra_sex, _init_partPath, _init_extra_partPath, _init_resourceVersion, _init_extra_resourceVersion, _init_colorVariant, _init_extra_colorVariant, _init_partSource, _init_extra_partSource],
      c: [_CjsCharacterPartType, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPartType",
      family: "character"
    })], [[[io, io.readwrite, type, type.path], 16, "sourcePath"], [[io, io.readwrite, type, type.string], 16, "sex"], [[io, io.readwrite, type, type.string], 16, "partPath"], [[io, io.readwrite, type, type.string], 16, "resourceVersion"], [[io, io.readwrite, type, type.string], 16, "colorVariant"], [[io, io.readwrite, void 0, type.model("CjsCharacterPartSource")], 16, "partSource"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_partSource(this);
  }
  sourcePath = _init_sourcePath(this, "");
  sex = (_init_extra_sourcePath(this), _init_sex(this, ""));
  partPath = (_init_extra_sex(this), _init_partPath(this, ""));
  resourceVersion = (_init_extra_partPath(this), _init_resourceVersion(this, null));
  colorVariant = (_init_extra_resourceVersion(this), _init_colorVariant(this, null));
  partSource = (_init_extra_colorVariant(this), _init_partSource(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterPartType as CjsCharacterPartType };
//# sourceMappingURL=CjsCharacterPartType.js.map
