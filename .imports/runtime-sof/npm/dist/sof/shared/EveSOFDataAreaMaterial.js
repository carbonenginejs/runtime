import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_colorType, _init_extra_colorType, _init_material, _init_extra_material, _init_material2, _init_extra_material2, _init_material3, _init_extra_material3, _init_material4, _init_extra_material4;

/** EveSOFDataAreaMaterial (eve) - generated from schema shapeHash 19be099b.... */
let _EveSOFDataAreaMateri;
new class extends _identity {
  static [class EveSOFDataAreaMaterial extends CjsModel {
    static {
      ({
        e: [_init_colorType, _init_extra_colorType, _init_material, _init_extra_material, _init_material2, _init_extra_material2, _init_material3, _init_extra_material3, _init_material4, _init_extra_material4],
        c: [_EveSOFDataAreaMateri, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataAreaMaterial",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("ColorType")], 16, "colorType"], [[io, io.persist, type, type.string], 16, "material1"], [[io, io.persist, type, type.string], 16, "material2"], [[io, io.persist, type, type.string], 16, "material3"], [[io, io.persist, type, type.string], 16, "material4"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_material4(this);
    }
    /** m_glowColorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
    colorType = _init_colorType(this, 12);

    /** m_material[MATERIAL1] (std::string) [READWRITE, PERSIST] */
    material1 = (_init_extra_colorType(this), _init_material(this, ""));

    /** m_material[MATERIAL2] (std::string) [READWRITE, PERSIST] */
    material2 = (_init_extra_material(this), _init_material2(this, ""));

    /** m_material[MATERIAL3] (std::string) [READWRITE, PERSIST] */
    material3 = (_init_extra_material2(this), _init_material3(this, ""));

    /** m_material[MATERIAL4] (std::string) [READWRITE, PERSIST] */
    material4 = (_init_extra_material3(this), _init_material4(this, ""));
    Assign(out = {}) {
      out.colorType = this.colorType;
      if (this.material1) out.material1 = this.material1;
      if (this.material2) out.material2 = this.material2;
      if (this.material3) out.material3 = this.material3;
      if (this.material4) out.material4 = this.material4;
      return out;
    }
    static combine(base, overrides, out = null) {
      if (!base) return null;
      out ??= new this();
      out.colorType = selectValue(base, overrides, "colorType");
      out.material1 = selectValue(base, overrides, "material1");
      out.material2 = selectValue(base, overrides, "material2");
      out.material3 = selectValue(base, overrides, "material3");
      out.material4 = selectValue(base, overrides, "material4");
      return out;
    }
  }];
  MaterialType = Object.freeze({
    MATERIAL1: 0,
    MATERIAL2: 1,
    MATERIAL3: 2,
    MATERIAL4: 3,
    MATERIAL_MAX: 4
  });
  constructor() {
    super(_EveSOFDataAreaMateri), _initClass();
  }
}();
function selectValue(base, overrides, name) {
  const value = overrides?.[name];
  return value !== null && value !== undefined && value !== "" ? value : base[name];
}

export { _EveSOFDataAreaMateri as EveSOFDataAreaMaterial };
//# sourceMappingURL=EveSOFDataAreaMaterial.js.map
