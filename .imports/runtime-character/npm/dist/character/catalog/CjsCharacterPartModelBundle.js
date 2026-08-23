import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_configurationPath, _init_extra_configurationPath, _init_geometryPath, _init_extra_geometryPath, _init_lod, _init_extra_lod, _init_lodOrigin, _init_extra_lodOrigin, _init_modelFamily, _init_extra_modelFamily, _init_modelFamilyOrigin, _init_extra_modelFamilyOrigin;

/** One producer-verified atomic configuration/geometry relationship. */
let _CjsCharacterPartMode;
class CjsCharacterPartModelBundle extends CjsModel {
  static {
    ({
      e: [_init_configurationPath, _init_extra_configurationPath, _init_geometryPath, _init_extra_geometryPath, _init_lod, _init_extra_lod, _init_lodOrigin, _init_extra_lodOrigin, _init_modelFamily, _init_extra_modelFamily, _init_modelFamilyOrigin, _init_extra_modelFamilyOrigin],
      c: [_CjsCharacterPartMode, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPartModelBundle",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "configurationPath"], [[io, io.readwrite, type, type.string], 16, "geometryPath"], [[io, io.readwrite, type, type.int32], 16, "lod"], [[io, io.readwrite, type, type.string], 16, "lodOrigin"], [[io, io.readwrite, type, type.string], 16, "modelFamily"], [[io, io.readwrite, type, type.string], 16, "modelFamilyOrigin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_modelFamilyOrigin(this);
  }
  configurationPath = _init_configurationPath(this, null);
  geometryPath = (_init_extra_configurationPath(this), _init_geometryPath(this, null));
  lod = (_init_extra_geometryPath(this), _init_lod(this, null));
  lodOrigin = (_init_extra_lod(this), _init_lodOrigin(this, null));
  modelFamily = (_init_extra_lodOrigin(this), _init_modelFamily(this, null));
  modelFamilyOrigin = (_init_extra_modelFamily(this), _init_modelFamilyOrigin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterPartMode as CjsCharacterPartModelBundle };
//# sourceMappingURL=CjsCharacterPartModelBundle.js.map
