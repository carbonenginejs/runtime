// Source: trinity/trinity/Controllers/Actions/Tr2ActionSpawnParticles.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSpawnParticles.cpp
import { CjsModel } from "#model";
import { withITr2ControllerAction } from "./ITr2ControllerAction.js";
import { carbon, impl, io, type } from "#schema";
import { ITr2GenericEmitterUpdateArguments } from "../../particle/ITr2GenericEmitter.js";


/**
 * Controller action that emits a one-shot burst of particles from a dynamic
 * emitter when it starts.
 */
@type.define({
  className: "Tr2ActionSpawnParticles",
  family: "controllers"
})
export class Tr2ActionSpawnParticles extends withITr2ControllerAction(CjsModel)
{
  @io.persist
  @type.objectRef("Tr2DynamicEmitter")
  emitter = null;

  @io.persist
  @type.float32
  rate = 1;

  /**
   * Spawns particles on the configured emitter.
   */
  @carbon.method
  @impl.adapted
  Start(_controller)
  {
    if (!this.emitter)
    {
      return;
    }
    this.emitter.SpawnParticles(Tr2ActionSpawnParticles.#createEmitterUpdateArguments(), null, null, this.rate);
  }

  /**
   * Builds the emitter update arguments used for a manual spawn, with an emit
   * count factor of 1 so the authored rate is applied unscaled.
   */
  static #createEmitterUpdateArguments()
  {
    const args = new ITr2GenericEmitterUpdateArguments();
    args.emitCountFactor = 1;
    return args;
  }
}
