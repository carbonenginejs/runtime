import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl, carbon } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { AudGameObjResource as _AudGameObjResource } from './AudGameObjResource.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_value, _init_extra_value;

/** AudParameter (audio) - generated from schema shapeHash daad2621.... */
let _AudParameter;
class AudParameter extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_value, _init_extra_value, _initProto],
      c: [_AudParameter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudParameter",
      family: "audio"
    })], [[[io, io.readwrite, type, type.string], 16, "name"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "value"], [[impl, impl.custom, void 0, impl.reason("Carbon assigns AudParameter::m_ID through AudGameObjResource friendship; CarbonEngineJS exposes the narrow owner-binding seam needed by its cooperative list pipeline.")], 18, "SetGameObjectID"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CjsModel hooks are property-agnostic, so a cached value reproduces Carbon's m_value-only notification branch.")], 18, "OnModified"]], 0, void 0, CjsModel));
  }
  /** m_name (std::wstring) [READWRITE] */
  name = (_initProto(this), _init_name(this, ""));

  /** m_value (float) [READWRITE, NOTIFY] */
  value = (_init_extra_name(this), _init_value(this, 0));
  #gameObjID = (_init_extra_value(this), 0);
  #settledValue = 0;

  /**
   * Carbon's parent-list callback assigns the private game-object id when this
   * parameter is inserted. Binding alone does not push its current value.
   */
  SetGameObjectID(gameObjID) {
    this.#gameObjID = Number(gameObjID) || 0;
  }

  /** Carbon INotify consequence: only a value change pushes the object RTPC. */
  OnModified(options = {}) {
    const next = Number(this.value);
    const changed = !Object.is(next, this.#settledValue);
    this.#settledValue = next;
    if (changed && this.#gameObjID && _AudGameObjResource.manager?.enabled) {
      _AudGameObjResource.backend?.SetRTPCValue?.(this.name, next, this.#gameObjID);
      _AudGameObjResource.manager.LogSetRTPC?.(this.#gameObjID, this.name, next);
    }
    return super.OnModified(options);
  }
  static {
    _initClass();
  }
}

export { _AudParameter as AudParameter };
//# sourceMappingURL=AudParameter.js.map
