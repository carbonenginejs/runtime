import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_configurationPath, _init_extra_configurationPath, _init_geometryPath, _init_extra_geometryPath, _init_texturePaths, _init_extra_texturePaths, _init_requestedLod, _init_extra_requestedLod, _init_resolvedLod, _init_extra_resolvedLod, _init_modelFamily, _init_extra_modelFamily, _init_origin, _init_extra_origin;

/** Plan-local source-version contributor with optional exact configuration and geometry choices. */
let _CjsCharacterResolved;
class CjsCharacterResolvedPart extends CjsModel {
  static {
    ({
      e: [_init_configurationPath, _init_extra_configurationPath, _init_geometryPath, _init_extra_geometryPath, _init_texturePaths, _init_extra_texturePaths, _init_requestedLod, _init_extra_requestedLod, _init_resolvedLod, _init_extra_resolvedLod, _init_modelFamily, _init_extra_modelFamily, _init_origin, _init_extra_origin],
      c: [_CjsCharacterResolved, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterResolvedPart",
      family: "character"
    })], [[[io, io.readwrite, type, type.path], 16, "configurationPath"], [[io, io.readwrite, type, type.path], 16, "geometryPath"], [[io, io.readwrite, void 0, type.list("string")], 16, "texturePaths"], [[io, io.readwrite, type, type.int32], 16, "requestedLod"], [[io, io.readwrite, type, type.int32], 16, "resolvedLod"], [[io, io.readwrite, type, type.string], 16, "modelFamily"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  configurationPath = _init_configurationPath(this, null);
  geometryPath = (_init_extra_configurationPath(this), _init_geometryPath(this, null));
  texturePaths = (_init_extra_geometryPath(this), _init_texturePaths(this, []));
  requestedLod = (_init_extra_texturePaths(this), _init_requestedLod(this, null));
  resolvedLod = (_init_extra_requestedLod(this), _init_resolvedLod(this, null));
  modelFamily = (_init_extra_resolvedLod(this), _init_modelFamily(this, null));
  origin = (_init_extra_modelFamily(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterResolved as CjsCharacterResolvedPart };
//# sourceMappingURL=CjsCharacterResolvedPart.js.map
