import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_layer, _init_extra_layer, _init_op, _init_extra_op, _init_inputs, _init_extra_inputs, _init_coverage, _init_extra_coverage, _init_destination, _init_extra_destination, _init_blend, _init_extra_blend, _init_write, _init_extra_write, _init_strength, _init_extra_strength, _init_origin, _init_extra_origin;

/** One ordered logical operation in a character texture-composition target. */
let _CjsCharacterComposit;
class CjsCharacterCompositionPass extends CjsModel {
  static {
    ({
      e: [_init_layer, _init_extra_layer, _init_op, _init_extra_op, _init_inputs, _init_extra_inputs, _init_coverage, _init_extra_coverage, _init_destination, _init_extra_destination, _init_blend, _init_extra_blend, _init_write, _init_extra_write, _init_strength, _init_extra_strength, _init_origin, _init_extra_origin],
      c: [_CjsCharacterComposit, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterCompositionPass",
      family: "character"
    })], [[[io, io.readwrite, void 0, type.model("CjsCharacterAppearanceLayer")], 16, "layer"], [[io, io.readwrite, type, type.string], 16, "op"], [[io, io.readwrite, void 0, type.list("CjsCharacterCompositionInput")], 16, "inputs"], [[io, io.readwrite, void 0, type.model("CjsCharacterCoverage")], 16, "coverage"], [[io, io.readwrite, type, type.vec4], 16, "destination"], [[io, io.readwrite, type, type.string], 16, "blend"], [[io, io.readwrite, type, type.string], 16, "write"], [[io, io.readwrite, type, type.float64], 16, "strength"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  layer = _init_layer(this, null);
  op = (_init_extra_layer(this), _init_op(this, ""));
  inputs = (_init_extra_op(this), _init_inputs(this, []));
  coverage = (_init_extra_inputs(this), _init_coverage(this, null));
  destination = (_init_extra_coverage(this), _init_destination(this, null));
  blend = (_init_extra_destination(this), _init_blend(this, "replace"));
  write = (_init_extra_blend(this), _init_write(this, "rgba"));
  strength = (_init_extra_write(this), _init_strength(this, null));
  origin = (_init_extra_strength(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterComposit as CjsCharacterCompositionPass };
//# sourceMappingURL=CjsCharacterCompositionPass.js.map
