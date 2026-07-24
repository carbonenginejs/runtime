import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_transform, _init_extra_transform;
let _EveLocator;
class EveLocator2 extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_transform, _init_extra_transform, _initProto],
      c: [_EveLocator, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveLocator2",
      family: "eve/utils"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.mat4], 16, "transform"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTransform"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_transform(this);
  }
  name = (_initProto(this), _init_name(this, ""));
  transform = (_init_extra_name(this), _init_transform(this, mat4.create()));
  GetName() {
    return this.name;
  }
  SetName(name) {
    this.name = String(name);
  }
  GetTransform() {
    return this.transform;
  }
  SetTransform(value) {
    mat4.copy(this.transform, value);
  }
  static {
    _initClass();
  }
}

export { _EveLocator as EveLocator2 };
//# sourceMappingURL=EveLocator2.js.map
