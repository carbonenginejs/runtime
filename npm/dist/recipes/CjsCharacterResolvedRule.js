import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_recipeEntryIndex, _init_extra_recipeEntryIndex, _init_sourceID, _init_extra_sourceID, _init_weight, _init_extra_weight, _init_metadata, _init_extra_metadata;
let _CjsCharacterResolved;
class CjsCharacterResolvedRule extends _CjsCharacterNode {
  static {
    ({
      e: [_init_recipeEntryIndex, _init_extra_recipeEntryIndex, _init_sourceID, _init_extra_sourceID, _init_weight, _init_extra_weight, _init_metadata, _init_extra_metadata],
      c: [_CjsCharacterResolved, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterResolvedRule",
      family: "character"
    })], [[[type, type.uint32, io, io.persist], 16, "recipeEntryIndex"], [[type, type.string, io, io.persist], 16, "sourceID"], [[type, type.float32, io, io.persist], 16, "weight"], [[void 0, type.objectRef("CjsCharacterPartMetadata"), io, io.persist], 16, "metadata"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_metadata(this);
  }
  recipeEntryIndex = _init_recipeEntryIndex(this, 0);
  sourceID = (_init_extra_recipeEntryIndex(this), _init_sourceID(this, ""));
  weight = (_init_extra_sourceID(this), _init_weight(this, 1));
  metadata = (_init_extra_weight(this), _init_metadata(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterResolved as CjsCharacterResolvedRule };
//# sourceMappingURL=CjsCharacterResolvedRule.js.map
