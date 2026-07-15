import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsObjectDTO as _CjsObjectDTO } from './CjsObjectDTO.js';

let _initClass, _init_techniques, _init_extra_techniques, _init_permutations, _init_extra_permutations, _init_passes, _init_extra_passes, _init_signature, _init_extra_signature;

/**
 * Shader/effect-oriented DTO used by shader formats.
 */
let _CjsShaderDTO;
new class extends _identity {
  static [class CjsShaderDTO extends _CjsObjectDTO {
    static {
      ({
        e: [_init_techniques, _init_extra_techniques, _init_permutations, _init_extra_permutations, _init_passes, _init_extra_passes, _init_signature, _init_extra_signature],
        c: [_CjsShaderDTO, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsShaderDTO",
        family: "resource"
      })], [[[io, io.persist, void 0, type.list("unknown")], 16, "techniques"], [[io, io.persist, void 0, type.list("unknown")], 16, "permutations"], [[io, io.persist, void 0, type.list("unknown")], 16, "passes"], [[io, io.persist, type, type.unknown], 16, "signature"]], 0, void 0, _CjsObjectDTO));
    }
    techniques = _init_techniques(this, []);
    permutations = (_init_extra_techniques(this), _init_permutations(this, []));
    passes = (_init_extra_permutations(this), _init_passes(this, []));
    signature = (_init_extra_passes(this), _init_signature(this, null));
    constructor(values = null) {
      super(), _init_extra_signature(this);
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }
  }];
  payload = "shader";
  constructor() {
    super(_CjsShaderDTO), _initClass();
  }
}();

export { _CjsShaderDTO as CjsShaderDTO };
//# sourceMappingURL=CjsShaderDTO.js.map
