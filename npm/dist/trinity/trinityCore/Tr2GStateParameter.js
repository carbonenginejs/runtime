import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_name, _init_extra_name, _init_value, _init_extra_value, _init_nodename, _init_extra_nodename;

/** Tr2GStateParameter (trinityCore) - generated from schema shapeHash cb552923.... */
let _Tr2GStateParameter;
class Tr2GStateParameter extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_value, _init_extra_value, _init_nodename, _init_extra_nodename, _initProto],
      c: [_Tr2GStateParameter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GStateParameter",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "value"], [[io, io.persist, type, type.string], 16, "nodename"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetNodeName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetNodeName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_nodename(this);
  }
  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_initProto(this), _init_name(this, ""));

  /** m_value (float) [READWRITE, PERSIST] */
  value = (_init_extra_name(this), _init_value(this, 0));

  /** m_nodeName (std::string) [READWRITE, PERSIST] */
  nodename = (_init_extra_value(this), _init_nodename(this, ""));

  /** Carbon method GetName (MAP_METHOD_AND_WRAP). */
  GetName() {
    return this.name;
  }

  /** Carbon method GetNodeName (MAP_METHOD_AND_WRAP). */
  GetNodeName() {
    return this.nodename;
  }

  /** Carbon method GetValue (MAP_METHOD_AND_WRAP). */
  GetValue() {
    return this.value;
  }

  /** Carbon method SetName (MAP_METHOD_AND_WRAP). */
  SetName(name) {
    this.name = String(name ?? "");
  }

  /** Carbon method SetNodeName (MAP_METHOD_AND_WRAP). */
  SetNodeName(name) {
    this.nodename = String(name ?? "");
  }

  /** Carbon method SetValue (MAP_METHOD_AND_WRAP). */
  SetValue(value) {
    this.value = Number(value);
  }
  Initialize() {
    return true;
  }
  static {
    _initClass();
  }
}

export { _Tr2GStateParameter as Tr2GStateParameter };
//# sourceMappingURL=Tr2GStateParameter.js.map
