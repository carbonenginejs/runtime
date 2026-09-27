// Source: audio/src/AudListener.h + AudListener.cpp
import { carbon, impl, type } from "#schema";
import { vec3 } from "#math/vec3";
import { AudGameObjResource } from "./AudGameObjResource.js";
import { LISTENER_GAME_OBJ_ID } from "./SoundPrioritization.js";

const FLOAT_MAX = 3.4028234663852886e38;

/** Represents the singleton Carbon listener and its effective orientation and position. Its id is fixed at 4 and prioritization never culls it. */
@type.define({ className: "AudListener", family: "audio" })
export class AudListener extends AudGameObjResource
{

  #effectiveFront = vec3.fromValues(0, 0, 1);

  #effectiveTop = vec3.fromValues(0, 1, 0);

  #normalizedTop = vec3.fromValues(0, 1, 0);

  #cross = vec3.fromValues(-1, 0, 0);

  #realizedBackend = null;

  /** Creates Carbon's fixed-id listener with non-cullable priority weight. */
  constructor()
  {
    // Carbon: AudGameObjResource(LISTENER_GAME_OBJ_ID) - fixed id must be set
    // before manager registration; name "Listener", FLT_MAX additional weight
    // so the listener always sorts first.
    super(LISTENER_GAME_OBJ_ID);
    this.name = "Listener";
    this.additionalCullingWeight = FLOAT_MAX;
  }

  /**
   * Forwards Carbon's Blue-exposed SetPosition call to SetPlacementFromParent.
   * Source: audio/src/AudListener_Blue.cpp:17-20.
   *
   * @param {ArrayLike<number>} front Forward direction.
   * @param {ArrayLike<number>} top Up direction.
   * @param {ArrayLike<number>} position Listener position.
   * @returns {number} The placement result.
   */
  @carbon.renamed("SetPosition")
  @impl.implemented
  SetPosition(front, top, position)
  {
    return this.SetPlacementFromParent(front, top, position);
  }

  /**
   * Orthonormalizes and stores the listener pose, then forwards it when the backend supports listener placement.
   *
   * Adapted: Carbon stores position only with an initialized manager and submits
   * only after listener registration (audio/src/AudListener.cpp:52-73). JavaScript
   * retains placement without those gates so a headless listener can be realized
   * later. It passes right-handed vectors to the backend instead of performing
   * Wwise's RH2LH::convertListener conversion.
   *
   * @param {ArrayLike<number>} front Forward direction.
   * @param {ArrayLike<number>} top Up direction.
   * @param {ArrayLike<number>} positionValue Listener position.
   * @returns {number} AK_Success (1).
   */
  @carbon.method
  @impl.adapted
  SetPlacementFromParent(front, top, positionValue)
  {
    AudGameObjResource.Orthonormalize(
      this.#effectiveFront,
      this.#effectiveTop,
      front,
      top,
      this.#normalizedTop,
      this.#cross);
    vec3.copy(this.position, positionValue);
    const backend = AudGameObjResource.backend;
    if (typeof backend?.SetListenerPosition === "function")
    {
      backend.SetListenerPosition(
        this.ID,
        this.#effectiveFront,
        this.#effectiveTop,
        this.position);
      this.#realizedBackend = backend;
    }
    return 1;
  }

  /**
   * Submits the retained pose once to each available backend instance.
   *
   * Custom: Browser audio may be created after a headless listener receives
   * placement. This method replays the stored pose when SetListenerPosition
   * becomes available and records which backend received it. Missing placement
   * support leaves the pose eligible for a later retry.
   *
   * @returns {boolean} True when submitted; false when unsupported or already submitted to this backend.
   */
  @impl.custom
  RealizePlacement()
  {
    const backend = AudGameObjResource.backend;
    if (typeof backend?.SetListenerPosition !== "function"
      || backend === this.#realizedBackend)
    {
      return false;
    }
    backend.SetListenerPosition(
      this.ID,
      this.#effectiveFront,
      this.#effectiveTop,
      this.position);
    this.#realizedBackend = backend;
    return true;
  }

}
