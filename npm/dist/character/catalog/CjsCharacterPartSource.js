import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_sourcePath, _init_extra_sourcePath, _init_sourcePaths, _init_extra_sourcePaths, _init_sex, _init_extra_sex, _init_partPath, _init_extra_partPath, _init_versions, _init_extra_versions, _init_metadata, _init_extra_metadata;

/** One logical character source with its exact authored resource folders and candidates. */
let _CjsCharacterPartSour;
class CjsCharacterPartSource extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_sourcePath, _init_extra_sourcePath, _init_sourcePaths, _init_extra_sourcePaths, _init_sex, _init_extra_sex, _init_partPath, _init_extra_partPath, _init_versions, _init_extra_versions, _init_metadata, _init_extra_metadata],
      c: [_CjsCharacterPartSour, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPartSource",
      family: "character"
    })], [[[io, io.readwrite, type, type.path], 16, "sourcePath"], [[io, io.readwrite, void 0, type.list("string")], 16, "sourcePaths"], [[io, io.readwrite, type, type.string], 16, "sex"], [[io, io.readwrite, type, type.string], 16, "partPath"], [[io, io.readwrite, void 0, type.list("CjsCharacterPartSourceVersion")], 16, "versions"], [[io, io.readwrite, void 0, type.model("CjsCharacterPartMetadata")], 16, "metadata"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_metadata(this);
  }
  sourcePath = _init_sourcePath(this, "");
  sourcePaths = (_init_extra_sourcePath(this), _init_sourcePaths(this, []));
  sex = (_init_extra_sourcePaths(this), _init_sex(this, ""));
  partPath = (_init_extra_sex(this), _init_partPath(this, ""));
  versions = (_init_extra_partPath(this), _init_versions(this, []));
  metadata = (_init_extra_versions(this), _init_metadata(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterPartSour as CjsCharacterPartSource };
//# sourceMappingURL=CjsCharacterPartSource.js.map
