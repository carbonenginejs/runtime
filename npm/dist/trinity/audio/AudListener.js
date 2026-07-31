import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { impl, carbon, type } from '@carbonenginejs/runtime-utils/schema';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { AudGameObjResource as _AudGameObjResource } from './AudGameObjResource.js';
import { LISTENER_GAME_OBJ_ID } from './SoundPrioritization.js';

let _initProto, _initClass;
const FLOAT_MAX = 3.4028234663852886e38;

/** AudListener (audio) - the singleton ears; fixed id 4, never culled by prioritization. */
let _AudListener;
class AudListener extends _AudGameObjResource {
  static {
    ({
      e: [_initProto],
      c: [_AudListener, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudListener",
      family: "audio"
    })], [[[void 0, carbon.renamed("SetPosition"), impl, impl.implemented], 18, "SetPosition"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Backend push (RH2LH::convertListener + default-listener registration) is realization; the headless graph stores the position.")], 18, "SetPlacementFromParent"], [[impl, impl.custom, void 0, impl.reason("Browser audio is created on a user gesture, after a headless listener may already have received its placement.")], 18, "RealizePlacement"]], 0, void 0, _AudGameObjResource));
  }
  #effectiveFront = (_initProto(this), vec3.fromValues(0, 0, 1));
  #effectiveTop = vec3.fromValues(0, 1, 0);
  #normalizedTop = vec3.fromValues(0, 1, 0);
  #cross = vec3.fromValues(-1, 0, 0);
  #realizedBackend = null;

  /** Creates Carbon's fixed-id listener with non-cullable priority weight. */
  constructor() {
    // Carbon: AudGameObjResource(LISTENER_GAME_OBJ_ID) - fixed id must be set
    // before manager registration; name "Listener", FLT_MAX additional weight
    // so the listener always sorts first.
    super(LISTENER_GAME_OBJ_ID);
    this.name = "Listener";
    this.additionalCullingWeight = FLOAT_MAX;
  }

  /** Carbon method SetPosition -> SetPlacementFromParent (Blue mapping). */
  SetPosition(front, top, position) {
    return this.SetPlacementFromParent(front, top, position);
  }

  /** Carbon override: listener stores position with a looser gate and uses the listener RH->LH flip. */
  SetPlacementFromParent(front, top, positionValue) {
    _AudGameObjResource.Orthonormalize(this.#effectiveFront, this.#effectiveTop, front, top, this.#normalizedTop, this.#cross);
    vec3.copy(this.position, positionValue);
    const backend = _AudGameObjResource.backend;
    if (typeof backend?.SetListenerPosition === "function") {
      backend.SetListenerPosition(this.ID, this.#effectiveFront, this.#effectiveTop, this.position);
      this.#realizedBackend = backend;
    }
    return 1;
  }

  /** Pushes a stored listener pose once when a browser backend becomes available. */
  RealizePlacement() {
    const backend = _AudGameObjResource.backend;
    if (typeof backend?.SetListenerPosition !== "function" || backend === this.#realizedBackend) {
      return false;
    }
    backend.SetListenerPosition(this.ID, this.#effectiveFront, this.#effectiveTop, this.position);
    this.#realizedBackend = backend;
    return true;
  }
  static {
    _initClass();
  }
}

export { _AudListener as AudListener };
//# sourceMappingURL=AudListener.js.map
