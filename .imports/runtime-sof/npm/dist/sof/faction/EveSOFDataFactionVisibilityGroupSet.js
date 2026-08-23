import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_visibilityGroups, _init_extra_visibilityGroups;

/** EveSOFDataFactionVisibilityGroupSet (eve) - generated from schema shapeHash da3a6331.... */
let _EveSOFDataFactionVis;
class EveSOFDataFactionVisibilityGroupSet extends CjsModel {
  static {
    ({
      e: [_init_visibilityGroups, _init_extra_visibilityGroups],
      c: [_EveSOFDataFactionVis, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataFactionVisibilityGroupSet",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataGenericString")], 16, "visibilityGroups"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_visibilityGroups(this);
  }
  /** m_visibilityGroups (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  visibilityGroups = _init_visibilityGroups(this, []);
  IsObjectVisible(value) {
    if (!value || typeof value !== "object") return false;
    return this.Has(value.visibilityGroup);
  }
  Has(visibilityGroup) {
    if (typeof visibilityGroup !== "string") return false;
    const normalized = visibilityGroup ? visibilityGroup.toUpperCase() : "PRIMARY";
    return this.visibilityGroups.some(value => {
      const group = typeof value === "string" ? value : value?.str;
      return typeof group === "string" && group.toUpperCase() === normalized;
    });
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataFactionVis as EveSOFDataFactionVisibilityGroupSet };
//# sourceMappingURL=EveSOFDataFactionVisibilityGroupSet.js.map
