import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_name, _init_extra_name, _init_options, _init_extra_options, _init_defaultOption, _init_extra_defaultOption, _init_description, _init_extra_description, _init_type, _init_extra_type;

/** Tr2ShaderPermutation (resources) - generated from schema shapeHash baf42e3d.... */
let _Tr2ShaderPermutation;
class Tr2ShaderPermutation extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_options, _init_extra_options, _init_defaultOption, _init_extra_defaultOption, _init_description, _init_extra_description, _init_type, _init_extra_type],
      c: [_Tr2ShaderPermutation, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ShaderPermutation",
      family: "resources"
    })], [[[type, type.string], 16, "name"], [type.list("BlueSharedString"), 0, "options"], [[type, type.uint64], 16, "defaultOption"], [[type, type.string], 16, "description"], [[type, type.uint8], 16, "type"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_type(this);
  }
  /** name (BlueSharedString) */
  name = _init_name(this, "");

  /** options (std::vector<BlueSharedString>) */
  options = (_init_extra_name(this), _init_options(this, []));

  /** defaultOption (size_t) */
  defaultOption = (_init_extra_options(this), _init_defaultOption(this, 0));

  /** description (std::string) */
  description = (_init_extra_defaultOption(this), _init_description(this, ""));

  /** type (uint8_t) */
  type = (_init_extra_description(this), _init_type(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2ShaderPermutation as Tr2ShaderPermutation };
//# sourceMappingURL=Tr2ShaderPermutation.js.map
