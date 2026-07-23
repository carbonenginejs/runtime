import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_entryIndex, _init_extra_entryIndex, _init_code, _init_extra_code, _init_message, _init_extra_message, _init_blocking, _init_extra_blocking, _init_candidatePartIDs, _init_extra_candidatePartIDs;
let _CjsCharacterResoluti;
class CjsCharacterResolutionIssue extends _CjsCharacterNode {
  static {
    ({
      e: [_init_entryIndex, _init_extra_entryIndex, _init_code, _init_extra_code, _init_message, _init_extra_message, _init_blocking, _init_extra_blocking, _init_candidatePartIDs, _init_extra_candidatePartIDs],
      c: [_CjsCharacterResoluti, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterResolutionIssue",
      family: "character"
    })], [[[type, type.int32, io, io.persist], 16, "entryIndex"], [[type, type.string, io, io.persist], 16, "code"], [[type, type.string, io, io.persist], 16, "message"], [[type, type.boolean, io, io.persist], 16, "blocking"], [[void 0, type.list("string"), io, io.persist], 16, "candidatePartIDs"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_candidatePartIDs(this);
  }
  entryIndex = _init_entryIndex(this, -1);
  code = (_init_extra_entryIndex(this), _init_code(this, ""));
  message = (_init_extra_code(this), _init_message(this, ""));
  blocking = (_init_extra_message(this), _init_blocking(this, true));
  candidatePartIDs = (_init_extra_blocking(this), _init_candidatePartIDs(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterResoluti as CjsCharacterResolutionIssue };
//# sourceMappingURL=CjsCharacterResolutionIssue.js.map
