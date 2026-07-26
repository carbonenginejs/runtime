import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { getCurveDuration, getTime, updateCurveSet, makeEndpointTransforms, getOriginShift } from './CjsStretchRuntime.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_loop, _init_extra_loop, _init_start, _init_extra_start, _init_end, _init_extra_end, _init_effect, _init_extra_effect, _init_destinationEmitter, _init_extra_destinationEmitter, _init_sourceEmitter, _init_extra_sourceEmitter, _init_quadCount, _init_extra_quadCount, _init_destinationObserver, _init_extra_destinationObserver, _init_sourceObserver, _init_extra_sourceObserver, _init_destinationLight, _init_extra_destinationLight, _init_sourceLight, _init_extra_sourceLight, _init_boundingRadius, _init_extra_boundingRadius;

/**
 * A simplified stretch that renders the span between two points as a strip of
 * quads with its own effect, end emitters, observers and point lights, instead
 * of hosting child objects.
 */
let _EveStretch;
new class extends _identity {
  static [class EveStretch2 extends _EveEntity {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_loop, _init_extra_loop, _init_start, _init_extra_start, _init_end, _init_extra_end, _init_effect, _init_extra_effect, _init_destinationEmitter, _init_extra_destinationEmitter, _init_sourceEmitter, _init_extra_sourceEmitter, _init_quadCount, _init_extra_quadCount, _init_destinationObserver, _init_extra_destinationObserver, _init_sourceObserver, _init_extra_sourceObserver, _init_destinationLight, _init_extra_destinationLight, _init_sourceLight, _init_extra_sourceLight, _init_boundingRadius, _init_extra_boundingRadius, _initProto],
        c: [_EveStretch, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveStretch2",
        family: "eve/renderable/stretch"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("TriCurveSet")], 16, "loop"], [[io, io.persist, void 0, type.model("TriCurveSet")], 16, "start"], [[io, io.persist, void 0, type.model("TriCurveSet")], 16, "end"], [[io, io.persist, void 0, type.model("Tr2Effect")], 16, "effect"], [[io, io.persist, void 0, type.model("Tr2GpuSharedEmitter")], 16, "destinationEmitter"], [[io, io.persist, void 0, type.model("Tr2GpuSharedEmitter")], 16, "sourceEmitter"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "quadCount"], [[io, io.persist, void 0, type.model("TriObserverLocal")], 16, "destinationObserver"], [[io, io.persist, void 0, type.model("TriObserverLocal")], 16, "sourceObserver"], [[io, io.persist, void 0, type.model("Tr2PointLight")], 16, "destinationLight"], [[io, io.persist, void 0, type.model("Tr2PointLight")], 16, "sourceLight"], [[io, io.persist, type, type.float32], 16, "boundingRadius"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("GPU buffer preparation belongs to runtime-engine; initialization validates the graph-owned quad count.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon rebuilds procedural GPU buffers here; runtime-trinity only enforces the authored 128-quad contract.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDestObjectScale"], [[carbon, carbon.method, impl, impl.noop], 18, "StartMoving"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveDuration"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon uses rand(); the browser uses Math.random for the per-shot shader seed.")], 18, "StartFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetFiringTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "DisplayEndPoints"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplay"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetIntensity"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateEffectSync"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateEffectAsync"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Generic emitters receive a plain update descriptor instead of Carbon's native UpdateArguments structure.")], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The browser frustum is duck-typed and receives a portable axis-aligned box descriptor.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The class is collected as a renderable; GPU batch realization remains runtime-engine work.")], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Light objects are forwarded without registering against Carbon's native light manager component registry.")], 18, "GetLights"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"]], 0, void 0, _EveEntity));
    }
    name = (_initProto(this), _init_name(this, ""));
    loop = (_init_extra_name(this), _init_loop(this, null));
    start = (_init_extra_loop(this), _init_start(this, null));
    end = (_init_extra_start(this), _init_end(this, null));
    effect = (_init_extra_end(this), _init_effect(this, null));
    destinationEmitter = (_init_extra_effect(this), _init_destinationEmitter(this, null));
    sourceEmitter = (_init_extra_destinationEmitter(this), _init_sourceEmitter(this, null));
    quadCount = (_init_extra_sourceEmitter(this), _init_quadCount(this, 0));
    destinationObserver = (_init_extra_quadCount(this), _init_destinationObserver(this, null));
    sourceObserver = (_init_extra_destinationObserver(this), _init_sourceObserver(this, null));
    destinationLight = (_init_extra_sourceObserver(this), _init_destinationLight(this, null));
    sourceLight = (_init_extra_destinationLight(this), _init_sourceLight(this, null));
    boundingRadius = (_init_extra_sourceLight(this), _init_boundingRadius(this, 100));
    #source = (_init_extra_boundingRadius(this), vec3.create());
    #destination = vec3.create();
    #sourceTransform = mat4.create();
    #destinationTransform = mat4.create();
    #destinationScale = 1;
    #currentDestinationScale = 1;
    #visible = true;
    #inFrustum = true;
    #startTime = 0;
    #intensity = 1;
    #effectData = [vec4.fromValues(0, 0, 0, Math.random()), vec4.fromValues(1, 0, 0, 0)];

    /**
     * Post-hydration hook; validates the authored quad count. Carbon also builds
     * the procedural GPU buffers here, which is engine work in this port.
     */
    Initialize() {
      return this.OnModified();
    }

    /**
     * Re-validates quadCount against the 128-quad procedural geometry limit after
     * a model update and throws a RangeError when it is exceeded.
     */
    OnModified() {
      if (this.quadCount > _EveStretch.MAX_QUAD_COUNT) {
        throw new RangeError(`EveStretch2.quadCount must be <= ${_EveStretch.MAX_QUAD_COUNT}`);
      }
      return true;
    }

    /**
     * Sets the destination-end scale and adopts it as the current one, undoing any
     * hidden-destination override left by DisplayEndPoints.
     */
    SetDestObjectScale(scale) {
      this.#destinationScale = this.#currentDestinationScale = Number(scale);
    }

    /** IEveFiringEffectElement move hook; EveStretch2 has no travelling child. */
    StartMoving() {}

    /** Longer of the start and loop curve-set durations. */
    GetCurveDuration() {
      return Math.max(getCurveDuration(this.start), getCurveDuration(this.loop));
    }

    /**
     * Begins a shot: reseeds the per-shot random value carried in the effect data, plays the start and loop sets from -delay and stops the end set.
     * @param {Number} [delay] - seconds the curve sets wait before reaching time zero
     */
    StartFiring(delay = 0) {
      this.#effectData[0][3] = Math.random();
      this.start?.PlayFrom?.(-delay);
      this.loop?.PlayFrom?.(-delay);
      this.end?.Stop?.();
    }

    /** Ends a shot: stops the start and loop sets and plays the end set. */
    StopFiring() {
      this.start?.Stop?.();
      this.loop?.Stop?.();
      this.end?.Play?.();
    }

    /**
     * Sets both endpoints, accepting either a 16-element source transform - of
     * which only the translation is kept, since the span orientation is rebuilt
     * each update - or a source position.
     */
    SetFiringTransform(source, destination) {
      if (source?.length === 16) mat4.getTranslation(this.#source, source);else vec3.copy(this.#source, source);
      vec3.copy(this.#destination, destination);
    }

    /**
     * Hides the destination end by zeroing its current scale; the source end is
     * always drawn, so the source flag is ignored.
     */
    DisplayEndPoints(_displaySource, displayDestination) {
      this.#currentDestinationScale = displayDestination ? this.#destinationScale : 0;
    }

    /**
     * Shows or hides the stretch, gating visibility, renderable collection and
     * light contribution.
     */
    SetDisplay(display) {
      this.#visible = !!display;
    }

    /**
     * Sets the intensity uploaded in per-object data, clamped to zero at the
     * bottom; a zero intensity also suppresses visibility, renderables and lights.
     */
    SetIntensity(intensity) {
      this.#intensity = Math.max(0, Number(intensity));
    }

    /**
     * IEveFiringEffectElement synchronous hook; EveStretch2 does all of its work
     * in the asynchronous phase.
     */
    UpdateEffectSync(_context) {
      return true;
    }

    /** IEveFiringEffectElement asynchronous hook; runs Update. */
    UpdateEffectAsync(context) {
      return this.Update(context);
    }

    /**
     * Advances the start, loop and end curve sets on time measured from the first
     * update, records each set's scaled time into the effect data that
     * GetPerObjectData uploads, rebuilds the two endpoint bases, and drives the
     * end observers and GPU emitters from them.
     */
    Update(context) {
      const time = getTime(context);
      if (this.#startTime === 0) this.#startTime = time;
      const relative = time - this.#startTime;
      const sets = [this.start, this.loop, this.end];
      for (let index = 0; index < sets.length; index++) {
        updateCurveSet(sets[index], relative);
        this.#effectData[0][index] = Number(sets[index]?.GetScaledTime?.() ?? sets[index]?.scaledTime ?? 0);
      }
      makeEndpointTransforms(this.#source, this.#destination, this.#sourceTransform, this.#destinationTransform);
      this.sourceObserver?.Update?.(this.#sourceTransform);
      this.destinationObserver?.Update?.(this.#destinationTransform);
      const gpuParticleSystem = context?.GetGpuParticleSystem?.() ?? context?.gpuParticleSystem ?? null;
      const originShift = getOriginShift(context);
      this.sourceEmitter?.Update?.({
        time,
        gpuParticleSystem,
        transform: this.#sourceTransform,
        originShift
      });
      this.destinationEmitter?.Update?.({
        time,
        gpuParticleSystem,
        transform: this.#destinationTransform,
        originShift
      });
      return true;
    }

    /**
     * Frustum-tests a box in the source basis that reaches boundingRadius sideways and the endpoint distance plus boundingRadius forwards, caching the result for GetRenderables; a hidden or zero-intensity stretch fails without testing, and a frustum that cannot test boxes passes.
     * @returns {Boolean} whether the stretch is in frustum
     */
    UpdateVisibility(context) {
      if (!(this.#visible && this.#intensity > 0)) {
        this.#inFrustum = false;
        return false;
      }
      const frustum = context?.GetFrustum?.() ?? context?.frustum;
      const bounds = {
        min: vec3.fromValues(-this.boundingRadius, -this.boundingRadius, -this.boundingRadius),
        max: vec3.fromValues(this.boundingRadius, this.boundingRadius, vec3.distance(this.#source, this.#destination) + this.boundingRadius),
        transform: this.#sourceTransform
      };
      this.#inFrustum = frustum?.IsBoxVisible ? !!frustum.IsBoxVisible(bounds) : true;
      return this.#inFrustum;
    }

    /**
     * Pushes the stretch itself when displayed, non-zero intensity and in frustum; the quad strip is built by the engine from the per-object data, not here.
     * @returns {Array} out
     */
    GetRenderables(out = []) {
      if (this.#visible && this.#intensity > 0 && this.#inFrustum) out.push(this);
      return out;
    }

    /** Carbon EveStretch2::GetPerObjectData (cpp:327-337): stamps
     * m_effectData[1].x = m_intensity, then uploads the contiguous member run
     * m_source..m_effectData[2] (EveStretch2.h:105-109) - 4 vec4s - to BOTH
     * per-object slots (cpp:23-39). One payload, stages ["vs", "ps"]. */
    GetPerObjectData(accumulator) {
      this.#effectData[1][0] = this.#intensity;
      const data = accumulator.Alloc("EveStretch2PerObjectData");
      data.Set("sourceData", [this.#source[0], this.#source[1], this.#source[2], this.#currentDestinationScale]);
      data.Set("destinationData", [this.#destination[0], this.#destination[1], this.#destination[2], this.#destinationScale]);
      data.Set("effectData", this.#effectData[0], 0);
      data.Set("effectData", this.#effectData[1], 1);
      return data;
    }

    /**
     * Offers the source and destination point lights at their endpoint bases, the
     * destination scaled by its current scale; nothing is offered while hidden or
     * at zero intensity.
     */
    GetLights(lightManager) {
      if (!(this.#visible && this.#intensity > 0)) return;
      this.sourceLight?.AddLight?.(lightManager, this.#sourceTransform, 1);
      this.destinationLight?.AddLight?.(lightManager, this.#destinationTransform, this.#currentDestinationScale);
    }

    /** Carbon EveStretch2::RegisterComponents (cpp:389-398): LightOwner leaf
     * self-registration. Gate (m_visible && m_intensity > 0) && a source or
     * destination light. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      const isActive = this.#visible && this.#intensity > 0;
      const hasLights = this.sourceLight || this.destinationLight;
      if (registry && isActive && hasLights) {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }

    /**
     * Copies the source endpoint position.
     * @param {Array} [out] - caller-owned vec3; a fresh vector is allocated when omitted
     * @returns {Array} out
     */
    GetSourcePosition(out = vec3.create()) {
      return vec3.copy(out, this.#source);
    }

    /**
     * Copies the destination endpoint position.
     * @param {Array} [out] - caller-owned vec3; a fresh vector is allocated when omitted
     * @returns {Array} out
     */
    GetDestinationPosition(out = vec3.create()) {
      return vec3.copy(out, this.#destination);
    }

    /**
     * Copies the source endpoint basis, which is only valid once Update has run.
     * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
     * @returns {Array} out
     */
    GetSourceTransform(out = mat4.create()) {
      return mat4.copy(out, this.#sourceTransform);
    }

    /**
     * Copies the destination endpoint basis, which is only valid once Update has run.
     * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
     * @returns {Array} out
     */
    GetDestinationTransform(out = mat4.create()) {
      return mat4.copy(out, this.#destinationTransform);
    }
  }];
  MAX_QUAD_COUNT = 128;
  constructor() {
    super(_EveStretch), _initClass();
  }
}();

export { _EveStretch as EveStretch2 };
//# sourceMappingURL=EveStretch2.js.map
