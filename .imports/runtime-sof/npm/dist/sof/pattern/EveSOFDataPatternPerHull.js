import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveSOFDataPatternTransform as _EveSOFDataPatternTra } from './EveSOFDataPatternTransform.js';

let _initClass, _init_transformLayer, _init_extra_transformLayer, _init_transformLayer2, _init_extra_transformLayer2, _init_name, _init_extra_name;

/** EveSOFDataPatternPerHull (eve) - generated from schema shapeHash ba16415a.... */
let _EveSOFDataPatternPer;
class EveSOFDataPatternPerHull extends CjsModel {
  static {
    ({
      e: [_init_transformLayer, _init_extra_transformLayer, _init_transformLayer2, _init_extra_transformLayer2, _init_name, _init_extra_name],
      c: [_EveSOFDataPatternPer, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataPatternPerHull",
      family: "eve"
    })], [[[io, io.persist, void 0, type.objectRef("EveSOFDataPatternTransform")], 16, "transformLayer1"], [[io, io.persist, void 0, type.objectRef("EveSOFDataPatternTransform")], 16, "transformLayer2"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  /** m_transformLayer1 (EveSOFDataPatternTransformPtr) [READWRITE, PERSIST] */
  transformLayer1 = _init_transformLayer(this, null);

  /** m_transformLayer2 (EveSOFDataPatternTransformPtr) [READWRITE, PERSIST] */
  transformLayer2 = (_init_extra_transformLayer(this), _init_transformLayer2(this, null));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_transformLayer2(this), _init_name(this, ""));
  constructor(name = "") {
    super(), _init_extra_name(this);
    this.name = name;
  }
  Empty() {
    this.transformLayer1?.Empty();
    this.transformLayer2?.Empty();
    return this;
  }
  Flip() {
    [this.transformLayer1, this.transformLayer2] = [this.transformLayer2, this.transformLayer1];
    return this;
  }
  SetFromCustomMasks(customMask1, customMask2) {
    this.SetTransformLayer1FromCustomMask(customMask1);
    this.SetTransformLayer2FromCustomMask(customMask2);
    return this;
  }
  SetTransformLayer1FromCustomMask(customMask) {
    this.transformLayer1 = setTransformFromCustomMask(this.transformLayer1, customMask);
    return this;
  }
  SetTransformLayer2FromCustomMask(customMask) {
    this.transformLayer2 = setTransformFromCustomMask(this.transformLayer2, customMask);
    return this;
  }
  static {
    _initClass();
  }
}
function setTransformFromCustomMask(transform, customMask) {
  if (!customMask) return null;
  return (transform ?? new _EveSOFDataPatternTra()).SetFromCustomMask(customMask);
}

export { _EveSOFDataPatternPer as EveSOFDataPatternPerHull };
//# sourceMappingURL=EveSOFDataPatternPerHull.js.map
