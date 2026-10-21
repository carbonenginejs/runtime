import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/ITr2SoundEmitterOwner.h:9-14
import { CjsSchema, meta, blue } from "#schema";


/** Contract for a scene object that finds named sound emitters. */
export class ITr2SoundEmitterOwner extends IRoot
{
  /**
   * Finds a named audio emitter.
   * @param {string} _name The emitter name.
   * @returns {object|null} The named ITr2AudEmitter, or null when absent.
   */

  FindSoundEmitter(_name) {}

  /**
   * Leaves observer attachment to owners that override this native default.
   * @param {object} _observer The TriObserverLocal supplied by the caller.
   * @returns {void}
   */

  AddObserver(_observer)
  {
  }
}

CjsSchema.decorateMethod(ITr2SoundEmitterOwner, "FindSoundEmitter", meta.abstract);
CjsSchema.decorateMethod(ITr2SoundEmitterOwner, "AddObserver", meta.noop);
CjsSchema.blue.inherit(IRoot)(ITr2SoundEmitterOwner);
CjsSchema.exposure.interface("ITr2SoundEmitterOwner")(ITr2SoundEmitterOwner);
