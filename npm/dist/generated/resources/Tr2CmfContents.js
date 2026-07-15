import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_section, _init_extra_section, _init_data, _init_extra_data, _init_sections, _init_extra_sections;

/** Tr2CmfContents (resources) - generated from schema shapeHash e7125c76.... */
let _Tr2CmfContents;
class Tr2CmfContents extends CjsModel {
  static {
    ({
      e: [_init_section, _init_extra_section, _init_data, _init_extra_data, _init_sections, _init_extra_sections],
      c: [_Tr2CmfContents, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CmfContents",
      family: "resources"
    })], [[type.rawStruct("cmf::Section"), 0, "section"], [type.rawStruct("uint8_t[]"), 0, "data"], [type.list("Section"), 0, "sections"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_sections(this);
  }
  /** section (cmf::Section) */
  section = _init_section(this, null);

  /** data (std::unique_ptr<uint8_t[]>) */
  data = (_init_extra_section(this), _init_data(this, null));

  /** m_sections (std::vector<Section>) */
  sections = (_init_extra_data(this), _init_sections(this, []));
  static {
    _initClass();
  }
}

export { _Tr2CmfContents as Tr2CmfContents };
//# sourceMappingURL=Tr2CmfContents.js.map
