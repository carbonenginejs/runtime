import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl, carbon } from '@carbonenginejs/runtime-utils/schema';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { AudGameObjResource as _AudGameObjResource } from './AudGameObjResource.js';

let _initProto, _initClass, _init_rotation, _init_extra_rotation, _init_front, _init_extra_front, _init_top, _init_extra_top, _init_normalizeAttenuationScaling, _init_extra_normalizeAttenuationScaling, _init_visualizationRadius, _init_extra_visualizationRadius, _init_maxNormalizedValue, _init_extra_maxNormalizedValue, _init_maxNormalizedScalingFactor, _init_extra_maxNormalizedScalingFactor, _init_minNormalizedValue, _init_extra_minNormalizedValue, _init_minNormalizedScalingFactor, _init_extra_minNormalizedScalingFactor;

/** AudEmitter (audio) - the concrete content-facing emitter (ITr2AudEmitter). */
let _AudEmitter;
class AudEmitter extends _AudGameObjResource {
  static {
    ({
      e: [_init_rotation, _init_extra_rotation, _init_front, _init_extra_front, _init_top, _init_extra_top, _init_normalizeAttenuationScaling, _init_extra_normalizeAttenuationScaling, _init_visualizationRadius, _init_extra_visualizationRadius, _init_maxNormalizedValue, _init_extra_maxNormalizedValue, _init_maxNormalizedScalingFactor, _init_extra_maxNormalizedScalingFactor, _init_minNormalizedValue, _init_extra_minNormalizedValue, _init_minNormalizedScalingFactor, _init_extra_minNormalizedScalingFactor, _initProto],
      c: [_AudEmitter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudEmitter",
      family: "audio"
    })], [[[io, io.notify, io, io.persist, type, type.quat], 16, "rotation"], [[io, io.read, type, type.vec3], 16, "front"], [[io, io.read, type, type.vec3], 16, "top"], [[io, io.persist, type, type.boolean], 16, "normalizeAttenuationScaling"], [[io, io.persist, type, type.float32], 16, "visualizationRadius"], [[io, io.persist, type, type.float32], 16, "maxNormalizedValue"], [[io, io.persist, type, type.float32], 16, "maxNormalizedScalingFactor"], [[io, io.persist, type, type.float32], 16, "minNormalizedValue"], [[io, io.persist, type, type.float32], 16, "minNormalizedScalingFactor"], [[void 0, carbon.renamed("__init__"), impl, impl.implemented], 18, "__init__"], [[void 0, carbon.renamed("SendEvent"), impl, impl.implemented], 18, "SendEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPosition"], [[void 0, carbon.renamed("SetPlacement"), impl, impl.implemented], 18, "SetPlacement"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdatePlacement"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetAttenuationScalingFactor"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPrefix"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetVisibility"]], 0, void 0, _AudGameObjResource));
  }
  constructor(...args) {
    super(...args);
    _init_extra_minNormalizedScalingFactor(this);
  }
  /** m_authoredRotation (Quaternion) [READWRITE, PERSIST, NOTIFY] */
  rotation = (_initProto(this), _init_rotation(this, quat.create()));

  /** Effective front vector sent to the audio backend [READ]. */
  front = (_init_extra_rotation(this), _init_front(this, vec3.fromValues(0, 0, 1)));

  /** Effective top vector sent to the audio backend [READ]. */
  top = (_init_extra_front(this), _init_top(this, vec3.fromValues(0, 1, 0)));

  /** m_normalizeAttenuationScaling (bool) [READWRITE, PERSIST] */
  normalizeAttenuationScaling = (_init_extra_top(this), _init_normalizeAttenuationScaling(this, false));

  /** m_visualizationRadius (float) [READWRITE, PERSIST] */
  visualizationRadius = (_init_extra_normalizeAttenuationScaling(this), _init_visualizationRadius(this, 0));

  /** m_maxNormalizedValue (float) [READWRITE, PERSIST] */
  maxNormalizedValue = (_init_extra_visualizationRadius(this), _init_maxNormalizedValue(this, 9000));

  /** m_maxNormalizedScalingFactor (float) [READWRITE, PERSIST] */
  maxNormalizedScalingFactor = (_init_extra_maxNormalizedValue(this), _init_maxNormalizedScalingFactor(this, 3.5));

  /** m_minNormalizedValue (float) [READWRITE, PERSIST] */
  minNormalizedValue = (_init_extra_maxNormalizedScalingFactor(this), _init_minNormalizedValue(this, 30));

  /** m_minNormalizedScalingFactor (float) [READWRITE, PERSIST] */
  minNormalizedScalingFactor = (_init_extra_minNormalizedValue(this), _init_minNormalizedScalingFactor(this, 0.4));

  /** Carbon method __init__ -> Py__init__: forwards to Initialize. */
  __init__(name, prefix, position) {
    return this.Initialize(name, prefix, position);
  }

  /** Carbon method SendEvent -> PostEvent (ITr2AudEmitter). */
  SendEvent(name, bypassPrefix = false) {
    return this.PostEvent(name, bypassPrefix);
  }

  /** Carbon method HandleEvent (IBlueEventListener): event tracks post directly on this emitter. */
  HandleEvent(eventName) {
    this.PostEvent(eventName);
  }

  /** Carbon method SetPosition: marks the emitter positioned (unblocks Wake), then stores/pushes. */
  SetPosition(front, top, position) {
    this.MarkPositionReceived();
    return this.SetPlacementFromParent(front, top, position);
  }

  /** Carbon Blue method SetPlacement -> SetPosition. */
  SetPlacement(front, top, position) {
    return this.SetPosition(front, top, position);
  }

  /** Carbon method UpdatePlacement: placement observers forward here. */
  UpdatePlacement(front, top, position) {
    this.SetPosition(front, top, position);
  }

  // Linear remap of the input from [minNormalizedValue, maxNormalizedValue]
  // to [minNormalizedScalingFactor, maxNormalizedScalingFactor]. Carbon does
  // NOT clamp - out-of-domain inputs extrapolate. Preserved.
  /** Carbon method SetAttenuationScalingFactor: optional normalization, then base store/push. */
  SetAttenuationScalingFactor(scalingFactor) {
    let finalScalingFactor = scalingFactor;
    if (this.normalizeAttenuationScaling) {
      finalScalingFactor = (scalingFactor - this.minNormalizedValue) * (this.maxNormalizedScalingFactor - this.minNormalizedScalingFactor) / (this.maxNormalizedValue - this.minNormalizedValue) + this.minNormalizedScalingFactor;
    }
    return super.SetAttenuationScalingFactor(finalScalingFactor);
  }

  /** Carbon method SetName (ITr2AudEmitter). */
  SetName(name) {
    this.name = String(name ?? "");
  }

  /** Carbon method GetName (ITr2AudEmitter). */
  GetName() {
    return this.name;
  }

  /** Carbon method SetPrefix (ITr2AudEmitter). */
  SetPrefix(prefix) {
    this.eventPrefix = String(prefix ?? "");
  }

  /** Carbon method SetVisibility (ITr2AudEmitter). */
  SetVisibility(isVisible) {
    this.isVisible = !!isVisible;
  }
  static {
    _initClass();
  }
}

export { _AudEmitter as AudEmitter };
//# sourceMappingURL=AudEmitter.js.map
