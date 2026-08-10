import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { Tr2Lod } from '@carbonenginejs/runtime-utils/const/trinity';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { TriFloat as _TriFloat } from '../../../core/variable/TriFloat.js';
import { getTime, sampleVector, updateChildAsync, updateCurveSet, makeEndpointTransforms, updateChildVisibility, makeStretchTransform, translationMatrix, collectRenderables, getCurveDuration, mergeSphere } from './CjsStretchRuntime.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_source, _init_extra_source, _init_dest, _init_extra_dest, _init_stretchAudio, _init_extra_stretchAudio, _init_lodLevel, _init_extra_lodLevel, _init_progressCurve, _init_extra_progressCurve, _init_moveCompletion, _init_extra_moveCompletion, _init_curveSets, _init_extra_curveSets, _init_length, _init_extra_length, _init_moving, _init_extra_moving, _init_moveCompleted, _init_extra_moveCompleted, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_destLights, _init_extra_destLights, _init_sourceLights, _init_extra_sourceLights, _init_destObject, _init_extra_destObject, _init_sourceObject, _init_extra_sourceObject, _init_stretchObject, _init_extra_stretchObject, _init_useCurveLod, _init_extra_useCurveLod, _init_startTime, _init_extra_startTime, _init_audio, _init_extra_audio, _init_moveObject, _init_extra_moveObject;

/**
 * An effect drawn between a source point and a destination point, hosting
 * transform children pinned at each end, stretched along the span, and
 * travelling from one end to the other.
 */
