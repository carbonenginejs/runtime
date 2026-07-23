import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_configPaths, _init_extra_configPaths, _init_texturePaths, _init_extra_texturePaths;
let _CjsCharacterResource;
class CjsCharacterResourceSet extends _CjsCharacterNode {
  static {
    ({
      e: [_init_configPaths, _init_extra_configPaths, _init_texturePaths, _init_extra_texturePaths],
      c: [_CjsCharacterResource, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterResourceSet",
      family: "character"
    })], [[[void 0, type.list("path"), io, io.persist], 16, "configPaths"], [[void 0, type.list("path"), io, io.persist], 16, "texturePaths"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_texturePaths(this);
  }
  configPaths = _init_configPaths(this, []);
  texturePaths = (_init_extra_configPaths(this), _init_texturePaths(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterResource as CjsCharacterResourceSet };
//# sourceMappingURL=CjsCharacterResourceSet.js.map
