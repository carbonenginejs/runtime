import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { AudEmitter as _AudEmitter } from '../audio/AudEmitter.js';
import { AudGameObjResource as _AudGameObjResource } from '../audio/AudGameObjResource.js';
import { StretchAudio as _StretchAudio } from '../audio/StretchAudio.js';

let _initProto, _initClass, _init_stretchEmitter, _init_extra_stretchEmitter, _init_destinationEmitter, _init_extra_destinationEmitter, _init_sourceEmitter, _init_extra_sourceEmitter;

/** Tr2AudioStretchBase (trinityAudio) - generated from schema shapeHash f6d14e40.... */
let _Tr2AudioStretchBase;
new class extends _identity {
  static [class Tr2AudioStretchBase extends CjsModel {
    static {
      ({
        e: [_init_stretchEmitter, _init_extra_stretchEmitter, _init_destinationEmitter, _init_extra_destinationEmitter, _init_sourceEmitter, _init_extra_sourceEmitter, _initProto],
        c: [_Tr2AudioStretchBase, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2AudioStretchBase",
        family: "trinityAudio"
      })], [[[io, io.persist, void 0, type.model("ITr2AudEmitter")], 16, "stretchEmitter"], [[io, io.persist, void 0, type.model("ITr2AudEmitter")], 16, "destinationEmitter"], [[io, io.persist, void 0, type.model("ITr2AudEmitter")], 16, "sourceEmitter"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads Tr2Renderer's view position; the device-free audio graph uses the registered audio listener position.")], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindEmitterByName"]], 0, void 0, CjsModel));
    }
    /** m_stretchEmitter (ITr2AudEmitterPtr) [READWRITE, PERSIST] */
    stretchEmitter = (_initProto(this), _init_stretchEmitter(this, null));

    /** m_destEmitter (ITr2AudEmitterPtr) [READWRITE, PERSIST] */
    destinationEmitter = (_init_extra_stretchEmitter(this), _init_destinationEmitter(this, null));

    /** m_sourceEmitter (ITr2AudEmitterPtr) [READWRITE, PERSIST] */
    sourceEmitter = (_init_extra_destinationEmitter(this), _init_sourceEmitter(this, null));
    #front = (_init_extra_sourceEmitter(this), new Float32Array([0, 1, 0]));
    #top = new Float32Array([0, 0, 1]);

    /** Creates and initializes Carbon's three-emitter stretch-audio bridge. */
    constructor() {
      super();
      this.Initialize();
    }

    /** Carbon method Initialize: create the three standard emitters when absent. */
    Initialize() {
      if (!this.sourceEmitter) {
        this.sourceEmitter = new _AudEmitter();
        this.sourceEmitter.SetName("stretch_source_sfx");
      }
      if (!this.destinationEmitter) {
        this.destinationEmitter = new _AudEmitter();
        this.destinationEmitter.SetName("stretch_dest_sfx");
      }
      if (!this.stretchEmitter) {
        this.stretchEmitter = new _AudEmitter();
        this.stretchEmitter.SetName("stretch_mid_sfx");
      }
      return true;
    }

    /** Carbon method Update: position endpoints and project the listener onto the beam. */
    Update(sourcePosition, destPosition) {
      _StretchAudio.GetStretchOrientation(sourcePosition, destPosition, this.#front, this.#top);
      this.sourceEmitter?.SetPosition?.(this.#front, this.#top, sourcePosition);
      this.destinationEmitter?.SetPosition?.(this.#front, this.#top, destPosition);
      const listenerPosition = _AudGameObjResource.manager?.GetListener?.()?.GetPosition?.() ?? sourcePosition;
      this.stretchEmitter?.SetPosition?.(this.#front, this.#top, _Tr2AudioStretchBase.#ProjectOntoSegment(listenerPosition, sourcePosition, destPosition));
    }

    /** Carbon method FindEmitterByName. */
    FindEmitterByName(name) {
      for (const emitter of [this.sourceEmitter, this.destinationEmitter, this.stretchEmitter]) {
        if (emitter?.GetName?.() === name) {
          return emitter;
        }
      }
      return null;
    }

    /** Projects one point onto the finite source-to-destination segment. */
  }];
  #ProjectOntoSegment(point, source, destination) {
    const x = destination[0] - source[0];
    const y = destination[1] - source[1];
    const z = destination[2] - source[2];
    const lengthSquared = x * x + y * y + z * z;
    if (lengthSquared < 1e-6) {
      return [source[0], source[1], source[2]];
    }
    const offsetX = point[0] - source[0];
    const offsetY = point[1] - source[1];
    const offsetZ = point[2] - source[2];
    const t = Math.max(0, Math.min(1, (offsetX * x + offsetY * y + offsetZ * z) / lengthSquared));
    return [source[0] + t * x, source[1] + t * y, source[2] + t * z];
  }
  constructor() {
    super(_Tr2AudioStretchBase), _initClass();
  }
}();

export { _Tr2AudioStretchBase as Tr2AudioStretchBase };
//# sourceMappingURL=Tr2AudioStretchBase.js.map
