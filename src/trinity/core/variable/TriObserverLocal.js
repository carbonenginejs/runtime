// Source: trinity/trinity/TriObserverLocal.h
// Source: trinity/trinity/TriObserverLocal.cpp
// Source: trinity/trinity/TriObserverLocal_Blue.cpp
import { vec3 } from "#math/vec3";
import { ITriObserverLocal } from "../../../global/blue/ITriObserverLocal.js";
import { CjsSchema, carbon, meta, impl, edit, type } from "#schema";


/**
 * Holds an audio or placement observer at a fixed local position and facing
 * inside an object, and republishes it in world space as the object moves.
 * Native interface queries expose only ITriObserverLocal, not self or INotify.
 * Native GetDebugOptions/RenderDebugInfo forwarding remains unported; this
 * migration does not provide debug-rendering parity.
 */
@type.define({ className: "TriObserverLocal", family: "trinityCore" })
export class TriObserverLocal extends ITriObserverLocal
{
  /**
   * Label identifying this local observer binding (native std::string m_name).
   * @type {string}
   */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /**
   * Observer position in object-local coordinates (native Vector3 m_position).
   * @type {Float32Array}
   */
  @edit.readwrite
  @edit.persist
  @type.vec3
  position = vec3.create();

  /**
   * Object-local facing direction, initially +Z (native Vector3 m_front).
   * @type {Float32Array}
   */
  @edit.readwrite
  @edit.persist
  @type.vec3
  front = vec3.fromValues(0, 0, 1);

  /**
   * Backing state for the live mute property and native GetMute/SetMute pair (bool m_mute).
   * @type {boolean}
   */
  _mute = false;

  /** Gets native mute state. @returns {boolean} Current mute state. */
  @meta.property()
  @edit.readwrite
  @type.boolean
  @impl.implemented
  get mute()
  {
    return this.GetMute();
  }

  /** Applies mute through the native setter. @param {boolean} value Mute state. */
  @impl.implemented
  set mute(value)
  {
    this.SetMute(value);
  }

  /**
   * Placement observer receiving the transformed position and orientation (native IBluePlacementObserverPtr).
   * @type {IBluePlacementObserver|null}
   */
  @edit.readwrite
  @edit.persist
  @type.objectRef("IBluePlacementObserver")
  observer = null;


  /**
   * Transforms the local position and front vector by the given world transform
   * and pushes the resulting placement to the observer; a degenerate front falls
   * back to +Z with +Y up. A present observer requires UpdatePlacement.
   * JavaScript returns a boolean and leases invocation-local pooled vectors,
   * released even on nested calls or failure; the native method returns void.
   * @param {Float32Array} worldTransform World matrix.
   * @returns {boolean} Whether an observer was updated.
   */
  @carbon.method
  @impl.adapted
  Update(worldTransform)
  {
    if (!this.observer) return false;
    const position = vec3.alloc();
    let front = null;
    let up = null;
    try
    {
      front = vec3.alloc();
      up = vec3.alloc();
      vec3.transformMat4(position, this.position, worldTransform);
      TriObserverLocal._TransformNormal(front, this.front, worldTransform);
      if (vec3.squaredLength(front) < 1e-10)
      {
        vec3.set(front, 0, 0, 1);
        vec3.set(up, 0, 1, 0);
      }
      else
      {
        TriObserverLocal._TransformNormal(up, TriObserverLocal._up, worldTransform);
      }
      this.observer.UpdatePlacement(front, up, position);
      return true;
    }
    finally
    {
      if (up) vec3.unalloc(up);
      if (front) vec3.unalloc(front);
      vec3.unalloc(position);
    }
  }

  /** Gets the bound placement observer. @returns {object|null} Observer. */
  @carbon.method
  @impl.implemented
  GetObserver()
  {
    return this.observer;
  }

  /**
   * Binds the placement observer that Update drives; the mute state is not
   * reapplied to the new observer. JavaScript nullish input clears the binding.
   * @param {object|null} observer Placement observer.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  SetObserver(observer)
  {
    this.observer = observer ?? null;
  }

  /**
   * Copies the observer's object-local position; the caller's vector is not
   * retained.
   * @param {Float32Array|number[]} position Local position.
   * @returns {void}
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
   * @param {Float32Array|number[]} front Local facing vector.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  SetFront(front)
  {
    vec3.copy(this.front, front);
  }

  /** Gets mute state. @returns {boolean} Whether the observer is muted. */
  @carbon.method
  @impl.implemented
  GetMute()
  {
    return this._mute;
  }

  /**
   * Mutes or unmutes the bound observer, doing nothing and returning false when
   * the state is already what was asked for. JavaScript coerces to bool and
   * returns a change flag; a registered nominal audio contract replaces native
   * dynamic_cast without loading the optional audio module.
   * @param {boolean} mute Desired state.
   * @returns {boolean} Whether the stored state changed.
   */
  @carbon.method
  @impl.adapted
  SetMute(mute)
  {
    const next = !!mute;
    if (next === this._mute)
    {
      return false;
    }

    this._mute = next;
    const contract = CjsSchema.GetConstructor("ITr2AudEmitter");
    const emitter = contract ? CjsSchema.cast(this.observer, contract) : null;
    if (emitter)
    {
      if (next) emitter.Mute();
      else emitter.Unmute();
    }
    return true;
  }

  /** Native no-op callback. @returns {boolean} True. */
  @carbon.method
  @impl.noop
  OnModified()
  {
    return true;
  }

  /**
   * Transforms a direction by the transform's upper 3x3, ignoring translation,
   * and writes it into out.
   * @param {Float32Array} out Destination.
   * @param {Float32Array|number[]} value Direction.
   * @param {Float32Array} transform Matrix.
   * @returns {Float32Array} The destination.
   */
  @impl.custom
  static _TransformNormal(out, value, transform)
  {
    const x = value[0];
    const y = value[1];
    const z = value[2];
    out[0] = transform[0] * x + transform[4] * y + transform[8] * z;
    out[1] = transform[1] * x + transform[5] * y + transform[9] * z;
    out[2] = transform[2] * x + transform[6] * y + transform[10] * z;
    return out;
  }

  /**
   * Shared local +Y axis transformed by Update; adapts Carbon's temporary up vector.
   * @type {number[]}
   */
  static _up = [0, 1, 0];
}

/**
 * Sends an audio event to an observer's emitter when the observed object
 * satisfies the registered nominal audio contract. This adapts native
 * dynamic_cast without importing the optional audio layer.
 * @param {ITriObserverLocal|null} observer Local observer.
 * @param {string} audioEvent Event name.
 * @returns {void}
 */
export function SendEventToAudEmitter(observer, audioEvent)
{
  if (!observer) return;
  const contract = CjsSchema.GetConstructor("ITr2AudEmitter");
  const emitter = contract ? CjsSchema.cast(observer.GetObserver(), contract) : null;
  if (emitter) emitter.SendEvent(audioEvent);
}

carbon.interfaceTable({ interfaces: [ITriObserverLocal], chainTo: null })(TriObserverLocal);
