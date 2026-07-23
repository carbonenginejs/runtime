import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_recipeEntryIndex, _init_extra_recipeEntryIndex, _init_partID, _init_extra_partID, _init_typeID, _init_extra_typeID, _init_name, _init_extra_name, _init_sex, _init_extra_sex, _init_category, _init_extra_category, _init_path, _init_extra_path, _init_resourceVersion, _init_extra_resourceVersion, _init_colorVariant, _init_extra_colorVariant, _init_weight, _init_extra_weight, _init_lodBundle, _init_extra_lodBundle, _init_metadata, _init_extra_metadata, _init_materialIDs, _init_extra_materialIDs, _init_projectionID, _init_extra_projectionID, _init_resourcePaths, _init_extra_resourcePaths, _init_dependencies, _init_extra_dependencies;
let _CjsCharacterResolved;
class CjsCharacterResolvedPart extends _CjsCharacterNode {
  static {
    ({
      e: [_init_recipeEntryIndex, _init_extra_recipeEntryIndex, _init_partID, _init_extra_partID, _init_typeID, _init_extra_typeID, _init_name, _init_extra_name, _init_sex, _init_extra_sex, _init_category, _init_extra_category, _init_path, _init_extra_path, _init_resourceVersion, _init_extra_resourceVersion, _init_colorVariant, _init_extra_colorVariant, _init_weight, _init_extra_weight, _init_lodBundle, _init_extra_lodBundle, _init_metadata, _init_extra_metadata, _init_materialIDs, _init_extra_materialIDs, _init_projectionID, _init_extra_projectionID, _init_resourcePaths, _init_extra_resourcePaths, _init_dependencies, _init_extra_dependencies],
      c: [_CjsCharacterResolved, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterResolvedPart",
      family: "character"
    })], [[[type, type.int32, io, io.persist], 16, "recipeEntryIndex"], [[type, type.string, io, io.persist], 16, "partID"], [[type, type.string, io, io.persist], 16, "typeID"], [[type, type.string, io, io.persist], 16, "name"], [[type, type.string, io, io.persist], 16, "sex"], [[type, type.string, io, io.persist], 16, "category"], [[type, type.string, io, io.persist], 16, "path"], [[type, type.string, io, io.persist], 16, "resourceVersion"], [[type, type.string, io, io.persist], 16, "colorVariant"], [[type, type.float32, io, io.persist], 16, "weight"], [[void 0, type.objectRef("CjsCharacterLodBundle"), io, io.persist], 16, "lodBundle"], [[void 0, type.objectRef("CjsCharacterPartMetadata"), io, io.persist], 16, "metadata"], [[void 0, type.list("string"), io, io.persist], 16, "materialIDs"], [[type, type.string, io, io.persist], 16, "projectionID"], [[void 0, type.list("path"), io, io.persist], 16, "resourcePaths"], [[void 0, type.list("CjsCharacterDependency"), io, io.persist], 16, "dependencies"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_dependencies(this);
  }
  recipeEntryIndex = _init_recipeEntryIndex(this, -1);
  partID = (_init_extra_recipeEntryIndex(this), _init_partID(this, ""));
  typeID = (_init_extra_partID(this), _init_typeID(this, null));
  name = (_init_extra_typeID(this), _init_name(this, ""));
  sex = (_init_extra_name(this), _init_sex(this, ""));
  category = (_init_extra_sex(this), _init_category(this, ""));
  path = (_init_extra_category(this), _init_path(this, ""));
  resourceVersion = (_init_extra_path(this), _init_resourceVersion(this, null));
  colorVariant = (_init_extra_resourceVersion(this), _init_colorVariant(this, null));
  weight = (_init_extra_colorVariant(this), _init_weight(this, 1));
  lodBundle = (_init_extra_weight(this), _init_lodBundle(this, null));
  metadata = (_init_extra_lodBundle(this), _init_metadata(this, null));
  materialIDs = (_init_extra_metadata(this), _init_materialIDs(this, []));
  projectionID = (_init_extra_materialIDs(this), _init_projectionID(this, null));
  resourcePaths = (_init_extra_projectionID(this), _init_resourcePaths(this, []));
  dependencies = (_init_extra_resourcePaths(this), _init_dependencies(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterResolved as CjsCharacterResolvedPart };
//# sourceMappingURL=CjsCharacterResolvedPart.js.map
