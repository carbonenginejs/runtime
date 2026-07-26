import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_position, _init_extra_position, _init_front, _init_extra_front, _init_observer, _init_extra_observer, _init_mute, _init_extra_mute;

/**
 * Holds an audio or placement observer at a fixed local position and facing
 * inside an object, and republishes it in world space as the object moves.
 */
let _TriObserverLocal;
new class extends _identity {
  static [class TriObserverLocal extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_position, _init_extra_position, _init_front, _init_extra_front, _init_observer, _init_extra_observer, _init_mute, _init_extra_mute, _initProto],
        c: [_TriObserverLocal, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriObserverLocal",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.vec3], 16, "front"], [[io, io.persist, void 0, type.objectRef("IBluePlacementObserver")], 16, "observer"], [[type, type.boolean], 16, "mute"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetObserver"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetObserver"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetFront"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMute"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMute"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_mute(this);
    }
    name = (_initProto(this), _init_name(this, ""));
    position = (_init_extra_name(this), _init_position(this, vec3.create()));
    front = (_init_extra_position(this), _init_front(this, vec3.fromValues(0, 0, 1)));
    observer = (_init_extra_front(this), _init_observer(this, null));
    mute = (_init_extra_observer(this), _init_mute(this, false));

    /**
     * Transforms the local position and front vector by the given world transform
     * and pushes the resulting placement to the observer; a degenerate front falls
     * back to +Z with +Y up. Returns false when no observer supporting
     * UpdatePlacement is bound.
     */
    Update(worldTransform) {
      if (!this.observer?.UpdatePlacement) {
        return false;
      }
      const position = vec3.transformMat4(vec3.create(), this.position, worldTransform);
      const front = _TriObserverLocal.#TransformNormal(vec3.create(), this.front, worldTransform);
      const up = vec3.create();
      if (vec3.squaredLength(front) < 1e-10) {
        vec3.set(front, 0, 0, 1);
        vec3.set(up, 0, 1, 0);
      } else {
        _TriObserverLocal.#TransformNormal(up, _TriObserverLocal.#up, worldTransform);
      }
      this.observer.UpdatePlacement(front, up, position);
      return true;
    }

    /** The bound placement observer, or null. */
    GetObserver() {
      return this.observer;
    }

    /**
     * Binds the placement observer that Update drives; the mute state is not
     * reapplied to the new observer.
     */
    SetObserver(observer) {
      this.observer = observer ?? null;
    }

    /**
     * Copies the observer's object-local position; the caller's vector is not
     * retained.
     */
    SetPosition(position) {
      vec3.copy(this.position, position);
    }

    /**
     * Copies the observer's object-local facing direction; the caller's vector is
     * not retained.
     */
    SetFront(front) {
      vec3.copy(this.front, front);
    }

    /** Whether the observer is currently muted. */
    GetMute() {
      return this.mute;
    }

    /**
     * Mutes or unmutes the bound observer, doing nothing and returning false when
     * the state is already what was asked for.
     */
    SetMute(mute) {
      const next = !!mute;
      if (next === this.mute) {
        return false;
      }
      this.mute = next;
      if (next) {
        this.observer?.Mute?.();
      } else {
        this.observer?.Unmute?.();
      }
      return true;
    }

    /** Nothing to recompute; the placement is rebuilt on the next Update. */
    OnModified() {
      return true;
    }

    /**
     * Transforms a direction by the transform's upper 3x3, ignoring translation,
     * and writes it into out.
     */
  }];
  #TransformNormal(out, value, transform) {
    const x = value[0];
    const y = value[1];
    const z = value[2];
    out[0] = transform[0] * x + transform[4] * y + transform[8] * z;
    out[1] = transform[1] * x + transform[5] * y + transform[9] * z;
    out[2] = transform[2] * x + transform[6] * y + transform[10] * z;
    return out;
  }
  #up = Object.freeze([0, 1, 0]);
  constructor() {
    super(_TriObserverLocal), _initClass();
  }
}();
function SendEventToAudEmitter(observer, audioEvent) {
  const emitter = observer?.GetObserver?.();
  if (typeof emitter?.SendEvent === "function") {
    emitter.SendEvent(audioEvent);
  }
}

export { SendEventToAudEmitter, _TriObserverLocal as TriObserverLocal };
//# sourceMappingURL=TriObserverLocal.js.map
