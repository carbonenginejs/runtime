import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { AudEmitter as _AudEmitter } from './AudEmitter.js';
import { AudGameObjResource as _AudGameObjResource } from './AudGameObjResource.js';

let _initProto, _initClass, _init_stretchEmitter, _init_extra_stretchEmitter, _init_destinationEmitter, _init_extra_destinationEmitter, _init_sourceEmitter, _init_extra_sourceEmitter, _init_impactEvent, _init_extra_impactEvent, _init_outburstEvent, _init_extra_outburstEvent, _init_stretchEvent, _init_extra_stretchEvent, _init_shotMissedEvent, _init_extra_shotMissedEvent;

/** StretchAudio (audio) - three-emitter beam audio (source/dest/stretch), listener projected onto the segment. */
let _StretchAudio;
class StretchAudio extends CjsModel {
  static {
    ({
      e: [_init_stretchEmitter, _init_extra_stretchEmitter, _init_destinationEmitter, _init_extra_destinationEmitter, _init_sourceEmitter, _init_extra_sourceEmitter, _init_impactEvent, _init_extra_impactEvent, _init_outburstEvent, _init_extra_outburstEvent, _init_stretchEvent, _init_extra_stretchEvent, _init_shotMissedEvent, _init_extra_shotMissedEvent, _initProto],
      c: [_StretchAudio, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "StretchAudio",
      family: "audio"
    })], [[[io, io.persist, void 0, type.model("AudEmitter")], 16, "stretchEmitter"], [[io, io.persist, void 0, type.model("AudEmitter")], 16, "destinationEmitter"], [[io, io.persist, void 0, type.model("AudEmitter")], 16, "sourceEmitter"], [[io, io.persist, type, type.string], 16, "impactEvent"], [[io, io.persist, type, type.string], 16, "outburstEvent"], [[io, io.persist, type, type.string], 16, "stretchEvent"], [[io, io.persist, type, type.string], 16, "shotMissedEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "ProjectListenerOntoSegment"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetShotMissed"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindEmitterByName"]], 0, void 0, CjsModel));
  }
  /** m_stretchEmitter (AudEmitterPtr) [READWRITE, PERSIST] */
  stretchEmitter = (_initProto(this), _init_stretchEmitter(this, null));

  /** m_destEmitter (AudEmitterPtr) [READWRITE, PERSIST] */
  destinationEmitter = (_init_extra_stretchEmitter(this), _init_destinationEmitter(this, null));

  /** m_sourceEmitter (AudEmitterPtr) [READWRITE, PERSIST] */
  sourceEmitter = (_init_extra_destinationEmitter(this), _init_sourceEmitter(this, null));

  /** m_impactEvent (std::wstring) [READWRITE, PERSIST] */
  impactEvent = (_init_extra_sourceEmitter(this), _init_impactEvent(this, ""));

  /** m_outburstEvent (std::wstring) [READWRITE, PERSIST] */
  outburstEvent = (_init_extra_impactEvent(this), _init_outburstEvent(this, ""));

  /** m_stretchEvent (std::wstring) [READWRITE, PERSIST] */
  stretchEvent = (_init_extra_outburstEvent(this), _init_stretchEvent(this, ""));

  /** m_shotMissedEvent (std::wstring) [READWRITE, PERSIST] */
  shotMissedEvent = (_init_extra_stretchEvent(this), _init_shotMissedEvent(this, ""));
  #shotMissed = (_init_extra_shotMissedEvent(this), false);
  #listener = null;
  #front = vec3.fromValues(0, 1, 0);
  #top = vec3.fromValues(0, 0, 1);

  /** Carbon method Initialize: create the three named emitters when absent. */
  Initialize() {
    if (!this.sourceEmitter) {
      this.sourceEmitter = new _AudEmitter();
      this.sourceEmitter.Initialize("stretch_source_sfx", "", [0, 0, 0]);
    }
    if (!this.destinationEmitter) {
      this.destinationEmitter = new _AudEmitter();
      this.destinationEmitter.Initialize("stretch_dest_sfx", "", [0, 0, 0]);
    }
    if (!this.stretchEmitter) {
      this.stretchEmitter = new _AudEmitter();
      this.stretchEmitter.Initialize("stretch_mid_sfx", "", [0, 0, 0]);
    }
    return true;
  }

  /** Carbon method Start: outburst on source, impact on dest, (shot-missed then) stretch on mid. */
  Start() {
    this.sourceEmitter?.SendEvent(this.outburstEvent);
    this.destinationEmitter?.SendEvent(this.impactEvent);
    if (this.stretchEmitter) {
      if (this.#shotMissed) {
        this.stretchEmitter.SendEvent(this.shotMissedEvent);
      }
      this.stretchEmitter.SendEvent(this.stretchEvent);
    }
  }

  /** Carbon method Stop: StopAll on each emitter. */
  Stop() {
    this.sourceEmitter?.StopAll();
    this.destinationEmitter?.StopAll();
    this.stretchEmitter?.StopAll();
  }

  /** Carbon method Update: position source/dest, project the listener onto the segment for the mid emitter. Events fire only in Start/Stop. */
  Update(sourcePosition, destPosition) {
    if (!_AudGameObjResource.manager?.enabled) {
      return;
    }
    _StretchAudio.GetStretchOrientation(sourcePosition, destPosition, this.#front, this.#top);
    this.sourceEmitter?.SetPosition(this.#front, this.#top, sourcePosition);
    this.destinationEmitter?.SetPosition(this.#front, this.#top, destPosition);
    if (this.stretchEmitter) {
      this.stretchEmitter.SetPosition(this.#front, this.#top, this.ProjectListenerOntoSegment(sourcePosition, destPosition));
    }
  }

  /**
   * Derives a stable beam orientation from source to destination. The top axis
   * prefers +Z, falling back to +Y when the segment is parallel to it.
   */
  static GetStretchOrientation(sourcePosition, destPosition, front, top) {
    const segmentX = destPosition[0] - sourcePosition[0];
    const segmentY = destPosition[1] - sourcePosition[1];
    const segmentZ = destPosition[2] - sourcePosition[2];
    const lengthSquared = segmentX * segmentX + segmentY * segmentY + segmentZ * segmentZ;
    if (lengthSquared < 1e-6) {
      vec3.set(front, 0, 1, 0);
      vec3.set(top, 0, 0, 1);
      return;
    }
    const inverseLength = 1 / Math.sqrt(lengthSquared);
    vec3.set(front, segmentX * inverseLength, segmentY * inverseLength, segmentZ * inverseLength);
    let preferredDot = front[2];
    vec3.set(top, -front[0] * preferredDot, -front[1] * preferredDot, 1 - front[2] * preferredDot);
    let topLengthSquared = vec3.squaredLength(top);
    if (topLengthSquared < 1e-6) {
      preferredDot = front[1];
      vec3.set(top, -front[0] * preferredDot, 1 - front[1] * preferredDot, -front[2] * preferredDot);
      topLengthSquared = vec3.squaredLength(top);
    }
    vec3.scale(top, top, 1 / Math.sqrt(topLengthSquared));
  }

  // t = dot(L-S, D-S) / |D-S|^2 clamped to [0,1]; degenerate segment
  // (|D-S|^2 < 1e-6) returns the source; no listener returns (0,0,0).
  /** Carbon method ProjectListenerOntoSegment. */
  ProjectListenerOntoSegment(sourcePosition, destPosition) {
    if (!this.#listener) {
      this.#listener = _AudGameObjResource.manager?.GetListener?.() ?? null;
      if (!this.#listener) {
        return [0, 0, 0];
      }
    }
    const listenerPosition = this.#listener.GetPosition();
    const segX = destPosition[0] - sourcePosition[0];
    const segY = destPosition[1] - sourcePosition[1];
    const segZ = destPosition[2] - sourcePosition[2];
    const segmentLengthSquared = segX * segX + segY * segY + segZ * segZ;
    if (segmentLengthSquared < 1e-6) {
      return [sourcePosition[0], sourcePosition[1], sourcePosition[2]];
    }
    const toListenerX = listenerPosition[0] - sourcePosition[0];
    const toListenerY = listenerPosition[1] - sourcePosition[1];
    const toListenerZ = listenerPosition[2] - sourcePosition[2];
    let t = (toListenerX * segX + toListenerY * segY + toListenerZ * segZ) / segmentLengthSquared;
    t = Math.max(0, Math.min(t, 1));
    return [sourcePosition[0] + t * segX, sourcePosition[1] + t * segY, sourcePosition[2] + t * segZ];
  }

  /** Carbon method SetShotMissed. */
  SetShotMissed(missed) {
    this.#shotMissed = !!missed;
  }

  /** Carbon method FindEmitterByName: source, then dest, then stretch; first name match or null. */
  FindEmitterByName(name) {
    for (const emitter of [this.sourceEmitter, this.destinationEmitter, this.stretchEmitter]) {
      if (emitter && emitter.GetName() === name) {
        return emitter;
      }
    }
    return null;
  }
  static {
    _initClass();
  }
}

export { _StretchAudio as StretchAudio };
//# sourceMappingURL=StretchAudio.js.map
