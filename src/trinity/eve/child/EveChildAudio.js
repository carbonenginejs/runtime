import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildAudio.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildAudio.cpp
import { IsMatch } from "#blue";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { CjsSchema, meta, type, blue } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { ITr2DebugRenderable } from "#interfaces";


/**
 * Space-object child that owns a positional audio emitter and keeps its position
 * and orientation tracking the child's world transform.
 */
@be.define("EveChildAudio")
@blue.inherit(IInitialize, INotify, ITr2DebugRenderable)
@be.mapInterface(IEveSpaceObjectChild)
@be.mapInterface(EveSpaceObjectChild)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
export class EveChildAudio extends EveChildTransform
{
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  name = "EveChildAudio";

  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.boolean
  mute = false;

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.rootRef("ITr2AudEmitter")
  audioEmitter = null;

  /**
   * Creates the emitter from the schema registry when none was authored and
   * initializes it at the current world position; returns false when no
   * AudEmitter class is registered, and true when an emitter already exists.
   */

  Initialize()
  {
    if (this.audioEmitter) return true;
    const Emitter = CjsSchema.getConstructor("AudEmitter");
    if (!Emitter) return false;
    this.audioEmitter = new Emitter();
    const position = mat4.getTranslation(vec3.create(), this.worldTransform);
    this.audioEmitter.Initialize__WithParameters(this.name || "audio_object", "", position);
    return true;
  }

  /** Construction hook; forwards to Initialize. */
  @be.mapMethodAndWrap()
  @meta.adapted
  __init__()
  {
    return this.Initialize();
  }

  /** Renames the underlying emitter without touching this child's own name field. */
  @be.mapMethodAndWrap()
  @meta.implemented
  SetEmitterName(name)
  {
    this.audioEmitter?.SetName(String(name));
  }

  /** Returns the authored child name, which is also the emitter's default name. */
  @blue.method
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the authored child name; the emitter only picks it up through
   * OnModified or an explicit SetEmitterName.
   */
  @blue.method
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
   * Rebuilds the world transform from the parent's output buffer, or identity
   * when both parent references are absent (EveChildAudio.cpp:81-107). The child
   * parent takes precedence. While unmuted, updates the emitter's position and
   * orientation from that transform; the parent's return value is unused.
   */

  UpdateSyncronous(_updateContext, params = {})
  {
    const parent = params.childParent ?? params.spaceObjectParent ?? null;
    const parentTransform = mat4.create();
    if (parent) parent.GetLocalToWorldTransform(parentTransform);
    this.UpdateTransform(parentTransform);
    if (this.audioEmitter && !this.mute)
    {
      const position = mat4.getTranslation(vec3.create(), this.worldTransform);
      const rotation = mat4.getRotation(quat.create(), this.worldTransform);
      const front = vec3.transformQuat(vec3.create(), EveChildAudio.FRONT, rotation);
      const top = vec3.transformQuat(vec3.create(), EveChildAudio.TOP, rotation);
      this.audioEmitter.SetPosition(front, top, position);
    }
  }

  /**
   * No-op: the emitter is driven entirely from the sync pass, where the parent
   * transform is already final.
   */
  @blue.method
  UpdateAsyncronous(_updateContext, _params)
  {
  }

  /** No-op: an audio child is never rendered and keeps no visibility state. */
  @blue.method
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** No-op: an audio child contributes no renderables. */
  @blue.method
  GetRenderables(_renderables)
  {
  }

  /**
   * Always returns false and leaves out untouched: an emitter has no spatial
   * extent to contribute to the owner's bounds.
   */
  @blue.method
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
  @blue.method
  Setup(_scale, _rotation, _translation, _lowestLodVisible)
  {
  }

  /** No-op: an audio child has no LOD levels. */
  @blue.method
  ChangeLOD(_lod)
  {
  }

  /**
   * Carbon EveChildAudio::GetDebugOptions (cpp:118-124): forwards to the
   * audio emitter when it is debug-renderable.
   * @param {Set<string>} options The caller-owned option set.
   */

  @meta.implemented
  GetDebugOptions(options)
  {
    const tmp = CjsSchema.cast(this.audioEmitter, ITr2DebugRenderable);
    if (tmp)
    {
      tmp.GetDebugOptions(options);
    }
  }

  /**
   * Carbon EveChildAudio::RenderDebugInfo (cpp:126-133): forwards to the
   * audio emitter when it is debug-renderable.
   * @param {ITr2DebugRenderer2} renderer
   */

  @meta.implemented
  RenderDebugInfo(renderer)
  {
    const tmp = CjsSchema.cast(this.audioEmitter, ITr2DebugRenderable);
    if (tmp)
    {
      tmp.RenderDebugInfo(renderer);
    }
  }

  static FRONT = Object.freeze([0, 1, 0]);
  static TOP = Object.freeze([0, 0, 1]);
}

// EveChildAudio_Blue.cpp: native exposure.
