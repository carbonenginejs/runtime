import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2AudioStretchBase as _Tr2AudioStretchBase } from './Tr2AudioStretchBase.js';

let _initProto, _initClass, _init_impactEvent, _init_extra_impactEvent, _init_outburstEvent, _init_extra_outburstEvent, _init_stretchEvent, _init_extra_stretchEvent;

/** Tr2AudioStretchAuto (trinityAudio) - generated from schema shapeHash 66b9fbdd.... */
let _Tr2AudioStretchAuto;
class Tr2AudioStretchAuto extends _Tr2AudioStretchBase {
  static {
    ({
      e: [_init_impactEvent, _init_extra_impactEvent, _init_outburstEvent, _init_extra_outburstEvent, _init_stretchEvent, _init_extra_stretchEvent, _initProto],
      c: [_Tr2AudioStretchAuto, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2AudioStretchAuto",
      family: "trinityAudio"
    })], [[[io, io.persist, type, type.string], 16, "impactEvent"], [[io, io.persist, type, type.string], 16, "outburstEvent"], [[io, io.persist, type, type.string], 16, "stretchEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "TriggerOutburstEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "TriggerImpactEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "TriggerStretchEvent"]], 0, void 0, _Tr2AudioStretchBase));
  }
  constructor(...args) {
    super(...args);
    _init_extra_stretchEvent(this);
  }
  /** m_impactEvent (std::wstring) [READWRITE, PERSIST] */
  impactEvent = (_initProto(this), _init_impactEvent(this, ""));

  /** m_outburstEvent (std::wstring) [READWRITE, PERSIST] */
  outburstEvent = (_init_extra_impactEvent(this), _init_outburstEvent(this, ""));

  /** m_stretchEvent (std::wstring) [READWRITE, PERSIST] */
  stretchEvent = (_init_extra_outburstEvent(this), _init_stretchEvent(this, ""));

  /** Carbon method TriggerOutburstEvent. */
  TriggerOutburstEvent() {
    return this.sourceEmitter?.SendEvent?.(this.outburstEvent) ?? 0;
  }

  /** Carbon method TriggerImpactEvent. */
  TriggerImpactEvent() {
    return this.destinationEmitter?.SendEvent?.(this.impactEvent) ?? 0;
  }

  /** Carbon method TriggerStretchEvent. */
  TriggerStretchEvent() {
    return this.stretchEmitter?.SendEvent?.(this.stretchEvent) ?? 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2AudioStretchAuto as Tr2AudioStretchAuto };
//# sourceMappingURL=Tr2AudioStretchAuto.js.map
