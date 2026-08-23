import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveSOFDataPatternLayer as _EveSOFDataPatternLay } from './EveSOFDataPatternLayer.js';
import { EveSOFDataPatternPerHull as _EveSOFDataPatternPer } from './EveSOFDataPatternPerHull.js';

let _initClass, _init_projections, _init_extra_projections, _init_applicationGroups, _init_extra_applicationGroups, _init_layer, _init_extra_layer, _init_layer2, _init_extra_layer2, _init_name, _init_extra_name, _init_sof, _init_extra_sof;

/** EveSOFDataPattern (eve) - generated from schema shapeHash f8a30280.... */
let _EveSOFDataPattern;
class EveSOFDataPattern extends CjsModel {
  static {
    ({
      e: [_init_projections, _init_extra_projections, _init_applicationGroups, _init_extra_applicationGroups, _init_layer, _init_extra_layer, _init_layer2, _init_extra_layer2, _init_name, _init_extra_name, _init_sof, _init_extra_sof],
      c: [_EveSOFDataPattern, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataPattern",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataPatternPerHull")], 16, "projections"], [[io, io.persist, void 0, type.list("EveSOFDataPatternApplicationGroup")], 16, "applicationGroups"], [[io, io.persist, void 0, type.objectRef("EveSOFDataPatternLayer")], 16, "layer1"], [[io, io.persist, void 0, type.objectRef("EveSOFDataPatternLayer")], 16, "layer2"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "sof6"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_sof(this);
  }
  /** m_projections (PEveSOFDataPatternPerHullVector) [READ, PERSIST] */
  projections = _init_projections(this, []);

  /** m_applicationGroups (PEveSOFDataPatternApplicationGroupVector) [READ, PERSIST] */
  applicationGroups = (_init_extra_projections(this), _init_applicationGroups(this, []));

  /** m_layer1 (EveSOFDataPatternLayerPtr) [READWRITE, PERSIST] */
  layer1 = (_init_extra_applicationGroups(this), _init_layer(this, null));

  /** m_layer2 (EveSOFDataPatternLayerPtr) [READWRITE, PERSIST] */
  layer2 = (_init_extra_layer(this), _init_layer2(this, null));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_layer2(this), _init_name(this, ""));

  /** m_sof6 (bool) [READWRITE, PERSIST] */
  sof6 = (_init_extra_name(this), _init_sof(this, false));
  Has(hullName) {
    return this.IndexOfProjection(hullName) !== -1;
  }
  Get(hullName) {
    const index = this.IndexOfProjection(hullName);
    if (index === -1) {
      throw new ErrSOFProjectionNotFound({
        pattern: this.name,
        projection: hullName
      });
    }
    const projection = this.projections[index];
    return {
      name: this.name,
      layer1: this.layer1,
      layer2: this.layer2,
      transformLayer1: projection.transformLayer1,
      transformLayer2: projection.transformLayer2
    };
  }
  IndexOfProjection(hullName) {
    const name = String(hullName ?? "").toUpperCase();
    return this.projections.findIndex(value => String(value?.name ?? "").toUpperCase() === name);
  }
  EmptyLayers() {
    this.layer1?.Empty();
    this.layer2?.Empty();
    return this;
  }
  FlipLayers() {
    [this.layer1, this.layer2] = [this.layer2, this.layer1];
    return this;
  }
  FlipTransformLayers() {
    this.projections.forEach(projection => projection?.Flip());
    return this;
  }
  Flip() {
    this.FlipLayers();
    this.FlipTransformLayers();
    return this;
  }
  SetLayersFromCustomMasks(customMask1, customMask2) {
    this.layer1 = setLayerFromCustomMask(this.layer1, customMask1, "PatternMask1Map");
    this.layer2 = setLayerFromCustomMask(this.layer2, customMask2, "PatternMask2Map");
    return this;
  }
  SetHullProjectionFromCustomMasks(hullName, customMask1, customMask2) {
    if (!hullName) throw new TypeError("EveSOFDataPattern requires a hull name");
    const index = this.IndexOfProjection(hullName);
    const projection = index === -1 ? new _EveSOFDataPatternPer(hullName) : this.projections[index];
    if (index === -1) this.projections.push(projection);
    projection.SetFromCustomMasks(customMask1, customMask2);
    return projection;
  }
  static {
    _initClass();
  }
}
class ErrSOFProjectionNotFound extends Error {
  constructor({
    pattern = "",
    projection = ""
  } = {}) {
    super("SOF pattern projection '" + projection + "' not found for pattern '" + pattern + "'");
    this.name = "ErrSOFProjectionNotFound";
    this.code = "EVE_SOF_PROJECTION_NOT_FOUND";
    this.pattern = pattern;
    this.projection = projection;
  }
}
function setLayerFromCustomMask(layer, customMask, textureName) {
  if (!customMask) return null;
  return (layer ?? new _EveSOFDataPatternLay(textureName)).SetFromCustomMask(customMask);
}

export { ErrSOFProjectionNotFound, _EveSOFDataPattern as EveSOFDataPattern };
//# sourceMappingURL=EveSOFDataPattern.js.map
