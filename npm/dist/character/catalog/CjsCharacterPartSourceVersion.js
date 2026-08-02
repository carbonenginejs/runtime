import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_resourceVersion, _init_extra_resourceVersion, _init_configurationCandidates, _init_extra_configurationCandidates, _init_geometryCandidates, _init_extra_geometryCandidates, _init_textureCandidates, _init_extra_textureCandidates;

/** One authored resource-version inventory with unresolved external candidates. */
let _CjsCharacterPartSour;
class CjsCharacterPartSourceVersion extends CjsModel {
  static {
    ({
      e: [_init_resourceVersion, _init_extra_resourceVersion, _init_configurationCandidates, _init_extra_configurationCandidates, _init_geometryCandidates, _init_extra_geometryCandidates, _init_textureCandidates, _init_extra_textureCandidates],
      c: [_CjsCharacterPartSour, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPartSourceVersion",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "resourceVersion"], [[io, io.readwrite, void 0, type.list("string")], 16, "configurationCandidates"], [[io, io.readwrite, void 0, type.list("string")], 16, "geometryCandidates"], [[io, io.readwrite, void 0, type.list("string")], 16, "textureCandidates"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_textureCandidates(this);
  }
  resourceVersion = _init_resourceVersion(this, null);
  configurationCandidates = (_init_extra_resourceVersion(this), _init_configurationCandidates(this, []));
  geometryCandidates = (_init_extra_configurationCandidates(this), _init_geometryCandidates(this, []));
  textureCandidates = (_init_extra_geometryCandidates(this), _init_textureCandidates(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterPartSour as CjsCharacterPartSourceVersion };
//# sourceMappingURL=CjsCharacterPartSourceVersion.js.map