let _EveStretch;
new class extends _identity {
  static [class EveStretch extends _EveEntity {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_source, _init_extra_source, _init_dest, _init_extra_dest, _init_stretchAudio, _init_extra_stretchAudio, _init_lodLevel, _init_extra_lodLevel, _init_progressCurve, _init_extra_progressCurve, _init_moveCompletion, _init_extra_moveCompletion, _init_curveSets, _init_extra_curveSets, _init_length, _init_extra_length, _init_moving, _init_extra_moving, _init_moveCompleted, _init_extra_moveCompleted, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_destLights, _init_extra_destLights, _init_sourceLights, _init_extra_sourceLights, _init_destObject, _init_extra_destObject, _init_sourceObject, _init_extra_sourceObject, _init_stretchObject, _init_extra_stretchObject, _init_useCurveLod, _init_extra_useCurveLod, _init_startTime, _init_extra_startTime, _init_audio, _init_extra_audio, _init_moveObject, _init_extra_moveObject, _initProto],
        c: [_EveStretch, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveStretch",
        family: "eve/renderable/stretch"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "source"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "dest"], [[io, io.persist, void 0, type.model("IStretchAudio")], 16, "stretchAudio"], [[io, io.read, type, type.int32, void 0, type.enum("Tr2Lod")], 16, "lodLevel"], [[io, io.persist, void 0, type.model("ITriScalarFunction")], 16, "progressCurve"], [[io, io.persist, void 0, type.model("TriCurveSet")], 16, "moveCompletion"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.persist, void 0, type.model("TriFloat")], 16, "length"], [[io, io.readwrite, type, type.boolean], 16, "moving"], [[io, io.readwrite, type, type.boolean], 16, "moveCompleted"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.boolean], 16, "update"], [[io, io.persist, void 0, type.list("Tr2Light")], 16, "destLights"], [[io, io.persist, void 0, type.list("Tr2Light")], 16, "sourceLights"], [[io, io.persist, void 0, type.model("EveTransform")], 16, "destObject"], [[io, io.persist, void 0, type.model("EveTransform")], 16, "sourceObject"], [[io, io.persist, void 0, type.model("EveTransform")], 16, "stretchObject"], [[io, io.persist, type, type.boolean], 16, "useCurveLod"], [[io, io.read, type, type.float64], 16, "startTime"], [[io, io.persist, void 0, type.model("ITr2Audio")], 16, "audio"], [[io, io.persist, void 0, type.model("EveTransform")], 16, "moveObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSynchronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon splits synchronous and asynchronous work; the browser graph keeps both phases but executes child calls serially.")], 18, "UpdateAsynchronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Curve LOD is renderer policy in Carbon; runtime-trinity retains the authored gate and updates graph curves without device globals.")], 18, "UpdateCurves"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The transforms are computed in Trinity, while child render realization remains backend-owned.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Renderable collection is backend-neutral; runtime-engine turns the returned objects into draw batches.")], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartMoving"], [[carbon, carbon.method, impl, impl.implemented], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplay"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSourcePosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDestinationPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSourceTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDestinationTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetIsNegZForward"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetFiringTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "DisplayEndPoints"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSourceObjectScale"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDestObjectScale"], [[carbon, carbon.method, impl, impl.noop], 18, "SetIntensity"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Bounds are merged from graph children without Carbon's native BoundingSphere helper.")], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Light ownership is forwarded to browser light objects; device light-manager registration stays outside Trinity.")], 18, "GetLights"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"]], 0, void 0, _EveEntity));
    }
    name = (_initProto(this), _init_name(this, ""));
    source = (_init_extra_name(this), _init_source(this, null));
    dest = (_init_extra_source(this), _init_dest(this, null));
    stretchAudio = (_init_extra_dest(this), _init_stretchAudio(this, null));
    lodLevel = (_init_extra_stretchAudio(this), _init_lodLevel(this, 0));
    progressCurve = (_init_extra_lodLevel(this), _init_progressCurve(this, null));
    moveCompletion = (_init_extra_progressCurve(this), _init_moveCompletion(this, null));
    curveSets = (_init_extra_moveCompletion(this), _init_curveSets(this, []));
    length = (_init_extra_curveSets(this), _init_length(this, new _TriFloat()));
    moving = (_init_extra_length(this), _init_moving(this, false));
    moveCompleted = (_init_extra_moving(this), _init_moveCompleted(this, false));
    display = (_init_extra_moveCompleted(this), _init_display(this, true));
    update = (_init_extra_display(this), _init_update(this, true));
    destLights = (_init_extra_update(this), _init_destLights(this, []));
    sourceLights = (_init_extra_destLights(this), _init_sourceLights(this, []));
    destObject = (_init_extra_sourceLights(this), _init_destObject(this, null));
    sourceObject = (_init_extra_destObject(this), _init_sourceObject(this, null));
    stretchObject = (_init_extra_sourceObject(this), _init_stretchObject(this, null));
    useCurveLod = (_init_extra_stretchObject(this), _init_useCurveLod(this, true));
    startTime = (_init_extra_useCurveLod(this), _init_startTime(this, -1));
    audio = (_init_extra_startTime(this), _init_audio(this, null));
    moveObject = (_init_extra_audio(this), _init_moveObject(this, null));
    #sourcePosition = (_init_extra_moveObject(this), vec3.create());
    #destinationPosition = vec3.create();
    #sourceTransform = mat4.create();
    #destinationTransform = mat4.create();
    #useTransforms = false;
    #displaySource = true;
    #displayDestination = true;
    #sourceScale = 1;
    #destinationScale = 1;
    #negativeZ = false;

    /**
     * Samples the source and destination position curves for the frame; with no
     * source curve the source position falls back to the translation of the
     * transform last given to SetSourceTransform. Skipped entirely while update is
     * false.
     */
    UpdateSynchronous(context) {
      if (!this.update) return true;
      const time = getTime(context);
      if (this.source) sampleVector(this.source, time, this.#sourcePosition);else if (this.#useTransforms) mat4.getTranslation(this.#sourcePosition, this.#sourceTransform);
      if (this.dest) sampleVector(this.dest, time, this.#destinationPosition);
      return true;
    }

    /** Carbon's IEveSpaceObject2 spelling of UpdateSynchronous; forwards unchanged. */
    UpdateSyncronous(context) {
      return this.UpdateSynchronous(context);
    }

    /**
     * Advances the curves, records the endpoint separation in length, forwards the
     * asynchronous phase to the displayed endpoint children plus the stretch and
     * move children, and feeds both audio objects the current endpoints.
     */
    UpdateAsynchronous(context) {
      if (!this.update) return true;
      this.UpdateCurves(context);
      this.length.value = vec3.distance(this.#sourcePosition, this.#destinationPosition);
      if (this.#displaySource) updateChildAsync(this.sourceObject, context);
      if (this.#displayDestination) updateChildAsync(this.destObject, context);
      updateChildAsync(this.stretchObject, context);
      updateChildAsync(this.moveObject, context);
      this.audio?.Update?.(this.#sourcePosition, this.#destinationPosition);
      this.stretchAudio?.Update?.(this.#sourcePosition, this.#destinationPosition);
      return true;
    }

    /**
     * Carbon's IEveSpaceObject2 spelling of UpdateAsynchronous; forwards
     * unchanged.
     */
    UpdateAsyncronous(context) {
      return this.UpdateAsynchronous(context);
    }

    /**
     * IEveFiringEffectElement synchronous hook; EveStretch does all of its firing
     * work in the asynchronous phase, so this only reports success.
     */
    UpdateEffectSync(context) {
      return true;
    }

    /**
     * IEveFiringEffectElement asynchronous hook; runs both update phases through
     * Update.
     */
    UpdateEffectAsync(context) {
      return this.Update(context);
    }

    /**
     * Runs both update phases in order, for callers that drive the stretch outside
     * the scene's split synchronous/asynchronous pass.
     */
    Update(context) {
      this.UpdateSynchronous(context);
      this.UpdateAsynchronous(context);
      return true;
    }

    /**
     * Advances the curve sets, the progress curve and the move-completion set on
     * time measured from startTime, which is latched on the first frame after
     * StartMoving.
     */
    UpdateCurves(context) {
      const time = getTime(context);
      if (this.startTime < 0 && this.moving) this.startTime = time;
      const relative = this.startTime >= 0 ? time - this.startTime : time;
      for (const curveSet of this.curveSets) updateCurveSet(curveSet, relative);
      if (this.progressCurve) {
        if (typeof this.progressCurve.UpdateValue === "function") this.progressCurve.UpdateValue(relative);else this.progressCurve.Update?.(relative);
      }
      updateCurveSet(this.moveCompletion, relative);
    }

    /**
     * Computes the source, destination, stretch and move placements for the frame
     * and hands each to its child; the stretch itself never draws, so nothing is
     * realized on the GPU here. In transform mode (SetSourceTransform) the
     * authored transforms are used, the source taking a fixed -90 degree X
     * correction and parentTransform being ignored; otherwise the bases are
     * derived from the sampled endpoints, scaled by the endpoint scales and
     * combined with parentTransform. Latches moveCompleted and hides the move
     * child once the progress curve reaches 1.
     */
    UpdateVisibility(context, parentTransform = _EveStretch.#identity) {
      if (!this.display) return;
      const sourceTransform = _EveStretch.#sourceMatrix;
      const destinationTransform = _EveStretch.#destinationMatrix;
      if (this.#useTransforms) {
        mat4.multiply(sourceTransform, this.#sourceTransform, _EveStretch.#sourceCorrection);
        mat4.copy(destinationTransform, this.#destinationTransform);
        destinationTransform[0] *= this.#destinationScale;
        destinationTransform[1] *= this.#destinationScale;
        destinationTransform[2] *= this.#destinationScale;
        destinationTransform[4] *= this.#destinationScale;
        destinationTransform[5] *= this.#destinationScale;
        destinationTransform[6] *= this.#destinationScale;
        destinationTransform[8] *= this.#destinationScale;
        destinationTransform[9] *= this.#destinationScale;
        destinationTransform[10] *= this.#destinationScale;
      } else {
        makeEndpointTransforms(this.#sourcePosition, this.#destinationPosition, sourceTransform, destinationTransform);
        for (const index of [0, 1, 2, 4, 5, 6, 8, 9, 10]) {
          sourceTransform[index] *= this.#sourceScale;
          destinationTransform[index] *= this.#destinationScale;
        }
        if (parentTransform?.length === 16) {
          mat4.multiply(sourceTransform, parentTransform, sourceTransform);
          mat4.multiply(destinationTransform, parentTransform, destinationTransform);
        }
      }
      if (this.#displaySource) updateChildVisibility(this.sourceObject, context, sourceTransform);
      if (this.#displayDestination) updateChildVisibility(this.destObject, context, destinationTransform);
      const stretchTransform = _EveStretch.#stretchMatrix;
      if (this.#useTransforms) {
        mat4.copy(stretchTransform, this.#sourceTransform);
        const stretchLength = this.length.value * (this.#negativeZ ? -1 : 1);
        stretchTransform[8] *= stretchLength;
        stretchTransform[9] *= stretchLength;
        stretchTransform[10] *= stretchLength;
      } else {
        makeStretchTransform(this.#sourcePosition, this.#destinationPosition, stretchTransform, this.#negativeZ);
        if (parentTransform?.length === 16) mat4.multiply(stretchTransform, parentTransform, stretchTransform);
      }
      updateChildVisibility(this.stretchObject, context, stretchTransform);
      if (this.moveObject) {
        const progression = Number(this.progressCurve?.value ?? this.progressCurve?.GetValue?.() ?? 0);
        vec3.lerp(_EveStretch.#movePosition, this.#sourcePosition, this.#destinationPosition, progression);
        updateChildVisibility(this.moveObject, context, translationMatrix(_EveStretch.#movePosition, _EveStretch.#moveMatrix));
        if (progression >= 1 && !this.moveCompleted) {
          this.moveCompleted = true;
          this.moveObject.SetDisplay?.(false);
          this.moveCompletion?.Play?.();
        }
      }
    }

    /**
     * Appends the displayed children's renderables to out; this package stops at collection, and runtime-engine turns the collected objects into draw batches.
     * @returns {Array} out
     */
    GetRenderables(out = []) {
      if (!this.display) return out;
      if (this.#displaySource) collectRenderables(this.sourceObject, out);
      if (this.#displayDestination) collectRenderables(this.destObject, out);
      collectRenderables(this.stretchObject, out);
      collectRenderables(this.moveObject, out);
      return out;
    }

    /**
     * Restarts the travelling child from the source end: clears the latched start
     * time and the completion flag, re-shows the move child and fires the stretch
     * audio event.
     */
    StartMoving() {
      this.startTime = -1;
      this.moving = true;
      this.moveCompleted = false;
      this.moveObject?.SetDisplay?.(true);
      if (typeof this.audio?.TriggerStretchEvent === "function") this.audio.TriggerStretchEvent();else this.audio?.SendEvent?.("wise:/msg_fx_play_stretch");
    }

    /** Starts the travelling child and plays the first curve set. */
    Start() {
      this.StartMoving();
      this.curveSets[0]?.Play?.();
    }

    /**
     * Shows or hides the whole stretch, gating visibility, renderable collection
     * and light contribution.
     */
    SetDisplay(display) {
      this.display = !!display;
    }

    /**
     * Pins the source endpoint to a plain position, which also switches the
     * stretch out of transform mode so the source orientation is derived from the
     * span again.
     */
    SetSourcePosition(value) {
      this.#useTransforms = false;
      vec3.copy(this.#sourcePosition, value);
    }

    /**
     * Pins the destination endpoint and rebuilds its transform as a pure
     * translation.
     */
    SetDestinationPosition(value) {
      vec3.copy(this.#destinationPosition, value);
      translationMatrix(value, this.#destinationTransform);
    }

    /**
     * Pins the source endpoint from a full transform and switches the stretch into
     * transform mode, so UpdateVisibility uses the supplied orientation instead of
     * deriving one from the two endpoints.
     */
    SetSourceTransform(value) {
      this.#useTransforms = true;
      mat4.copy(this.#sourceTransform, value);
      mat4.getTranslation(this.#sourcePosition, value);
    }

    /**
     * Pins the destination endpoint from a full transform and takes its position
     * from that transform's translation.
     */
    SetDestinationTransform(value) {
      mat4.copy(this.#destinationTransform, value);
      mat4.getTranslation(this.#destinationPosition, value);
    }

    /**
     * Reverses the direction the stretch child is scaled along, for effects
     * authored pointing down -Z.
     */
    SetIsNegZForward(value) {
      this.#negativeZ = !!value;
    }

    /**
     * Longest curve-set duration in seconds, each divided by that set's own time
     * scale.
     */
    GetCurveDuration() {
      let duration = 0;
      for (const curveSet of this.curveSets) {
        const timeScale = Number(curveSet?.GetTimeScale?.() ?? curveSet?.timeScale ?? 1) || 1;
        duration = Math.max(duration, getCurveDuration(curveSet) / timeScale);
      }
      return duration;
    }

    /**
     * Begins a firing cycle by curve-set name convention: play_start and play_loop are played from -delay, play_end is stopped, and the audio outburst/impact/stretch events are triggered. Starting play_start also restarts the travelling child.
     * @param {Number} [delay] - seconds the curve sets wait before reaching time zero
     */
    StartFiring(delay = 0) {
      for (const curveSet of this.curveSets) {
        const name = curveSet?.GetName?.() ?? curveSet?.name;
        if (name === "play_start") {
          curveSet.PlayFrom?.(-delay);
          this.StartMoving();
        } else if (name === "play_loop") curveSet.PlayFrom?.(-delay);else if (name === "play_end") curveSet.Stop?.();
      }
      this.stretchAudio?.Start?.();
      this.audio?.TriggerOutburstEvent?.();
      this.audio?.TriggerImpactEvent?.();
      this.audio?.TriggerStretchEvent?.();
    }

    /**
     * Ends a firing cycle: play_start and play_loop stop, play_end plays, the
     * travelling child restarts and the stretch audio stops.
     */
    StopFiring() {
      for (const curveSet of this.curveSets) {
        const name = curveSet?.GetName?.() ?? curveSet?.name;
        if (name === "play_start") {
          curveSet.Stop?.();
          this.StartMoving();
        } else if (name === "play_loop") curveSet.Stop?.();else if (name === "play_end") curveSet.Play?.();
      }
      this.stretchAudio?.Stop?.();
    }

    /**
     * Sets both endpoints from a firing call, accepting either a 16-element source
     * transform or a source position, and marks the stretch as -Z forward.
     */
    SetFiringTransform(source, destination) {
      if (source?.length === 16) this.SetSourceTransform(source);else this.SetSourcePosition(source);
      this.SetDestinationPosition(destination);
      this.SetIsNegZForward(true);
    }

    /**
     * Selects which endpoint children take part in updates, visibility, renderable
     * collection and light contribution.
     */
    DisplayEndPoints(displaySource, displayDestination) {
      this.#displaySource = !!displaySource;
      this.#displayDestination = !!displayDestination;
    }

    /**
     * Uniform scale applied to the source endpoint child's basis and to its light
     * placement.
     */
    SetSourceObjectScale(scale) {
      this.#sourceScale = Number(scale);
    }

    /**
     * Uniform scale applied to the destination endpoint child's basis and to its
     * light placement.
     */
    SetDestObjectScale(scale) {
      this.#destinationScale = Number(scale);
    }

    /**
     * IEveFiringEffectElement intensity hook; EveStretch has no intensity term of
     * its own.
     */
    SetIntensity(_intensity) {}

    /**
     * Merges the bounding spheres of the source, destination and stretch children; the travelling child is not included.
     * @param {Array} out - caller-owned packed (x, y, z, radius), overwritten
     * @returns {Boolean} whether any child contributed a sphere
     */
    GetBoundingSphere(out = vec4.create()) {
      vec4.set(out, 0, 0, 0, 0);
      for (const child of [this.sourceObject, this.destObject, this.stretchObject]) {
        if (typeof child?.GetBoundingSphere === "function" && child.GetBoundingSphere(_EveStretch.#sphere) !== false) {
          mergeSphere(out, _EveStretch.#sphere);
        }
      }
      return out[3] > 0;
    }

    /**
     * Offers the source and destination lights to the light manager at their
     * endpoint positions, each scaled by its endpoint scale; a hidden stretch or a
     * hidden endpoint contributes nothing.
     */
    GetLights(lightManager) {
      if (!this.display) return;
      const source = translationMatrix(this.#sourcePosition, _EveStretch.#lightSource, this.#sourceScale);
      const destination = translationMatrix(this.#destinationPosition, _EveStretch.#lightDestination, this.#destinationScale);
      if (this.#displaySource) for (const light of this.sourceLights) light?.AddLight?.(lightManager, source, this.#sourceScale);
      if (this.#displayDestination) for (const light of this.destLights) light?.AddLight?.(lightManager, destination, this.#destinationScale);
    }

    /** Carbon EveStretch::RegisterComponents (cpp:606-613): LightOwner leaf
     * self-registration. Gate m_display. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display) {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }
  }];
  Tr2Lod = Tr2Lod;
  #identity = mat4.create();
  #sourceMatrix = mat4.create();
  #destinationMatrix = mat4.create();
  #stretchMatrix = mat4.create();
  #moveMatrix = mat4.create();
  #movePosition = vec3.create();
  #sphere = vec4.create();
  #lightSource = mat4.create();
  #lightDestination = mat4.create();
  #sourceCorrection = mat4.fromXRotation(mat4.create(), -Math.PI * 0.5);
  constructor() {
    super(_EveStretch), _initClass();
  }
}();

export { _EveStretch as EveStretch };
//# sourceMappingURL=EveStretch.js.map
