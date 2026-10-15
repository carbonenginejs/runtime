// Source: trinity/trinity/Eve/AudioGameObject.h
// Source: trinity/trinity/Eve/AudioGameObject.cpp
import { IsMatch } from "#blue";
import { IInitialize } from "../../global/blue/IInitialize.js";
import { mat4 } from "#math/mat4";
import { IEveSpaceObject2 } from "./IEveSpaceObject2.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta, type, blue } from "#schema";


/**
 * A freely placed audio emitter driven by its own translation and rotation
 * curves, so a sound can sit anywhere in a scene without being attached to an
 * asset.
 */
@blue.define("AudioGameObject")
@blue.inherit(IEveSpaceObject2)
@blue.inherit(IInitialize)
@blue.interface(IInitialize)
export class AudioGameObject
{
  _worldTransform = mat4.create();

  @blue.readwrite
  @blue.persist
  @type.rootRef("ITr2AudEmitter")
  audioEmitter = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("ITriVectorFunction")
  translationCurve = null;

  @blue.readwrite
  @blue.persist
  @type.rootRef("ITriQuaternionFunction")
  rotationCurve = null;

  @blue.read
  @blue.persist
  @type.list("Tr2ExternalParameter")
  externalParameters = [];

  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  @blue.readwrite
  @blue.persist
  @type.vec3
  translation = vec3.create();

  @blue.notify
  @blue.readwrite
  @type.boolean
  mute = false;

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.readwrite
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
    const Emitter = CjsSchema.getConstructor("AudEmitter");
    if (!Emitter) return false;
    this.audioEmitter = new Emitter();
    this.UpdateWorldTransform(0);
    const position = this.GetWorldPosition(vec3.create());
    this.audioEmitter.Initialize__WithParameters(this.name || "audio_object", "", position);
    this._SetEmitterPosition(position);
    return true;
  }

  /** Post-hydration hook; runs Initialize. */
  @blue.method
  @meta.adapted
  __init__()
  {
    return this.Initialize();
  }

  /** The emitter this object drives, or null before Initialize has run. */
  @blue.method
  @meta.implemented
  GetAudioEmitter()
  {
    return this.audioEmitter;
  }

  /**
   * Renames the underlying emitter without touching this object's own name
   * field.
   */
  @blue.method
  @meta.implemented
  SetEmitterName(name)
  {
    this.audioEmitter?.SetName(String(name));
  }

  /**
   * Sends a named event to the emitter and returns the identifier it hands back,
   * or 0 when there is no emitter or no event name.
   */
  @blue.method
  @meta.implemented
  PlayAudioEvent(eventName)
  {
    if (!this.audioEmitter || !eventName) return 0;
    return this.audioEmitter.SendEvent(String(eventName)) ?? 0;
  }

  /** Applies a changed mute flag or name to the emitter after a model update. */
  OnModified(value = null)
  {
    if (IsMatch(value, "mute"))
    {
      this.audioEmitter?.[this.mute ? "Mute" : "Unmute"]();
    }
    if (IsMatch(value, "name"))
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
    this.UpdateWorldTransform(updateContext.GetTime());
    if (this.audioEmitter && !this.mute)
    {
      this._SetEmitterPosition(this.GetWorldPosition(AudioGameObject.scratch.vec3_0));
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
  @meta.noop
  GetRenderables__Impostors(_renderables, _impostors)
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
    return mat4.copy(out, this._worldTransform);
  }

  /**
   * Copies the translation of the transform stamped by the last UpdateWorldTransform.
   * @param {Array} out - caller-owned vec3
   * @returns {Array} out
   */
  GetWorldPosition(out)
  {
    return mat4.getTranslation(out, this._worldTransform);
  }

  /**
   * Copies the normalized rotation of the transform stamped by the last UpdateWorldTransform.
   * @param {Array} [out] - caller-owned quat; a fresh quaternion is allocated when omitted
   * @returns {Array} out
   */
  GetWorldRotation(out = quat.create())
  {
    return quat.normalize(out, mat4.getRotation(out, this._worldTransform));
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
    const { vec3_0, quat_0 } = AudioGameObject.scratch;
    // Carbon samples each ball curve through its Be::Time overload, or keeps the authored value (cpp:150-170).
    if (this.translationCurve) this.translationCurve.Update__Ticks(time, vec3_0);
    else vec3.copy(vec3_0, this.translation);
    if (this.rotationCurve) this.rotationCurve.Update__Ticks(time, quat_0);
    else quat.copy(quat_0, this.rotation);
    mat4.fromRotationTranslation(this._worldTransform, quat_0, vec3_0);
    return this._worldTransform;
  }

  /**
   * IEveSpaceObject2 hook (AudioGameObject.cpp:91-93): an audio game object is
   * not rendered, so it contributes nothing to a child's per-object records and
   * Carbon's body is empty. Present so a child parented to one can call it.
   */
  @blue.method
  @meta.noop
  GetPerObjectStructs(_vsData, _psData)
  {
  }

  /**
   * Pushes a position to the emitter together with the object's front and top
   * axes rotated into world space, which is what gives the sound its
   * orientation.
   */
  _SetEmitterPosition(position)
  {
    const { quat_0, vec3_1, vec3_2 } = AudioGameObject.scratch;
    this.GetWorldRotation(quat_0);
    vec3.transformQuat(vec3_1, AudioGameObject.FRONT, quat_0);
    vec3.transformQuat(vec3_2, AudioGameObject.TOP, quat_0);
    this.audioEmitter.SetPosition(vec3_1, vec3_2, position);
  }

  static FRONT = Object.freeze([0, 1, 0]);
  static TOP = Object.freeze([0, 0, 1]);

  static scratch = {
    vec3_0: vec3.create(),
    vec3_1: vec3.create(),
    vec3_2: vec3.create(),
    quat_0: quat.create()
  };
}
