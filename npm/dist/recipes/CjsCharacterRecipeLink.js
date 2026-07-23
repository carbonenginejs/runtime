import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_entryIndex, _init_extra_entryIndex, _init_kind, _init_extra_kind, _init_status, _init_extra_status, _init_sourceID, _init_extra_sourceID, _init_partID, _init_extra_partID, _init_metadataID, _init_extra_metadataID, _init_materialID, _init_extra_materialID, _init_morphName, _init_extra_morphName, _init_candidatePartIDs, _init_extra_candidatePartIDs, _init_issueCode, _init_extra_issueCode;
let _CjsCharacterRecipeLi;
class CjsCharacterRecipeLink extends _CjsCharacterNode {
  static {
    ({
      e: [_init_entryIndex, _init_extra_entryIndex, _init_kind, _init_extra_kind, _init_status, _init_extra_status, _init_sourceID, _init_extra_sourceID, _init_partID, _init_extra_partID, _init_metadataID, _init_extra_metadataID, _init_materialID, _init_extra_materialID, _init_morphName, _init_extra_morphName, _init_candidatePartIDs, _init_extra_candidatePartIDs, _init_issueCode, _init_extra_issueCode],
      c: [_CjsCharacterRecipeLi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterRecipeLink",
      family: "character"
    })], [[[type, type.uint32, io, io.persist], 16, "entryIndex"], [[type, type.string, io, io.persist], 16, "kind"], [[type, type.string, io, io.persist], 16, "status"], [[type, type.string, io, io.persist], 16, "sourceID"], [[type, type.string, io, io.persist], 16, "partID"], [[type, type.string, io, io.persist], 16, "metadataID"], [[type, type.string, io, io.persist], 16, "materialID"], [[type, type.string, io, io.persist], 16, "morphName"], [[void 0, type.list("string"), io, io.persist], 16, "candidatePartIDs"], [[type, type.string, io, io.persist], 16, "issueCode"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_issueCode(this);
  }
  entryIndex = _init_entryIndex(this, 0);
  kind = (_init_extra_entryIndex(this), _init_kind(this, ""));
  status = (_init_extra_kind(this), _init_status(this, "unresolved"));
  sourceID = (_init_extra_status(this), _init_sourceID(this, null));
  partID = (_init_extra_sourceID(this), _init_partID(this, null));
  metadataID = (_init_extra_partID(this), _init_metadataID(this, null));
  materialID = (_init_extra_metadataID(this), _init_materialID(this, null));
  morphName = (_init_extra_materialID(this), _init_morphName(this, null));
  candidatePartIDs = (_init_extra_morphName(this), _init_candidatePartIDs(this, []));
  issueCode = (_init_extra_candidatePartIDs(this), _init_issueCode(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterRecipeLi as CjsCharacterRecipeLink };
//# sourceMappingURL=CjsCharacterRecipeLink.js.map
