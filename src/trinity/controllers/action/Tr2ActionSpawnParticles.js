// Source: trinity/trinity/Controllers/Actions/Tr2ActionSpawnParticles.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSpawnParticles.cpp
import { CjsModel } from "#model";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { carbon, impl, edit, type } from "#schema";
import { ITr2GenericEmitterUpdateArguments } from "../../particle/ITr2GenericEmitter/index.js";


/**
 * Controller action that emits a one-shot burst of particles from a dynamic
 * emitter when it starts.
 */
@type.define({
  className: "Tr2ActionSpawnParticles",
  family: "controllers"
})
@carbon.inherit(ITr2ControllerAction)
export class Tr2ActionSpawnParticles extends CjsModel
{
  @edit.persist
  @type.objectRef("Tr2DynamicEmitter")
  emitter = null;

  @edit.persist
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
