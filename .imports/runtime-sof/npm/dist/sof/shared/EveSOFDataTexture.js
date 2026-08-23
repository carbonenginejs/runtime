import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name, _init_resFilePath, _init_extra_resFilePath;

/** EveSOFDataTexture (eve) - generated from schema shapeHash b8067c29.... */
let _EveSOFDataTexture;
class EveSOFDataTexture extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_resFilePath, _init_extra_resFilePath],
      c: [_EveSOFDataTexture, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataTexture",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.string], 16, "resFilePath"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_resFilePath(this);
  }
  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_resFilePath (std::string) [READWRITE, PERSIST] */
  resFilePath = (_init_extra_name(this), _init_resFilePath(this, ""));
  Assign(out = {}) {
    out[this.name] = this.resFilePath;
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
      result.resFilePath = override?.resFilePath || value.resFilePath;
    }
    return out;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataTexture as EveSOFDataTexture };
//# sourceMappingURL=EveSOFDataTexture.js.map
