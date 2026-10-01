// Source: trinity/trinity/Controllers/Actions/Tr2ActionSpawnParticles.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSpawnParticles.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSpawnParticles_Blue.cpp
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { meta, types } from "#schema";
import { ITr2GenericEmitterUpdateArguments } from "../../particle/ITr2GenericEmitter/index.js";


/**
 * Controller action that emits a one-shot burst of particles from a dynamic
 * emitter when it starts.
 */
@meta.define({
  className: "Tr2ActionSpawnParticles",
  family: "controllers"
})
export class Tr2ActionSpawnParticles extends ITr2ControllerAction
{
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("Tr2DynamicEmitter")
  emitter = null;

  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  rate = 1;

  /**
   * Spawns particles on the configured emitter.
   * Adapted: a fresh JavaScript update-arguments object represents the native
   * temporary value; the emitter owns all particle allocation and algorithms.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Start(_controller)
  {
    if (!this.emitter)
    {
      return;
    }
    this.emitter.SpawnParticles(Tr2ActionSpawnParticles._createEmitterUpdateArguments(), null, null, this.rate);
  }

  /**
   * Builds the emitter update arguments used for a manual spawn, with an emit
   * count factor of 1 so the authored rate is applied unscaled.
   * Custom: names the JavaScript construction of the native temporary.
   */
  @meta.impl.custom
  static _createEmitterUpdateArguments()
  {
    const args = new ITr2GenericEmitterUpdateArguments();
    args.emitCountFactor = 1;
    return args;
  }
}

// Native exposure ends at this concrete table (Tr2ActionSpawnParticles_Blue.cpp:12-13,17).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionSpawnParticles, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionSpawnParticles);
