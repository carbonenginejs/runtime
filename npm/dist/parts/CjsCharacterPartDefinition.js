import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_typeID, _init_extra_typeID, _init_name, _init_extra_name, _init_sex, _init_extra_sex, _init_category, _init_extra_category, _init_path, _init_extra_path, _init_resourceVersion, _init_extra_resourceVersion, _init_colorVariant, _init_extra_colorVariant, _init_metadataId, _init_extra_metadataId, _init_resourcePaths, _init_extra_resourcePaths, _init_lodBundles, _init_extra_lodBundles, _init_colorIds, _init_extra_colorIds, _init_projectionId, _init_extra_projectionId;
let _CjsCharacterPartDefi;
class CjsCharacterPartDefinition extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_typeID, _init_extra_typeID, _init_name, _init_extra_name, _init_sex, _init_extra_sex, _init_category, _init_extra_category, _init_path, _init_extra_path, _init_resourceVersion, _init_extra_resourceVersion, _init_colorVariant, _init_extra_colorVariant, _init_metadataId, _init_extra_metadataId, _init_resourcePaths, _init_extra_resourcePaths, _init_lodBundles, _init_extra_lodBundles, _init_colorIds, _init_extra_colorIds, _init_projectionId, _init_extra_projectionId],
      c: [_CjsCharacterPartDefi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPartDefinition",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "typeID"], [[type, type.string, io, io.persist], 16, "name"], [[type, type.string, io, io.persist], 16, "sex"], [[type, type.string, io, io.persist], 16, "category"], [[type, type.string, io, io.persist], 16, "path"], [[type, type.string, io, io.persist], 16, "resourceVersion"], [[type, type.string, io, io.persist], 16, "colorVariant"], [[type, type.string, io, io.persist], 16, "metadataId"], [[void 0, type.list("path"), io, io.persist], 16, "resourcePaths"], [[void 0, type.list("CjsCharacterLodBundle"), io, io.persist], 16, "lodBundles"], [[void 0, type.list("string"), io, io.persist], 16, "colorIds"], [[type, type.string, io, io.persist], 16, "projectionId"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_projectionId(this);
  }
  id = _init_id(this, "");
  typeID = (_init_extra_id(this), _init_typeID(this, null));
  name = (_init_extra_typeID(this), _init_name(this, ""));
  sex = (_init_extra_name(this), _init_sex(this, ""));
  category = (_init_extra_sex(this), _init_category(this, ""));
  path = (_init_extra_category(this), _init_path(this, ""));
  resourceVersion = (_init_extra_path(this), _init_resourceVersion(this, null));
  colorVariant = (_init_extra_resourceVersion(this), _init_colorVariant(this, null));
  metadataId = (_init_extra_colorVariant(this), _init_metadataId(this, null));
  resourcePaths = (_init_extra_metadataId(this), _init_resourcePaths(this, []));
  lodBundles = (_init_extra_resourcePaths(this), _init_lodBundles(this, []));
  colorIds = (_init_extra_lodBundles(this), _init_colorIds(this, []));
  projectionId = (_init_extra_colorIds(this), _init_projectionId(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterPartDefi as CjsCharacterPartDefinition };
//# sourceMappingURL=CjsCharacterPartDefinition.js.map
