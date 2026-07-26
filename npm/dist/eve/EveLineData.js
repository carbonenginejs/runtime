import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_position, _init_extra_position, _init_color, _init_extra_color, _init_position2, _init_extra_position2, _init_color2, _init_extra_color2;

/** One line in an EveLineSet: two endpoints, each with its own colour. */
let _EveLineData;
class EveLineData extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_color, _init_extra_color, _init_position2, _init_extra_position2, _init_color2, _init_extra_color2],
      c: [_EveLineData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveLineData",
      family: "eve/ui"
    })], [[[type, type.vec3], 16, "position1"], [[type, type.color], 16, "color1"], [[type, type.vec3], 16, "position2"], [[type, type.color], 16, "color2"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_color2(this);
  }
  position1 = _init_position(this, vec3.create());
  color1 = (_init_extra_position(this), _init_color(this, vec4.create()));
  position2 = (_init_extra_color(this), _init_position2(this, vec3.create()));
  color2 = (_init_extra_position2(this), _init_color2(this, vec4.create()));
  static {
    _initClass();
  }
}

export { _EveLineData as EveLineData };
//# sourceMappingURL=EveLineData.js.map
