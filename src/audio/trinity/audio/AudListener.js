// Source: audio/src/AudListener.h + AudListener.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudListener.json.
import { carbon, impl, type } from "#schema";
import { vec3 } from "#math/vec3";
import { AudGameObjResource } from "./AudGameObjResource.js";
import { LISTENER_GAME_OBJ_ID } from "./SoundPrioritization.js";

const FLOAT_MAX = 3.4028234663852886e38;

/** AudListener (audio) - the singleton ears; fixed id 4, never culled by prioritization. */
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

  /** Carbon method SetPosition -> SetPlacementFromParent (Blue mapping). */
  @carbon.renamed("SetPosition")
  @impl.implemented
  SetPosition(front, top, position)
  {
    return this.SetPlacementFromParent(front, top, position);
  }

  /** Carbon override: listener stores position with a looser gate and uses the listener RH->LH flip. */
  @carbon.method
  @impl.adapted
  @impl.reason("Backend push (RH2LH::convertListener + default-listener registration) is realization; the headless graph stores the position.")
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

  /** Pushes a stored listener pose once when a browser backend becomes available. */
  @impl.custom
  @impl.reason("Browser audio is created on a user gesture, after a headless listener may already have received its placement.")
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
