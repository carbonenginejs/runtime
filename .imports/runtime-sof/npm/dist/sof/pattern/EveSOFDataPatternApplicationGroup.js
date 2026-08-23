import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_layer1Properties, _init_extra_layer1Properties, _init_layer2Properties, _init_extra_layer2Properties, _init_name, _init_extra_name, _init_projections, _init_extra_projections;

/** EveSOFDataPatternApplicationGroup (eve) - generated from schema shapeHash 4e2e103e.... */
let _EveSOFDataPatternApp;
class EveSOFDataPatternApplicationGroup extends CjsModel {
  static {
    ({
      e: [_init_layer1Properties, _init_extra_layer1Properties, _init_layer2Properties, _init_extra_layer2Properties, _init_name, _init_extra_name, _init_projections, _init_extra_projections],
      c: [_EveSOFDataPatternApp, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataPatternApplicationGroup",
      family: "eve"
    })], [[[io, io.persist, void 0, type.objectRef("EveSOFDataPatternLayerProperties")], 16, "layer1Properties"], [[io, io.persist, void 0, type.objectRef("EveSOFDataPatternLayerProperties")], 16, "layer2Properties"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("EveSOFDataPatternPerHull")], 16, "projections"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_projections(this);
  }
  /** m_layer1Properties (EveSOFDataPatternLayerPropertiesPtr) [READWRITE, PERSIST] */
  layer1Properties = _init_layer1Properties(this, null);

  /** m_layer2Properties (EveSOFDataPatternLayerPropertiesPtr) [READWRITE, PERSIST] */
  layer2Properties = (_init_extra_layer1Properties(this), _init_layer2Properties(this, null));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_layer2Properties(this), _init_name(this, ""));

  /** m_projections (PEveSOFDataPatternPerHullVector) [READ, PERSIST] */
  projections = (_init_extra_name(this), _init_projections(this, []));
  FindProjection(hullName) {
    const name = String(hullName ?? "").toUpperCase();
    return this.projections.find(value => String(value?.name ?? "").toUpperCase() === name) ?? null;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataPatternApp as EveSOFDataPatternApplicationGroup };
//# sourceMappingURL=EveSOFDataPatternApplicationGroup.js.map
