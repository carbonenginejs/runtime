import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, CjsSchema } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_audioEmitter, _init_extra_audioEmitter, _init_translationCurve, _init_extra_translationCurve, _init_rotationCurve, _init_extra_rotationCurve, _init_externalParameters, _init_extra_externalParameters, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_mute, _init_extra_mute, _init_name, _init_extra_name, _init_display, _init_extra_display;

/**
 * A freely placed audio emitter driven by its own translation and rotation
 * curves, so a sound can sit anywhere in a scene without being attached to an
 * asset.
 */
let _AudioGameObject;
new class extends _identity {
  static [class AudioGameObject extends CjsModel {
    static {
      ({
        e: [_init_audioEmitter, _init_extra_audioEmitter, _init_translationCurve, _init_extra_translationCurve, _init_rotationCurve, _init_extra_rotationCurve, _init_externalParameters, _init_extra_externalParameters, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_mute, _init_extra_mute, _init_name, _init_extra_name, _init_display, _init_extra_display, _initProto],
        c: [_AudioGameObject, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "AudioGameObject",
        family: "eve"
      })], [[[io, io.persist, void 0, type.objectRef("ITr2AudEmitter")], 16, "audioEmitter"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "translationCurve"], [[io, io.persist, void 0, type.model("ITriQuaternionFunction")], 16, "rotationCurve"], [[io, io.persist, void 0, type.list("Tr2ExternalParameter")], 16, "externalParameters"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "mute"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAudioEmitter"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEmitterName"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayAudioEvent"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_display(this);
    }
    #worldTransform = (_initProto(this), mat4.create());
    audioEmitter = _init_audioEmitter(this, null);
    translationCurve = (_init_extra_audioEmitter(this), _init_translationCurve(this, null));
    rotationCurve = (_init_extra_translationCurve(this), _init_rotationCurve(this, null));
    externalParameters = (_init_extra_rotationCurve(this), _init_externalParameters(this, []));
    rotation = (_init_extra_externalParameters(this), _init_rotation(this, quat.create()));
    translation = (_init_extra_rotation(this), _init_translation(this, vec3.create()));
    mute = (_init_extra_translation(this), _init_mute(this, false));
    name = (_init_extra_mute(this), _init_name(this, ""));
    display = (_init_extra_name(this), _init_display(this, true));

    /**
     * Creates the emitter from the registered AudEmitter class if there is not one
     * already, places it at the object's current world position, and reports
     * whether the emitter accepted initialization.
     */
    Initialize() {
      if (this.audioEmitter) return true;
      const Emitter = CjsSchema.GetConstructor("AudEmitter");
      if (!Emitter) return false;
      this.audioEmitter = new Emitter();
      this.UpdateWorldTransform(0);
      const position = this.GetWorldPosition(vec3.create());
      const initialized = this.audioEmitter.Initialize?.(this.name || "audio_object", "", position);
      this.#SetEmitterPosition(position);
      return initialized !== false;
    }

    /** Post-hydration hook; runs Initialize. */
    __init__() {
      return this.Initialize();
    }

    /** The emitter this object drives, or null before Initialize has run. */
    GetAudioEmitter() {
      return this.audioEmitter;
    }

    /**
     * Renames the underlying emitter without touching this object's own name
     * field.
     */
    SetEmitterName(name) {
      this.audioEmitter?.SetName?.(String(name));
    }

    /**
     * Sends a named event to the emitter and returns the identifier it hands back,
     * or 0 when there is no emitter or no event name.
     */
    PlayAudioEvent(eventName) {
      if (!this.audioEmitter || !eventName) return 0;
      return this.audioEmitter.SendEvent?.(String(eventName)) ?? 0;
    }

    /** Applies a changed mute flag or name to the emitter after a model update. */
    OnModified(value = null) {
      if (value === "mute" || value === this.mute) {
        this.audioEmitter?.[this.mute ? "Mute" : "Unmute"]?.();
      }
      if (value === "name" || value === this.name) {
        this.SetEmitterName(this.name || "audio_object");
      }
      return true;
    }

    /**
     * Re-evaluates the transform curves for the frame and pushes the resulting
     * position and orientation to the emitter, unless the object is muted.
     */
    UpdateSyncronous(updateContext = null) {
      const time = updateContext?.GetTime?.() ?? updateContext?.time ?? 0;
      this.UpdateWorldTransform(time);
      if (this.audioEmitter && !this.mute) {
        this.#SetEmitterPosition(this.GetWorldPosition(vec3.create()));
      }
    }

    /**
     * IEveSpaceObject2 asynchronous phase; the object does all of its work
     * synchronously.
     */
    UpdateAsyncronous(_updateContext = null) {}

    /** IEveSpaceObject2 hook; an audio object has nothing to cull. */
    UpdateVisibility(_updateContext, _parentTransform) {}

    /** IEveSpaceObject2 hook; an audio object contributes no renderables. */
    GetRenderables(_renderables, _impostors = null) {}

    /**
     * Reports a unit sphere at the object's world position, so scene traversal has something to place it by.
     * @param {Array} out - caller-owned packed (x, y, z, radius), overwritten
     */
    GetBoundingSphere(out = vec4.create()) {
      const position = this.GetWorldPosition(vec3.create());
      vec4.set(out, position[0], position[1], position[2], 1);
      return true;
    }

    /**
     * Copies the transform stamped by the last UpdateWorldTransform.
     * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
     * @returns {Array} out
     */
    GetLocalToWorldTransform(out = mat4.create()) {
      return mat4.copy(out, this.#worldTransform);
    }

    /**
     * Copies the translation of the transform stamped by the last UpdateWorldTransform.
     * @param {Array} [out] - caller-owned vec3; a fresh vector is allocated when omitted
     * @returns {Array} out
     */
    GetWorldPosition(out = vec3.create()) {
      return mat4.getTranslation(out, this.#worldTransform);
    }

    /**
     * Copies the normalized rotation of the transform stamped by the last UpdateWorldTransform.
     * @param {Array} [out] - caller-owned quat; a fresh quaternion is allocated when omitted
     * @returns {Array} out
     */
    GetWorldRotation(out = quat.create()) {
      return quat.normalize(out, mat4.getRotation(out, this.#worldTransform));
    }

    /**
     * Reports a fixed unit cube; the object has no geometry, but scene code
     * expects a box.
     */
    GetLocalBoundingBox(outMin, outMax) {
      vec3.set(outMin, -1, -1, -1);
      vec3.set(outMax, 1, 1, 1);
      return true;
    }

    /**
     * Rebuilds the world transform from the authored translation and rotation after letting the transform curves overwrite them at the given time.
     * @returns {Array} the object's own matrix, valid only until the next call
     */
    UpdateWorldTransform(time) {
      const translation = vec3.clone(this.translation);
      const rotation = quat.clone(this.rotation);
      this.translationCurve?.Update?.(translation, time);
      this.rotationCurve?.Update?.(rotation, time);
      mat4.fromRotationTranslation(this.#worldTransform, rotation, translation);
      return this.#worldTransform;
    }

    /**
     * Pushes a position to the emitter together with the object's front and top
     * axes rotated into world space, which is what gives the sound its
     * orientation.
     */
    #SetEmitterPosition(position) {
      const rotation = this.GetWorldRotation(quat.create());
      const front = vec3.transformQuat(vec3.create(), _AudioGameObject.FRONT, rotation);
      const top = vec3.transformQuat(vec3.create(), _AudioGameObject.TOP, rotation);
      this.audioEmitter?.SetPosition?.(front, top, position);
    }
  }];
  FRONT = Object.freeze([0, 1, 0]);
  TOP = Object.freeze([0, 0, 1]);
  constructor() {
    super(_AudioGameObject), _initClass();
  }
}();

export { _AudioGameObject as AudioGameObject };
//# sourceMappingURL=AudioGameObject.js.map
