import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_ref, _init_extra_ref, _init_profile, _init_extra_profile, _init_build, _init_extra_build, _init_checksum, _init_extra_checksum, _init_byteLength, _init_extra_byteLength;
let _CjsCharacterLibraryS;
class CjsCharacterLibrarySource extends _CjsCharacterNode {
  static {
    ({
      e: [_init_ref, _init_extra_ref, _init_profile, _init_extra_profile, _init_build, _init_extra_build, _init_checksum, _init_extra_checksum, _init_byteLength, _init_extra_byteLength],
      c: [_CjsCharacterLibraryS, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterLibrarySource",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "ref"], [[type, type.string, io, io.persist], 16, "profile"], [[type, type.string, io, io.persist], 16, "build"], [[type, type.string, io, io.persist], 16, "checksum"], [[type, type.uint32, io, io.persist], 16, "byteLength"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_byteLength(this);
  }
  ref = _init_ref(this, "");
  profile = (_init_extra_ref(this), _init_profile(this, null));
  build = (_init_extra_profile(this), _init_build(this, null));
  checksum = (_init_extra_build(this), _init_checksum(this, null));
  byteLength = (_init_extra_checksum(this), _init_byteLength(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterLibraryS as CjsCharacterLibrarySource };
//# sourceMappingURL=CjsCharacterLibrarySource.js.map
