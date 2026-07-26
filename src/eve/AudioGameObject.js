// Ported/adapted from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/AudioGameObject.h
//   trinity/trinity/Eve/AudioGameObject.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, CjsSchema, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/**
 * A freely placed audio emitter driven by its own translation and rotation
 * curves, so a sound can sit anywhere in a scene without being attached to an
 * asset.
 */
@type.define({ className: "AudioGameObject", family: "eve" })
export class AudioGameObject extends CjsModel
{
  #worldTransform = mat4.create();

  @io.persist
  @type.objectRef("ITr2AudEmitter")
  audioEmitter = null;

  @io.persist
  @type.model("ITriVectorFunction")
  translationCurve = null;

  @io.persist
  @type.model("ITriQuaternionFunction")
  rotationCurve = null;

  @io.persist
  @type.list("Tr2ExternalParameter")
  externalParameters = [];

  @io.persist
  @type.quat
  rotation = quat.create();

  @io.persist
  @type.vec3
  translation = vec3.create();

  @io.notify
  @io.readwrite
  @type.boolean
  mute = false;

  @io.persist
  @type.string
  name = "";

  @io.readwrite
  @type.boolean
  display = true;

  /**
   * Creates the emitter from the registered AudEmitter class if there is not one
   * already, places it at the object's current world position, and reports
   * whether the emitter accepted initialization.
   */
  Initialize()
  {
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
  @carbon.method
  @impl.adapted
  __init__()
  {
    return this.Initialize();
  }

  /** The emitter this object drives, or null before Initialize has run. */
  @carbon.method
  @impl.implemented
  GetAudioEmitter()
  {
    return this.audioEmitter;
  }

  /**
   * Renames the underlying emitter without touching this object's own name
   * field.
   */
  @carbon.method
  @impl.implemented
  SetEmitterName(name)
  {
    this.audioEmitter?.SetName?.(String(name));
  }

  /**
   * Sends a named event to the emitter and returns the identifier it hands back,
   * or 0 when there is no emitter or no event name.
   */
  @carbon.method
  @impl.implemented
  PlayAudioEvent(eventName)
  {
    if (!this.audioEmitter || !eventName) return 0;
    return this.audioEmitter.SendEvent?.(String(eventName)) ?? 0;
  }

  /** Applies a changed mute flag or name to the emitter after a model update. */
  OnModified(value = null)
  {
    if (value === "mute" || value === this.mute)
    {
      this.audioEmitter?.[this.mute ? "Mute" : "Unmute"]?.();
    }
    if (value === "name" || value === this.name)
    {
      this.SetEmitterName(this.name || "audio_object");
    }
    return true;
  }

  /**
   * Re-evaluates the transform curves for the frame and pushes the resulting
   * position and orientation to the emitter, unless the object is muted.
   */
  UpdateSyncronous(updateContext = null)
  {
    const time = updateContext?.GetTime?.() ?? updateContext?.time ?? 0;
    this.UpdateWorldTransform(time);
    if (this.audioEmitter && !this.mute)
    {
      this.#SetEmitterPosition(this.GetWorldPosition(vec3.create()));
    }
  }

  /**
   * IEveSpaceObject2 asynchronous phase; the object does all of its work
   * synchronously.
   */
  UpdateAsyncronous(_updateContext = null)
  {
  }

  /** IEveSpaceObject2 hook; an audio object has nothing to cull. */
  UpdateVisibility(_updateContext, _parentTransform)
  {
  }

  /** IEveSpaceObject2 hook; an audio object contributes no renderables. */
  GetRenderables(_renderables, _impostors = null)
  {
  }

  /**
   * Reports a unit sphere at the object's world position, so scene traversal has something to place it by.
   * @param {Array} out - caller-owned packed (x, y, z, radius), overwritten
   */
  GetBoundingSphere(out = vec4.create())
  {
    const position = this.GetWorldPosition(vec3.create());
    vec4.set(out, position[0], position[1], position[2], 1);
    return true;
  }

  /**
   * Copies the transform stamped by the last UpdateWorldTransform.
   * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
   * @returns {Array} out
   */
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this.#worldTransform);
  }

  /**
   * Copies the translation of the transform stamped by the last UpdateWorldTransform.
   * @param {Array} [out] - caller-owned vec3; a fresh vector is allocated when omitted
   * @returns {Array} out
   */
  GetWorldPosition(out = vec3.create())
  {
    return mat4.getTranslation(out, this.#worldTransform);
  }

  /**
   * Copies the normalized rotation of the transform stamped by the last UpdateWorldTransform.
   * @param {Array} [out] - caller-owned quat; a fresh quaternion is allocated when omitted
   * @returns {Array} out
   */
  GetWorldRotation(out = quat.create())
  {
    return quat.normalize(out, mat4.getRotation(out, this.#worldTransform));
  }

  /**
   * Reports a fixed unit cube; the object has no geometry, but scene code
   * expects a box.
   */
  GetLocalBoundingBox(outMin, outMax)
  {
    vec3.set(outMin, -1, -1, -1);
    vec3.set(outMax, 1, 1, 1);
    return true;
  }

  /**
   * Rebuilds the world transform from the authored translation and rotation after letting the transform curves overwrite them at the given time.
   * @returns {Array} the object's own matrix, valid only until the next call
   */
  UpdateWorldTransform(time)
  {
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
  #SetEmitterPosition(position)
  {
    const rotation = this.GetWorldRotation(quat.create());
    const front = vec3.transformQuat(vec3.create(), AudioGameObject.FRONT, rotation);
    const top = vec3.transformQuat(vec3.create(), AudioGameObject.TOP, rotation);
    this.audioEmitter?.SetPosition?.(front, top, position);
  }

  static FRONT = Object.freeze([0, 1, 0]);
  static TOP = Object.freeze([0, 0, 1]);
}
