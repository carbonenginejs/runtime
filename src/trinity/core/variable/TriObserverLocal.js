// Source: trinity/trinity/TriObserverLocal.h
// Source: trinity/trinity/TriObserverLocal.cpp
// Source: trinity/trinity/TriObserverLocal_Blue.cpp
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Holds an audio or placement observer at a fixed local position and facing
 * inside an object, and republishes it in world space as the object moves.
 */
@type.define({ className: "TriObserverLocal", family: "trinityCore" })
export class TriObserverLocal extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.vec3
  front = vec3.fromValues(0, 0, 1);

  @io.persist
  @type.objectRef("IBluePlacementObserver")
  observer = null;

  @type.boolean
  mute = false;

  /**
   * Transforms the local position and front vector by the given world transform
   * and pushes the resulting placement to the observer; a degenerate front falls
   * back to +Z with +Y up. Returns false when no observer supporting
   * UpdatePlacement is bound.
   */
  @carbon.method
  @impl.implemented
  Update(worldTransform)
  {
    if (!this.observer?.UpdatePlacement)
    {
      return false;
    }

    const position = vec3.transformMat4(vec3.create(), this.position, worldTransform);
    const front = TriObserverLocal.#TransformNormal(vec3.create(), this.front, worldTransform);
    const up = vec3.create();

    if (vec3.squaredLength(front) < 1e-10)
    {
      vec3.set(front, 0, 0, 1);
      vec3.set(up, 0, 1, 0);
    }
    else
    {
      TriObserverLocal.#TransformNormal(up, TriObserverLocal.#up, worldTransform);
    }

    this.observer.UpdatePlacement(front, up, position);
    return true;
  }

  /** The bound placement observer, or null. */
  @carbon.method
  @impl.implemented
  GetObserver()
  {
    return this.observer;
  }

  /**
   * Binds the placement observer that Update drives; the mute state is not
   * reapplied to the new observer.
   */
  @carbon.method
  @impl.implemented
  SetObserver(observer)
  {
    this.observer = observer ?? null;
  }

  /**
   * Copies the observer's object-local position; the caller's vector is not
   * retained.
   */
  @carbon.method
  @impl.implemented
  SetPosition(position)
  {
    vec3.copy(this.position, position);
  }

  /**
   * Copies the observer's object-local facing direction; the caller's vector is
   * not retained.
   */
  @carbon.method
  @impl.implemented
  SetFront(front)
  {
    vec3.copy(this.front, front);
  }

  /** Whether the observer is currently muted. */
  @carbon.method
  @impl.implemented
  GetMute()
  {
    return this.mute;
  }

  /**
   * Mutes or unmutes the bound observer, doing nothing and returning false when
   * the state is already what was asked for.
   */
  @carbon.method
  @impl.adapted
  SetMute(mute)
  {
    const next = !!mute;
    if (next === this.mute)
    {
      return false;
    }

    this.mute = next;
    if (next)
    {
      this.observer?.Mute?.();
    }
    else
    {
      this.observer?.Unmute?.();
    }
    return true;
  }

  /** Nothing to recompute; the placement is rebuilt on the next Update. */
  @carbon.method
  @impl.implemented
  OnModified()
  {
    return true;
  }

  /**
   * Transforms a direction by the transform's upper 3x3, ignoring translation,
   * and writes it into out.
   */
  static #TransformNormal(out, value, transform)
  {
    const x = value[0];
    const y = value[1];
    const z = value[2];
    out[0] = transform[0] * x + transform[4] * y + transform[8] * z;
    out[1] = transform[1] * x + transform[5] * y + transform[9] * z;
    out[2] = transform[2] * x + transform[6] * y + transform[10] * z;
    return out;
  }

  static #up = Object.freeze([0, 1, 0]);
}

/**
 * Sends an audio event to an observer's emitter when the observed object
 * quacks like an audio emitter (Carbon dynamic_casts to ITr2AudEmitter).
 */
export function SendEventToAudEmitter(observer, audioEvent)
{
  const emitter = observer?.GetObserver?.();
  if (typeof emitter?.SendEvent === "function")
  {
    emitter.SendEvent(audioEvent);
  }
}
