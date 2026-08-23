// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildAudio.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildAudio.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { carbon, CjsSchema, impl, io, type } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";


/**
 * Space-object child that owns a positional audio emitter and keeps its position
 * and orientation tracking the child's world transform.
 */
@type.define({ className: "EveChildAudio", family: "eve/child" })
export class EveChildAudio extends EveChildTransform
{
  @io.notify
  @io.persist
  @type.string
  name = "EveChildAudio";

  @io.notify
  @io.readwrite
  @type.boolean
  mute = false;

  @io.persist
  @type.model("ITr2AudEmitter")
  audioEmitter = null;

  /**
   * Creates the emitter from the schema registry when none was authored and
   * initializes it at the current world position; returns false when no
   * AudEmitter class is registered, and true when an emitter already exists.
   */
  Initialize()
  {
    if (this.audioEmitter) return true;
    const Emitter = CjsSchema.GetConstructor("AudEmitter");
    if (!Emitter) return false;
    this.audioEmitter = new Emitter();
    const position = mat4.getTranslation(vec3.create(), this.worldTransform);
    return this.audioEmitter.Initialize?.(this.name || "audio_object", "", position) !== false;
  }

  /** Construction hook; forwards to Initialize. */
  @carbon.method
  @impl.adapted
  __init__()
  {
    return this.Initialize();
  }

  /** Renames the underlying emitter without touching this child's own name field. */
  @carbon.method
  @impl.implemented
  SetEmitterName(name)
  {
    this.audioEmitter?.SetName?.(String(name));
  }

  /** Returns the authored child name, which is also the emitter's default name. */
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the authored child name; the emitter only picks it up through
   * OnModified or an explicit SetEmitterName.
   */
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Applies a mute change by muting or unmuting the emitter and a name change by
   * renaming it (falling back to "audio_object" when the name is empty); the
   * value argument follows the repo's OnModified duck of field name or field
   * value.
   */
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
   * Rebuilds the world transform from the parent - preferring the parent's own
   * live localToWorld over the params copy - and, while unmuted, pushes the
   * emitter its position plus front and top orientation vectors derived from
   * that transform's rotation.
   */
  UpdateSyncronous(_updateContext, params = {})
  {
    const parent = params.childParent ?? params.spaceObjectParent ?? null;
    const parentTransform = parent?.GetLocalToWorldTransform?.(mat4.create()) ?? params.localToWorldTransform ?? mat4.create();
    this.UpdateTransform(parentTransform);
    if (this.audioEmitter && !this.mute)
    {
      const position = mat4.getTranslation(vec3.create(), this.worldTransform);
      const rotation = mat4.getRotation(quat.create(), this.worldTransform);
      const front = vec3.transformQuat(vec3.create(), EveChildAudio.FRONT, rotation);
      const top = vec3.transformQuat(vec3.create(), EveChildAudio.TOP, rotation);
      this.audioEmitter.SetPosition?.(front, top, position);
    }
  }

  /**
   * No-op: the emitter is driven entirely from the sync pass, where the parent
   * transform is already final.
   */
  UpdateAsyncronous(_updateContext, _params)
  {
  }

  /** No-op: an audio child is never rendered and keeps no visibility state. */
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** No-op: an audio child contributes no renderables. */
  GetRenderables(_renderables)
  {
  }

  /**
   * Always returns false and leaves out untouched: an emitter has no spatial
   * extent to contribute to the owner's bounds.
   */
  GetBoundingSphere(_out, _query = 0)
  {
    return false;
  }

  /**
   * Copies the child's world transform, as rebuilt by the last sync update.
   * @param {Float32Array} [out] - caller-owned; allocated when omitted
   * @returns {Float32Array} out
   */
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this.worldTransform);
  }

  /**
   * No-op override: the audio child never composes a local transform from
   * authored SRT values, so its world transform is the parent's.
   */
  Setup(_scale, _rotation, _translation, _lowestLodVisible)
  {
  }

  /** No-op: an audio child has no LOD levels. */
  ChangeLOD(_lod)
  {
  }

  static FRONT = Object.freeze([0, 1, 0]);
  static TOP = Object.freeze([0, 0, 1]);
}
