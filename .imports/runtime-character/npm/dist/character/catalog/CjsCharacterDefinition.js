import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_sourcePath, _init_extra_sourcePath, _init_extension, _init_extra_extension, _init_values, _init_extra_values;

/** Lossless JSON value decoded from one indexed character definition file. */
let _CjsCharacterDefiniti;
class CjsCharacterDefinition extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_sourcePath, _init_extra_sourcePath, _init_extension, _init_extra_extension, _init_values, _init_extra_values],
      c: [_CjsCharacterDefiniti, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterDefinition",
      family: "character"
    })], [[[io, io.readwrite, type, type.path], 16, "sourcePath"], [[io, io.readwrite, type, type.string], 16, "extension"], [[io, io.readwrite, type, type.unknown], 16, "values"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_values(this);
  }
  sourcePath = _init_sourcePath(this, "");
  extension = (_init_extra_sourcePath(this), _init_extension(this, ""));
  values = (_init_extra_extension(this), _init_values(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterDefiniti as CjsCharacterDefinition };
//# sourceMappingURL=CjsCharacterDefinition.js.map
