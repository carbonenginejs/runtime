import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_noiseFunction, _init_extra_noiseFunction, _init_noiseSpeed, _init_extra_noiseSpeed, _init_noiseAmplitureStart, _init_extra_noiseAmplitureStart, _init_noiseAmplitureEnd, _init_extra_noiseAmplitureEnd, _init_noiseFrequency, _init_extra_noiseFrequency, _init_color, _init_extra_color;

/** EveSOFDataBoosterShape (eve) - generated from schema shapeHash 17bbd0bf.... */
let _EveSOFDataBoosterSha;
class EveSOFDataBoosterShape extends CjsModel {
  static {
    ({
      e: [_init_noiseFunction, _init_extra_noiseFunction, _init_noiseSpeed, _init_extra_noiseSpeed, _init_noiseAmplitureStart, _init_extra_noiseAmplitureStart, _init_noiseAmplitureEnd, _init_extra_noiseAmplitureEnd, _init_noiseFrequency, _init_extra_noiseFrequency, _init_color, _init_extra_color],
      c: [_EveSOFDataBoosterSha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataBoosterShape",
      family: "eve"
    })], [[[io, io.persist, type, type.float32], 16, "noiseFunction"], [[io, io.persist, type, type.float32], 16, "noiseSpeed"], [[io, io.persist, type, type.vec4], 16, "noiseAmplitureStart"], [[io, io.persist, type, type.vec4], 16, "noiseAmplitureEnd"], [[io, io.persist, type, type.vec4], 16, "noiseFrequency"], [[io, io.persist, type, type.color], 16, "color"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_color(this);
  }
  /** m_noiseFunction (float) [READWRITE, PERSIST] */
  noiseFunction = _init_noiseFunction(this, 0);

  /** m_noiseSpeed (float) [READWRITE, PERSIST] */
  noiseSpeed = (_init_extra_noiseFunction(this), _init_noiseSpeed(this, 0));

  /** m_noiseAmplitureStart (Vector4) [READWRITE, PERSIST] */
  noiseAmplitureStart = (_init_extra_noiseSpeed(this), _init_noiseAmplitureStart(this, vec4.create()));

  /** m_noiseAmplitureEnd (Vector4) [READWRITE, PERSIST] */
  noiseAmplitureEnd = (_init_extra_noiseAmplitureStart(this), _init_noiseAmplitureEnd(this, vec4.create()));

  /** m_noiseFrequency (Vector4) [READWRITE, PERSIST] */
  noiseFrequency = (_init_extra_noiseAmplitureEnd(this), _init_noiseFrequency(this, vec4.create()));

  /** m_color (Color) [READWRITE, PERSIST] */
  color = (_init_extra_noiseFrequency(this), _init_color(this, vec4.create()));
  get noiseAmplitudeStart() {
    return this.noiseAmplitureStart;
  }
  set noiseAmplitudeStart(value) {
    vec4.copy(this.noiseAmplitureStart, value);
  }
  get noiseAmplitudeEnd() {
    return this.noiseAmplitureEnd;
  }
  set noiseAmplitudeEnd(value) {
    vec4.copy(this.noiseAmplitureEnd, value);
  }
  static combine(base, overrides, out = null) {
    out ??= new this();
    if (!base && !overrides) return out;
    base ??= out;
    vec4.copy(out.color, selectValue(base, overrides, "color"));
    vec4.copy(out.noiseAmplitureEnd, selectValue(base, overrides, "noiseAmplitureEnd"));
    vec4.copy(out.noiseAmplitureStart, selectValue(base, overrides, "noiseAmplitureStart"));
    vec4.copy(out.noiseFrequency, selectValue(base, overrides, "noiseFrequency"));
    out.noiseFunction = selectValue(base, overrides, "noiseFunction");
    out.noiseSpeed = selectValue(base, overrides, "noiseSpeed");
    return out;
  }
  static {
    _initClass();
  }
}
function selectValue(base, overrides, name) {
  const value = overrides?.[name];
  return value !== null && value !== undefined && value !== "" ? value : base[name];
}

export { _EveSOFDataBoosterSha as EveSOFDataBoosterShape };
//# sourceMappingURL=EveSOFDataBoosterShape.js.map
