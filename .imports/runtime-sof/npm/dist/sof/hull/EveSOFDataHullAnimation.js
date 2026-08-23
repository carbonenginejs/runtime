import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_name, _init_extra_name, _init_startRotationValue, _init_extra_startRotationValue, _init_endRotationValue, _init_extra_endRotationValue, _init_startRotationTime, _init_extra_startRotationTime, _init_endRotationTime, _init_extra_endRotationTime, _init_startTranslationValue, _init_extra_startTranslationValue, _init_endTranslationValue, _init_extra_endTranslationValue, _init_startTranslationTime, _init_extra_startTranslationTime, _init_endTranslationTime, _init_extra_endTranslationTime, _init_id, _init_extra_id, _init_startRate, _init_extra_startRate, _init_endRate, _init_extra_endRate;

/** EveSOFDataHullAnimation (eve) - generated from schema shapeHash 67955e12.... */
let _EveSOFDataHullAnimat;
class EveSOFDataHullAnimation extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_startRotationValue, _init_extra_startRotationValue, _init_endRotationValue, _init_extra_endRotationValue, _init_startRotationTime, _init_extra_startRotationTime, _init_endRotationTime, _init_extra_endRotationTime, _init_startTranslationValue, _init_extra_startTranslationValue, _init_endTranslationValue, _init_extra_endTranslationValue, _init_startTranslationTime, _init_extra_startTranslationTime, _init_endTranslationTime, _init_extra_endTranslationTime, _init_id, _init_extra_id, _init_startRate, _init_extra_startRate, _init_endRate, _init_extra_endRate],
      c: [_EveSOFDataHullAnimat, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullAnimation",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.quat], 16, "startRotationValue"], [[io, io.persist, type, type.quat], 16, "endRotationValue"], [[io, io.persist, type, type.float32], 16, "startRotationTime"], [[io, io.persist, type, type.float32], 16, "endRotationTime"], [[io, io.persist, type, type.vec3], 16, "startTranslationValue"], [[io, io.persist, type, type.vec3], 16, "endTranslationValue"], [[io, io.persist, type, type.float32], 16, "startTranslationTime"], [[io, io.persist, type, type.float32], 16, "endTranslationTime"], [[io, io.persist, type, type.int32], 16, "id"], [[io, io.persist, type, type.float32], 16, "startRate"], [[io, io.persist, type, type.float32], 16, "endRate"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_endRate(this);
  }
  /** m_name (std::string) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_startRotationValue (Vector4) [READWRITE, PERSIST] */
  startRotationValue = (_init_extra_name(this), _init_startRotationValue(this, quat.create()));

  /** m_endRotationValue (Vector4) [READWRITE, PERSIST] */
  endRotationValue = (_init_extra_startRotationValue(this), _init_endRotationValue(this, quat.create()));

  /** m_startRotationTime (float) [READWRITE, PERSIST] */
  startRotationTime = (_init_extra_endRotationValue(this), _init_startRotationTime(this, -1));

  /** m_endRotationTime (float) [READWRITE, PERSIST] */
  endRotationTime = (_init_extra_startRotationTime(this), _init_endRotationTime(this, -1));

  /** m_startTranslationValue (Vector3) [READWRITE, PERSIST] */
  startTranslationValue = (_init_extra_endRotationTime(this), _init_startTranslationValue(this, vec3.create()));

  /** m_endTranslationValue (Vector3) [READWRITE, PERSIST] */
  endTranslationValue = (_init_extra_startTranslationValue(this), _init_endTranslationValue(this, vec3.create()));

  /** m_startTranslationTime (float) [READWRITE, PERSIST] */
  startTranslationTime = (_init_extra_endTranslationValue(this), _init_startTranslationTime(this, -1));

  /** m_endTranslationTime (float) [READWRITE, PERSIST] */
  endTranslationTime = (_init_extra_startTranslationTime(this), _init_endTranslationTime(this, -1));

  /** m_id (int32_t) [READWRITE, PERSIST] */
  id = (_init_extra_endTranslationTime(this), _init_id(this, -1));

  /** m_startRate (float) [READWRITE, PERSIST] */
  startRate = (_init_extra_id(this), _init_startRate(this, -1));

  /** m_endRate (float) [READWRITE, PERSIST] */
  endRate = (_init_extra_startRate(this), _init_endRate(this, -1));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullAnimat as EveSOFDataHullAnimation };
//# sourceMappingURL=EveSOFDataHullAnimation.js.map
