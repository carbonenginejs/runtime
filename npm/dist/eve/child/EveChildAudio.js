import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl, CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from './EveChildTransform.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_mute, _init_extra_mute, _init_audioEmitter, _init_extra_audioEmitter;

/**
 * Space-object child that owns a positional audio emitter and keeps its position
 * and orientation tracking the child's world transform.
 */
let _EveChildAudio;
new class extends _identity {
  static [class EveChildAudio extends _EveChildTransform {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_mute, _init_extra_mute, _init_audioEmitter, _init_extra_audioEmitter, _initProto],
        c: [_EveChildAudio, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildAudio",
        family: "eve/child"
      })], [[[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "mute"], [[io, io.persist, void 0, type.model("ITr2AudEmitter")], 16, "audioEmitter"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEmitterName"]], 0, void 0, _EveChildTransform));
    }
    constructor(...args) {
      super(...args);
      _init_extra_audioEmitter(this);
    }
    name = (_initProto(this), _init_name(this, "EveChildAudio"));
    mute = (_init_extra_name(this), _init_mute(this, false));
    audioEmitter = (_init_extra_mute(this), _init_audioEmitter(this, null));

    /**
     * Creates the emitter from the schema registry when none was authored and
     * initializes it at the current world position; returns false when no
     * AudEmitter class is registered, and true when an emitter already exists.
     */
    Initialize() {
      if (this.audioEmitter) return true;
      const Emitter = CjsSchema.GetConstructor("AudEmitter");
      if (!Emitter) return false;
      this.audioEmitter = new Emitter();
      const position = mat4.getTranslation(vec3.create(), this.worldTransform);
      return this.audioEmitter.Initialize?.(this.name || "audio_object", "", position) !== false;
    }

    /** Construction hook; forwards to Initialize. */
    __init__() {
      return this.Initialize();
    }

    /** Renames the underlying emitter without touching this child's own name field. */
    SetEmitterName(name) {
      this.audioEmitter?.SetName?.(String(name));
    }

    /** Returns the authored child name, which is also the emitter's default name. */
    GetName() {
      return this.name;
    }

    /**
     * Sets the authored child name; the emitter only picks it up through
     * OnModified or an explicit SetEmitterName.
     */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /**
     * Applies a mute change by muting or unmuting the emitter and a name change by
     * renaming it (falling back to "audio_object" when the name is empty); the
     * value argument follows the repo's OnModified duck of field name or field
     * value.
     */
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
     * Rebuilds the world transform from the parent - preferring the parent's own
     * live localToWorld over the params copy - and, while unmuted, pushes the
     * emitter its position plus front and top orientation vectors derived from
     * that transform's rotation.
     */
    UpdateSyncronous(_updateContext, params = {}) {
      const parent = params.childParent ?? params.spaceObjectParent ?? null;
      const parentTransform = parent?.GetLocalToWorldTransform?.(mat4.create()) ?? params.localToWorldTransform ?? mat4.create();
      this.UpdateTransform(parentTransform);
      if (this.audioEmitter && !this.mute) {
        const position = mat4.getTranslation(vec3.create(), this.worldTransform);
        const rotation = mat4.getRotation(quat.create(), this.worldTransform);
        const front = vec3.transformQuat(vec3.create(), _EveChildAudio.FRONT, rotation);
        const top = vec3.transformQuat(vec3.create(), _EveChildAudio.TOP, rotation);
        this.audioEmitter.SetPosition?.(front, top, position);
      }
    }

    /**
     * No-op: the emitter is driven entirely from the sync pass, where the parent
     * transform is already final.
     */
    UpdateAsyncronous(_updateContext, _params) {}

    /** No-op: an audio child is never rendered and keeps no visibility state. */
    UpdateVisibility(_updateContext, _parentTransform, _parentLod) {}

    /** No-op: an audio child contributes no renderables. */
    GetRenderables(_renderables) {}

    /**
     * Always returns false and leaves out untouched: an emitter has no spatial
     * extent to contribute to the owner's bounds.
     */
    GetBoundingSphere(_out, _query = 0) {
      return false;
    }

    /**
     * Copies the child's world transform, as rebuilt by the last sync update.
     * @param {Float32Array} [out] - caller-owned; allocated when omitted
     * @returns {Float32Array} out
     */
    GetLocalToWorldTransform(out = mat4.create()) {
      return mat4.copy(out, this.worldTransform);
    }

    /**
     * No-op override: the audio child never composes a local transform from
     * authored SRT values, so its world transform is the parent's.
     */
    Setup(_scale, _rotation, _translation, _lowestLodVisible) {}

    /** No-op: an audio child has no LOD levels. */
    ChangeLOD(_lod) {}
  }];
  FRONT = Object.freeze([0, 1, 0]);
  TOP = Object.freeze([0, 0, 1]);
  constructor() {
    super(_EveChildAudio), _initClass();
  }
}();

export { _EveChildAudio as EveChildAudio };
//# sourceMappingURL=EveChildAudio.js.map
