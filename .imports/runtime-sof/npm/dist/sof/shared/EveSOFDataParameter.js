import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_name, _init_extra_name, _init_value, _init_extra_value;

/** EveSOFDataParameter (eve) - generated from schema shapeHash 148eba9e.... */
let _EveSOFDataParameter;
class EveSOFDataParameter extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_value, _init_extra_value],
      c: [_EveSOFDataParameter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataParameter",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec4], 16, "value"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_value (Vector4) [READWRITE, PERSIST] */
  value = (_init_extra_name(this), _init_value(this, vec4.create()));
  Assign(out = {}, prefix = "") {
    out[prefix ? prefix + this.name : this.name] = Array.from(this.value);
    return out;
  }
  static combineArrays(base = [], overrides = null, out = []) {
    const validNames = new Set(base.map(value => value.name));
    for (let index = out.length - 1; index >= 0; index--) {
      if (!validNames.has(out[index].name)) out.splice(index, 1);
    }
    for (const value of base) {
      let result = out.find(candidate => candidate.name === value.name);
      if (!result) {
        result = new this();
        result.name = value.name;
        out.push(result);
      }
      const override = overrides?.find(candidate => candidate.name === value.name);
      vec4.copy(result.value, override?.value ?? value.value);
    }
    return out;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataParameter as EveSOFDataParameter };
//# sourceMappingURL=EveSOFDataParameter.js.map
